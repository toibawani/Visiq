// ===== VISIQ INSTRUMENT LAYER (assets/instrument-layer.js) =====
// Transparent measurement + annotation tools that work on every sim page.
// Built once, attached through sim-base's lifecycle, drawn AFTER the sketch's own
// p.draw() via the post-draw hook — never inside a sketch.
//
// Tools (both off by default, both toggled from the shared control bar):
//   Ruler     — click two points, read pixel distance + angle (and real units when
//               the sketch declares a scale)
//   Pin note  — click to drop a numbered marker, type a note; stored per sketch
//               in localStorage so it survives reloads
//
// Animation (line draw-in, marker pop-in) is skipped when the user prefers
// reduced motion.

(function () {
    'use strict';

    const PINS_KEY_PREFIX = 'visiq-pins:';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const state = {
        sim: null,
        container: null,
        tool: null,                 // 'ruler' | 'pin' | null
        ruler: { a: null, b: null, hover: null, startedAt: 0, placedAt: 0 },
        pins: [],                   // [{ x, y, note }] with x/y normalized 0..1
        sketchHandlers: null,       // sketch mouse handlers parked while a tool is on
        hook: null,
        buttons: {},
        notesPanel: null,
        editor: null,
        listeners: [],
    };

    // ── storage ────────────────────────────────────────────────────────────
    function storageKey(simId) { return PINS_KEY_PREFIX + simId; }

    function loadPins(simId) {
        try {
            const raw = localStorage.getItem(storageKey(simId));
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed)
                ? parsed.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number')
                : [];
        } catch (e) {
            console.warn('[InstrumentLayer] could not read pins:', e);
            return [];
        }
    }

    function persistPins() {
        if (!state.sim) return;
        try {
            localStorage.setItem(storageKey(state.sim.id), JSON.stringify(state.pins));
        } catch (e) {
            // Storage can be full (quota) — markers stay for this session only.
            console.warn('[InstrumentLayer] pins not persisted (storage full):', e);
        }
    }

    // ── public state access (notebook capture reads this) ──────────────────
    function getPins(simId) { return loadPins(simId); }

    function setPins(simId, pins) {
        try {
            localStorage.setItem(storageKey(simId), JSON.stringify(Array.isArray(pins) ? pins : []));
        } catch (e) {
            console.warn('[InstrumentLayer] pins not persisted (storage full):', e);
        }
        if (state.sim && state.sim.id === simId) {
            state.pins = loadPins(simId);
            requestRedraw();
            renderNotesPanel();
        }
    }

    // ── helpers ────────────────────────────────────────────────────────────
    function getCanvas(sim) {
        if (!sim) return null;
        if (sim.p && sim.p._curElement && sim.p._curElement.elt) return sim.p._curElement.elt;
        const host = document.getElementById(sim.containerId);
        return host ? host.querySelector('canvas') : null;
    }

    // Same mapping p5 uses for p.mouseX/mouseY: CSS px -> logical canvas px,
    // which already accounts for pixelDensity (p.width is the logical width).
    function pointFromEvent(sim, e) {
        const canvas = getCanvas(sim);
        if (!canvas || !sim.p) return null;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        return {
            x: (e.clientX - rect.left) * (sim.p.width / rect.width),
            y: (e.clientY - rect.top) * (sim.p.height / rect.height),
        };
    }

    function requestRedraw() {
        const sim = state.sim;
        if (sim && sim.p && !sim.isPlaying && typeof sim.p.redraw === 'function') {
            sim.p.redraw();
        }
    }

    function listen(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        state.listeners.push({ target, event, handler, options });
    }

    function releaseListeners() {
        for (const { target, event, handler, options } of state.listeners) {
            target.removeEventListener(event, handler, options);
        }
        state.listeners = [];
    }

    // ── attach / detach through the sim-base lifecycle ─────────────────────
    function attach(sim) {
        if (!sim || state.sim === sim) return;
        if (state.sim) detach(state.sim);
        // Compare mode runs two sims at once; annotation stays a single-sim tool.
        if (window.compareMode && window.compareMode.active) return;

        state.sim = sim;
        state.container = document.getElementById(sim.containerId);
        state.tool = null;
        state.ruler = { a: null, b: null, hover: null, startedAt: 0, placedAt: 0 };
        state.pins = loadPins(sim.id);

        buildToolbar(sim);
        renderNotesPanel();

        if (typeof sim.addPostDraw === 'function') {
            state.hook = sim.addPostDraw(drawOverlay);
        }

        if (state.container) {
            listen(state.container, 'pointerdown', onPointerDown);
            listen(state.container, 'pointermove', onPointerMove);
        }
        listen(window, 'keydown', onKeyDown, true);
    }

    function detach(sim) {
        if (sim && state.sim && sim !== state.sim) return;
        setTool(null);
        closeEditor(true);
        releaseListeners();

        if (state.sim && state.hook && typeof state.sim.removePostDraw === 'function') {
            state.sim.removePostDraw(state.hook);
        }
        if (state.notesPanel) { state.notesPanel.remove(); state.notesPanel = null; }
        removeToolbarButtons();

        state.hook = null;
        state.sim = null;
        state.container = null;
        state.pins = [];
        state.ruler = { a: null, b: null, hover: null, startedAt: 0, placedAt: 0 };
    }

    // ── toolbar: two opt-in toggles appended to sim-base's control bar ─────
    function makeToolButton(cls, label, description, onClick) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-control ' + cls;
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('title', description);
        btn.setAttribute('aria-label', description);
        btn.innerHTML = `<span class="label">${label}</span>`;
        btn.onclick = onClick;
        return btn;
    }

    function buildToolbar(sim) {
        const host = document.getElementById(sim.controlsContainerId);
        const toolbar = host ? host.querySelector('.sim-master-toolbar') : null;
        if (!toolbar || toolbar.querySelector('.btn-tool-ruler')) return;

        state.buttons.ruler = makeToolButton(
            'btn-tool-ruler', '📏 Ruler',
            'Measure distance and angle: click two points on the canvas',
            () => setTool('ruler')
        );
        state.buttons.pin = makeToolButton(
            'btn-tool-pin', '📍 Pin note',
            'Drop a numbered note on the canvas: click, type, press Enter',
            () => setTool('pin')
        );

        // Insert before the speed group so the speed control keeps its right alignment.
        const speed = toolbar.querySelector('.speed-control-group');
        toolbar.insertBefore(state.buttons.ruler, speed || null);
        toolbar.insertBefore(state.buttons.pin, speed || null);
        updateButtonStates();
    }

    function removeToolbarButtons() {
        for (const key of Object.keys(state.buttons)) {
            if (state.buttons[key]) state.buttons[key].remove();
            delete state.buttons[key];
        }
    }

    function updateButtonStates() {
        for (const [key, btn] of Object.entries(state.buttons)) {
            const on = state.tool === key;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-pressed', String(on));
        }
    }

    // While a tool is on, the sketch's own mouse handlers are parked so placing a
    // ruler point doesn't also fling a body. They are restored when the tool is off.
    function parkSketchHandlers() {
        const sim = state.sim;
        if (!sim || !sim.p || state.sketchHandlers) return;
        const saved = {};
        for (const name of ['mousePressed', 'mouseDragged', 'mouseReleased', 'doubleClicked']) {
            if (typeof sim.p[name] === 'function') {
                saved[name] = sim.p[name];
                sim.p[name] = null;
            }
        }
        state.sketchHandlers = Object.keys(saved).length ? saved : false;
    }

    function restoreSketchHandlers() {
        const saved = state.sketchHandlers;
        state.sketchHandlers = null;
        if (!saved || !state.sim || !state.sim.p) return;
        for (const [name, fn] of Object.entries(saved)) {
            if (state.sim.p[name] == null) state.sim.p[name] = fn;
        }
    }

    function setTool(next) {
        if (state.tool === next) next = null;
        if (state.tool === 'ruler' && next !== 'ruler') {
            state.ruler = { a: null, b: null, hover: null, startedAt: 0, placedAt: 0 };
        }
        state.tool = next;
        if (!next) state.ruler.hover = null;

        updateButtonStates();
        if (next) parkSketchHandlers(); else restoreSketchHandlers();
        if (next !== 'pin') closeEditor(true);
        requestRedraw();
    }

    // ── pointer interaction ────────────────────────────────────────────────
    function onPointerDown(e) {
        if (!state.sim || state.sim._isDestroyed || !state.tool) return;
        const pt = pointFromEvent(state.sim, e);
        if (!pt) return;
        e.preventDefault();

        if (state.tool === 'ruler') {
            if (!state.ruler.a || state.ruler.b) {
                // Start a fresh measurement
                state.ruler = { a: pt, b: null, hover: pt, startedAt: performance.now(), placedAt: performance.now() };
            } else {
                state.ruler.b = pt;
                state.ruler.placedAt = performance.now();
            }
            requestRedraw();
        } else if (state.tool === 'pin') {
            const w = state.sim.p && state.sim.p.width ? state.sim.p.width : 1;
            const h = state.sim.p && state.sim.p.height ? state.sim.p.height : 1;
            state.pins.push({ x: pt.x / w, y: pt.y / h, note: '', createdAt: Date.now() });
            persistPins();
            renderNotesPanel();
            openEditor(state.pins.length - 1, e.clientX, e.clientY);
            requestRedraw();
        }
    }

    function onPointerMove(e) {
        if (state.tool !== 'ruler' || !state.ruler.a || state.ruler.b) return;
        const pt = pointFromEvent(state.sim, e);
        if (!pt) return;
        state.ruler.hover = pt;
        requestRedraw();
    }

    function onKeyDown(e) {
        if (!state.sim) return;
        if (e.key === 'Escape') {
            if (state.editor) { closeEditor(true); return; }
            if (state.tool) setTool(null);
        }
    }

    // ── note editor (inline, not window.prompt) ────────────────────────────
    function openEditor(pinIndex, clientX, clientY) {
        closeEditor(false);
        const pin = state.pins[pinIndex];
        if (!pin) return;

        const editor = document.createElement('div');
        editor.className = 'instrument-note-editor';
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 140;
        input.placeholder = 'Type a note, Enter to save';
        input.setAttribute('aria-label', `Note for pin ${pinIndex + 1}`);
        input.value = pin.note || '';
        editor.appendChild(input);
        document.body.appendChild(editor);

        const left = Math.min(clientX + 14, window.innerWidth - 260);
        const top = Math.min(clientY + 12, window.innerHeight - 60);
        editor.style.left = `${Math.max(8, left)}px`;
        editor.style.top = `${Math.max(8, top)}px`;
        state.editor = { editor, input, pinIndex };

        const commit = () => {
            pin.note = input.value.trim();
            persistPins();
            renderNotesPanel();
            requestRedraw();
            closeEditor(true);
        };
        input.addEventListener('keydown', (ev) => {
            ev.stopPropagation();
            if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
            else if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
        });
        input.addEventListener('blur', () => { if (state.editor) commit(); });
        input.focus();
        input.select();

        function cancel() {
            if (!pin.note) {
                state.pins.splice(pinIndex, 1);
                persistPins();
                renderNotesPanel();
                requestRedraw();
            }
            closeEditor(true);
        }
        state.editor.cancel = cancel;
    }

    function closeEditor(removeDom) {
        if (!state.editor) return;
        const { editor } = state.editor;
        state.editor = null;
        if (removeDom) editor.remove();
    }

    // ── DOM list of pinned notes beside the canvas ─────────────────────────
    function renderNotesPanel() {
        const wrapper = document.querySelector('.canvas-wrapper');
        if (!wrapper || !state.sim) {
            if (state.notesPanel) { state.notesPanel.remove(); state.notesPanel = null; }
            return;
        }
        if (!state.pins.length) {
            if (state.notesPanel) { state.notesPanel.remove(); state.notesPanel = null; }
            return;
        }

        let panel = state.notesPanel;
        if (!panel || !document.contains(panel)) {
            panel = document.createElement('div');
            panel.className = 'instrument-notes-panel';
            panel.setAttribute('role', 'region');
            panel.setAttribute('aria-label', 'Pinned notes');
            state.notesPanel = panel;
            wrapper.appendChild(panel);
        }

        panel.innerHTML = '';

        const head = document.createElement('div');
        head.className = 'instrument-notes-head';
        const title = document.createElement('span');
        title.textContent = `Pinned notes (${state.pins.length})`;
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'instrument-notes-clear';
        clear.textContent = 'Clear all';
        clear.setAttribute('aria-label', 'Remove all pinned notes');
        clear.onclick = () => {
            state.pins = [];
            persistPins();
            renderNotesPanel();
            requestRedraw();
        };
        head.appendChild(title);
        head.appendChild(clear);
        panel.appendChild(head);

        const list = document.createElement('ol');
        list.className = 'instrument-notes-list';
        state.pins.forEach((pin, i) => {
            const li = document.createElement('li');
            const num = document.createElement('span');
            num.className = 'instrument-note-num';
            num.textContent = String(i + 1);
            const text = document.createElement('span');
            text.className = 'instrument-note-text';
            text.textContent = pin.note || '(no text)';
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'instrument-note-del';
            del.textContent = '×';
            del.setAttribute('aria-label', `Remove note ${i + 1}`);
            del.onclick = () => {
                state.pins.splice(i, 1);
                persistPins();
                renderNotesPanel();
                requestRedraw();
            };
            li.appendChild(num);
            li.appendChild(text);
            li.appendChild(del);
            list.appendChild(li);
        });
        panel.appendChild(list);
    }

    // ── drawing (runs inside sim-base's post-draw hook, after the sketch) ──
    function accentRGB(sim) {
        if (sim && sim._visiqAccent) return sim._visiqAccent;
        let rgb = [45, 212, 191];
        if (typeof SIMULATIONS !== 'undefined' && window.VisualKit) {
            const def = SIMULATIONS.find(s => s.id === sim.id);
            if (def) rgb = VisualKit.getCategoryRGB(String(def.category).toLowerCase());
        }
        if (sim) sim._visiqAccent = rgb;
        return rgb;
    }

    function drawOverlay(sim, p) {
        if (!state.sim || state.sim !== sim || sim._isDestroyed) return;
        const hasRuler = !!state.ruler.a;
        const hasPins = state.pins.length > 0;
        // Fast path: nothing to paint, no drawing state touched at all.
        if (!hasRuler && !hasPins) return;

        p.push();
        if (typeof p.textFont === 'function') p.textFont('IBM Plex Sans');
        if (hasRuler) drawRuler(p, sim);
        if (hasPins) drawPins(p, sim);
        p.pop();
    }

    function drawRuler(p, sim) {
        const a = state.ruler.a;
        const end = state.ruler.b || state.ruler.hover;
        const rgb = accentRGB(sim);
        const now = performance.now();

        // Start cap while the first point waits for the second
        if (!end) {
            p.push();
            p.noStroke();
            p.fill(rgb[0], rgb[1], rgb[2], 210);
            p.circle(a.x, a.y, 7);
            p.pop();
            return;
        }

        const animate = !reducedMotion.matches && !!state.ruler.b && (now - state.ruler.placedAt) < 340;
        const t = animate ? (now - state.ruler.placedAt) / 340 : 1;
        const ease = 1 - Math.pow(1 - t, 2);
        const bx = a.x + (end.x - a.x) * ease;
        const by = a.y + (end.y - a.y) * ease;

        p.push();
        if (p.drawingContext && p.drawingContext.setLineDash) p.drawingContext.setLineDash([7, 5]);
        p.stroke(rgb[0], rgb[1], rgb[2], 235);
        p.strokeWeight(1.4);
        p.line(a.x, a.y, bx, by);
        if (p.drawingContext && p.drawingContext.setLineDash) p.drawingContext.setLineDash([]);

        // End caps: perpendicular ticks
        const ang = Math.atan2(by - a.y, bx - a.x);
        const capLen = 7;
        for (const [cx, cy] of [[a.x, a.y], [bx, by]]) {
            const px = Math.cos(ang + Math.PI / 2) * capLen;
            const py = Math.sin(ang + Math.PI / 2) * capLen;
            p.line(cx - px, cy - py, cx + px, cy + py);
        }

        // End dots
        p.noStroke();
        p.fill(rgb[0], rgb[1], rgb[2], 240);
        p.circle(a.x, a.y, 6);
        if (ease >= 0.999 || !state.ruler.b) p.circle(bx, by, 6);

        // Floating readout, drawn with the kit's inset chrome
        const dx = bx - a.x;
        const dy = by - a.y;
        const pxLen = Math.hypot(dx, dy);
        const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
        const lines = [`${pxLen.toFixed(1)} px`];
        if (sim.scale && sim.scale.pxPerUnit) {
            lines.push(`${(pxLen / sim.scale.pxPerUnit).toFixed(2)} ${sim.scale.unit}`);
        }
        lines.push(`${deg.toFixed(1)}°`);

        p.textSize(11);
        p.textAlign(p.LEFT, p.TOP);
        let textW = 0;
        for (const line of lines) textW = Math.max(textW, p.textWidth(line));
        const padX = 8, padY = 6, lineH = 14;
        const boxW = Math.ceil(textW + padX * 2);
        const boxH = Math.ceil(lineH * lines.length + padY + 12);

        const midX = (a.x + bx) / 2;
        const midY = (a.y + by) / 2;
        let boxX = midX - boxW / 2;
        let boxY = midY - boxH - 16;
        boxX = Math.max(6, Math.min(boxX, p.width - boxW - 6));
        if (boxY < 6) boxY = midY + 16;
        boxY = Math.min(boxY, p.height - boxH - 6);

        if (window.VisualKit) {
            VisualKit.drawInsetPanel(p, boxX, boxY, boxW, boxH, 'MEASURE', { textSize: 8.5 });
        } else {
            p.noStroke();
            p.fill(8, 12, 22, 215);
            p.rect(boxX, boxY, boxW, boxH, 6);
        }

        p.noStroke();
        p.fill(65, 85, 120);
        p.textSize(8.5);
        p.textAlign(p.LEFT, p.TOP);
        p.text('MEASURE', boxX + padX, boxY + 4);

        p.fill(226, 232, 240);
        p.textSize(11);
        p.textAlign(p.LEFT, p.TOP);
        lines.forEach((line, i) => {
            p.text(line, boxX + padX, boxY + 16 + i * lineH);
        });
        p.pop();

        if (animate) requestRedraw();
    }

    function drawPins(p, sim) {
        const rgb = accentRGB(sim);
        p.push();
        state.pins.forEach((pin, i) => {
            const x = pin.x * p.width;
            const y = pin.y * p.height;
            let scale = 1;
            if (!reducedMotion.matches && pin.createdAt) {
                const age = (Date.now() - pin.createdAt) / 280;
                if (age < 1) {
                    scale = 0.55 + 0.45 * (1 - Math.pow(1 - age, 3));
                    requestRedraw();
                }
            }

            p.noStroke();
            p.fill(rgb[0], rgb[1], rgb[2], 42);
            p.circle(x, y, 28 * scale);

            p.fill(rgb[0], rgb[1], rgb[2], 235);
            p.stroke(7, 9, 15);
            p.strokeWeight(1.5);
            p.circle(x, y, 19 * scale);

            p.noStroke();
            p.fill(7, 9, 15);
            p.textSize(10);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(String(i + 1), x, y + 0.5);

            if (pin.note) {
                const note = pin.note.length > 48 ? pin.note.slice(0, 45) + '…' : pin.note;
                p.textSize(11);
                p.textAlign(p.LEFT, p.CENTER);
                const w = Math.ceil(p.textWidth(note)) + 14;
                const h = 22;
                let lx = x + 14;
                let ly = y - h / 2;
                if (lx + w > p.width - 6) lx = x - 14 - w;
                lx = Math.max(6, Math.min(lx, p.width - w - 6));
                ly = Math.max(6, Math.min(ly, p.height - h - 6));

                if (window.VisualKit) VisualKit.drawInsetPanel(p, lx, ly, w, h, '');
                p.noStroke();
                p.fill(226, 232, 240);
                p.textSize(11);
                p.textAlign(p.LEFT, p.CENTER);
                p.text(note, lx + 7, ly + h / 2 + 0.5);
            }
        });
        p.pop();
    }

    // ── wiring ─────────────────────────────────────────────────────────────
    document.addEventListener('visiq:sim-mounted', (e) => attach(e.detail && e.detail.sim));
    document.addEventListener('visiq:sim-destroyed', (e) => detach(e.detail && e.detail.sim));

    window.InstrumentLayer = {
        getPins,
        setPins,
        setTool,
        get activeSimId() { return state.sim ? state.sim.id : null; },
        get activeTool() { return state.tool; },
    };



})();

