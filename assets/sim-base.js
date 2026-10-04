// ===== VISIQ SHARED SIMULATION BASELINE =====
// Handles p5 instance lifecycle, accessible controls, 48px touch targets,
// URL query param syncing, live telemetry readouts, visibilitychange, and memory cleanup.

/**
 * @typedef {Object} ParamDefinition
 * @property {number} value Default value
 * @property {number} min Minimum allowed value
 * @property {number} max Maximum allowed value
 * @property {number} step Slider step increment
 * @property {string} label User-friendly label
 * @property {string} unit Physical unit (e.g. 'm/s²', 'kg', 'K')
 * @property {string} [description] Optional explanation
 */

class SimBase {
    /**
     * @param {Object} config
     * @param {string} config.id Simulation identifier matching sketches/<id>.js
     * @param {string} [config.containerId='simulation-canvas'] Canvas container element ID
     * @param {string} [config.controlsContainerId='controls-section'] Controls container element ID
     * @param {Record<string, ParamDefinition>} config.params Parameter definitions
     * @param {function(any, SimBase): void} config.setup Custom p5 setup and simulation logic
     * @param {function(SimBase): Record<string, string|number>} [config.getReadouts] Callback returning live computed values
     * @param {number} [config.targetFps=60] Target frame rate (60 or intentional 30)
     */
    constructor(config) {
        this.id = config.id;
        this.containerId = config.containerId || 'simulation-canvas';
        this.controlsContainerId = config.controlsContainerId || 'controls-section';
        this.paramDefs = config.params || {};
        this.setupFn = config.setup;
        this.getReadoutsFn = config.getReadouts || null;
        this.targetFps = config.targetFps || 60;

        // Runtime state
        this.params = {};
        this.isPlaying = true;
        this.speed = 1.0;
        this.stepRequested = false;
        this.simTime = 0;

        // Lifecycle tracking for leak prevention
        this.p5Instance = null;
        this.resizeObserver = null;
        this.intersectionObserver = null;
        this.listeners = [];
        this.intervals = [];
        this.timeouts = [];
        this._readoutSpans = {};
        this._isDestroyed = false;

        this.initParameters();
    }

    /**
     * Initialize parameters by merging defaults with validated, clamped URL query params.
     */
    initParameters() {
        const urlParams = new URLSearchParams(window.location.search);

        for (const [key, def] of Object.entries(this.paramDefs)) {
            let val = def.value;
            if (urlParams.has(key)) {
                const parsed = parseFloat(urlParams.get(key));
                if (!isNaN(parsed) && isFinite(parsed)) {
                    // Safe clamp between min and max
                    val = Math.max(def.min, Math.min(def.max, parsed));
                }
            }
            this.params[key] = val;
        }
    }

    /**
     * Sync current state to the URL search params without page reload.
     */
    syncUrlParams() {
        if (this._isDestroyed) return;
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('sim', this.id);
            for (const [key, val] of Object.entries(this.params)) {
                url.searchParams.set(key, typeof val === 'number' ? Number(val.toFixed(3)).toString() : String(val));
            }
            window.history.replaceState({}, '', url.toString());
        } catch (e) {
            // URL modification may fail in sandboxed iframes
        }
    }

    /**
     * Mount the p5 sketch and render the accessible controls.
     * @returns {any} The p5 instance
     */
    mount() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`[SimBase] Container #${this.containerId} not found`);
            return null;
        }

        // Clean container of any lingering elements
        container.innerHTML = '';

        // Build controls and readouts UI
        this.renderControls();

        // Create p5 instance
        const self = this;
        const sketch = function(p) {
            self.p = p;
            
            p.setup = function() {
                const w = Math.max(container.clientWidth || 600, 300);
                const h = Math.max(container.clientHeight || 400, 250);
                const canvas = p.createCanvas(w, h);
                canvas.parent(container);

                // Set pixel density deliberately (capped at 2 for mobile and retina)
                p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
                p.frameRate(self.targetFps);

                // Default canvas font to compliant IBM Plex Sans (Aesthetic Bible)
                if (typeof p.textFont === 'function') {
                    p.textFont('IBM Plex Sans');
                }

                // Call custom user setup
                if (typeof self.setupFn === 'function') {
                    self.setupFn(p, self);
                }
            };
        };

        this.p5Instance = new window.p5(sketch, container);

        // Setup responsive container observer
        this.setupResizeObserver(container);

        // Setup viewport intersection observer (pause when scrolled offscreen)
        this.setupIntersectionObserver(container);

        // Setup page visibility pause
        this.setupVisibilityHandler();

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        return this.p5Instance;
    }

    /**
     * Listen for container resize and adapt canvas without distortion.
     */
    setupResizeObserver(container) {
        if (typeof ResizeObserver === 'undefined') return;

        let debounceTimer = null;
        this.resizeObserver = new ResizeObserver((entries) => {
            if (this._isDestroyed || !this.p || !this.p5Instance) return;
            for (const entry of entries) {
                const cr = entry.contentRect;
                if (cr.width > 0 && cr.height > 0) {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        if (!this._isDestroyed && this.p && typeof this.p.resizeCanvas === 'function') {
                            this.p.resizeCanvas(Math.floor(cr.width), Math.floor(cr.height));
                            if (typeof this.onResize === 'function') {
                                this.onResize(cr.width, cr.height);
                            }
                        }
                    }, 50);
                }
            }
        });

        this.resizeObserver.observe(container);
    }

    /**
     * Automatically pause draw loop via noLoop() when canvas scrolls offscreen,
     * and resume on return to preserve battery and frame budget.
     */
    setupIntersectionObserver(container) {
        if (typeof IntersectionObserver === 'undefined') return;

        this.intersectionObserver = new IntersectionObserver((entries) => {
            if (this._isDestroyed || !this.p) return;
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    if (this.isPlaying) {
                        this.p.loop();
                        if (typeof this.onResume === 'function') this.onResume();
                    }
                } else {
                    this.p.noLoop();
                    if (typeof this.onPause === 'function') this.onPause();
                }
            }
        }, { threshold: 0.05 });

        this.intersectionObserver.observe(container);
    }

    /**
     * Automatically pause loops when tab is hidden to save power and battery.
     */
    setupVisibilityHandler() {
        const handler = () => {
            if (this._isDestroyed) return;
            if (document.hidden) {
                if (this.p) this.p.noLoop();
                if (typeof this.onPause === 'function') this.onPause();
            } else if (this.isPlaying) {
                if (this.p) this.p.loop();
                if (typeof this.onResume === 'function') this.onResume();
            }
        };

        document.addEventListener('visibilitychange', handler);
        this.listeners.push({ target: document, event: 'visibilitychange', handler });
    }

    /**
     * Accessible keyboard controls: Space = Play/Pause, R = Reset.
     */
    setupKeyboardShortcuts() {
        const handler = (e) => {
            // Ignore if typing inside input fields
            const tag = (e.target && e.target.tagName) || '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlay();
            } else if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.reset();
            }
        };

        window.addEventListener('keydown', handler);
        this.listeners.push({ target: window, event: 'keydown', handler });
    }

    /**
     * Build accessible controls bar and live readout card.
     */
    renderControls() {
        const wrapper = document.getElementById(this.controlsContainerId);
        if (!wrapper) return;

        wrapper.innerHTML = '';

        // Master playback toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'sim-master-toolbar';
        toolbar.setAttribute('role', 'toolbar');
        toolbar.setAttribute('aria-label', 'Simulation Playback Controls');

        // Play/Pause button
        const playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'btn-control btn-play-pause';
        playBtn.setAttribute('aria-label', this.isPlaying ? 'Pause simulation (Space)' : 'Play simulation (Space)');
        playBtn.innerHTML = `<span class="icon" aria-hidden="true">${this.isPlaying ? '⏸' : '▶'}</span> <span class="label">${this.isPlaying ? 'Pause' : 'Play'}</span>`;
        playBtn.onclick = () => this.togglePlay();
        toolbar.appendChild(playBtn);
        this._playBtn = playBtn;

        // Reset button
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'btn-control btn-reset-sim';
        resetBtn.setAttribute('aria-label', 'Reset simulation to initial state (R)');
        resetBtn.innerHTML = `<span class="icon" aria-hidden="true">↺</span> <span class="label">Reset</span>`;
        resetBtn.onclick = () => this.reset();
        toolbar.appendChild(resetBtn);

        // Speed control selector
        const speedGroup = document.createElement('div');
        speedGroup.className = 'speed-control-group';
        speedGroup.innerHTML = `
            <label for="sim-speed-${this.id}" class="speed-label">Speed</label>
            <select id="sim-speed-${this.id}" class="speed-select" aria-label="Simulation playback speed">
                <option value="0.25">0.25×</option>
                <option value="0.5">0.5×</option>
                <option value="1.0" selected>1.0×</option>
                <option value="1.5">1.5×</option>
                <option value="2.0">2.0×</option>
            </select>
        `;
        const speedSelect = speedGroup.querySelector('select');
        if (speedSelect) {
            speedSelect.onchange = (e) => {
                this.speed = parseFloat(e.target.value) || 1.0;
            };
        }
        toolbar.appendChild(speedGroup);

        wrapper.appendChild(toolbar);

        // Sliders & inputs container
        const slidersContainer = document.createElement('div');
        slidersContainer.className = 'sim-sliders-container';

        for (const [key, def] of Object.entries(this.paramDefs)) {
            const group = document.createElement('div');
            group.className = 'sim-control-field';

            const inputId = `sim-param-${this.id}-${key}`;
            const headerRow = document.createElement('div');
            headerRow.className = 'field-header';

            const label = document.createElement('label');
            label.htmlFor = inputId;
            label.className = 'field-label';
            label.textContent = def.label;

            const valBadge = document.createElement('span');
            valBadge.className = 'field-value-badge';
            valBadge.id = `${inputId}-val`;
            valBadge.textContent = `${this.params[key]} ${def.unit}`;

            headerRow.appendChild(label);
            headerRow.appendChild(valBadge);

            const input = document.createElement('input');
            input.type = 'range';
            input.id = inputId;
            input.className = 'sim-slider';
            input.min = String(def.min);
            input.max = String(def.max);
            input.step = String(def.step);
            input.value = String(this.params[key]);
            input.setAttribute('aria-label', `${def.label} in ${def.unit}`);
            input.setAttribute('aria-valuemin', String(def.min));
            input.setAttribute('aria-valuemax', String(def.max));
            input.setAttribute('aria-valuenow', String(this.params[key]));

            input.oninput = (e) => {
                let parsed = parseFloat(e.target.value);
                if (isNaN(parsed) || !isFinite(parsed)) parsed = def.value;
                parsed = Math.max(def.min, Math.min(def.max, parsed));
                this.params[key] = parsed;
                valBadge.textContent = `${Number(parsed.toFixed(3))} ${def.unit}`;
                input.setAttribute('aria-valuenow', String(parsed));
                this.syncUrlParams();
                if (typeof this.onParamChange === 'function') {
                    this.onParamChange(key, parsed);
                }
            };

            group.appendChild(headerRow);
            group.appendChild(input);
            slidersContainer.appendChild(group);
        }

        wrapper.appendChild(slidersContainer);

        // Live Telemetry / Readout Panel
        if (typeof this.getReadoutsFn === 'function') {
            const readoutPanel = document.createElement('div');
            readoutPanel.className = 'sim-telemetry-panel';
            readoutPanel.setAttribute('role', 'region');
            readoutPanel.setAttribute('aria-label', 'Live Physical Measurements');

            const readoutTitle = document.createElement('h3');
            readoutTitle.className = 'telemetry-title';
            readoutTitle.innerHTML = `<span class="pulse-dot" aria-hidden="true"></span> Live Measurements`;
            readoutPanel.appendChild(readoutTitle);

            const grid = document.createElement('div');
            grid.className = 'telemetry-grid';

            const initialReadouts = this.getReadoutsFn(this) || {};
            this._readoutSpans = {};

            for (const [metricKey, val] of Object.entries(initialReadouts)) {
                const item = document.createElement('div');
                item.className = 'telemetry-item';

                const keyLabel = document.createElement('span');
                keyLabel.className = 'telemetry-label';
                keyLabel.textContent = metricKey;

                const valSpan = document.createElement('span');
                valSpan.className = 'telemetry-value';
                valSpan.textContent = String(val);

                item.appendChild(keyLabel);
                item.appendChild(valSpan);
                grid.appendChild(item);

                this._readoutSpans[metricKey] = valSpan;
            }

            readoutPanel.appendChild(grid);
            wrapper.appendChild(readoutPanel);
        }
    }

    /**
     * Efficiently update live telemetry values without rebuilding DOM.
     */
    updateTelemetry() {
        if (!this.getReadoutsFn || this._isDestroyed) return;
        const metrics = this.getReadoutsFn(this);
        if (!metrics) return;

        for (const [key, val] of Object.entries(metrics)) {
            if (this._readoutSpans[key]) {
                const formatted = typeof val === 'number' ? (Number.isInteger(val) ? val.toString() : val.toFixed(2)) : String(val);
                if (this._readoutSpans[key].textContent !== formatted) {
                    this._readoutSpans[key].textContent = formatted;
                }
            }
        }
    }

    /**
     * Toggle play and pause.
     */
    togglePlay() {
        this.isPlaying = !this.isPlaying;
        if (this._playBtn) {
            this._playBtn.setAttribute('aria-label', this.isPlaying ? 'Pause simulation (Space)' : 'Play simulation (Space)');
            this._playBtn.innerHTML = `<span class="icon" aria-hidden="true">${this.isPlaying ? '⏸' : '▶'}</span> <span class="label">${this.isPlaying ? 'Pause' : 'Play'}</span>`;
        }
        if (this.p) {
            if (this.isPlaying) {
                this.p.loop();
            } else {
                this.p.noLoop();
            }
        }
        if (this.isPlaying) {
            if (typeof this.onResume === 'function') this.onResume();
        } else if (typeof this.onPause === 'function') {
            this.onPause();
        }
    }

    /**
     * Reset simulation to starting configuration.
     */
    reset() {
        this.simTime = 0;
        if (typeof this.onReset === 'function') {
            this.onReset();
        }
        this.updateTelemetry();
        if (this.p && !this.isPlaying) {
            this.p.redraw();
        }
    }

    /**
     * Managed timeout that is guaranteed to be cleaned up on destroy.
     */
    setTimeout(fn, delay) {
        const id = setTimeout(() => {
            const idx = this.timeouts.indexOf(id);
            if (idx !== -1) this.timeouts.splice(idx, 1);
            fn();
        }, delay);
        this.timeouts.push(id);
        return id;
    }

    /**
     * Managed interval that is guaranteed to be cleaned up on destroy.
     */
    setInterval(fn, delay) {
        const id = setInterval(fn, delay);
        this.intervals.push(id);
        return id;
    }

    /**
     * Completely destroy simulation, unbind all events, stop loops, remove p5 instance,
     * disconnect observers and free all memory to guarantee zero leaks.
     */
    destroy() {
        this._isDestroyed = true;

        // Worker / extra teardown (galaxy, ocean, gravity-tree). Must run before p5.remove().
        if (typeof this.onDestroy === 'function') {
            try { this.onDestroy(); } catch (e) {
                console.warn('[SimBase] onDestroy warning:', e);
            }
        }

        // Disconnect ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // Disconnect IntersectionObserver
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }

        // Remove all DOM listeners
        for (const { target, event, handler } of this.listeners) {
            try {
                target.removeEventListener(event, handler);
            } catch (e) {}
        }
        this.listeners = [];

        // Clear all timers
        for (const id of this.timeouts) clearTimeout(id);
        for (const id of this.intervals) clearInterval(id);
        this.timeouts = [];
        this.intervals = [];

        // Clean up p5 instance
        if (this.p5Instance) {
            try {
                if (typeof this.p5Instance.remove === 'function') {
                    this.p5Instance.remove();
                }
            } catch (e) {
                console.warn('[SimBase] p5 remove warning:', e);
            }
            this.p5Instance = null;
            this.p = null;
        }

        // Clear controls container
        const wrapper = document.getElementById(this.controlsContainerId);
        if (wrapper) wrapper.innerHTML = '';

        // Clear canvas container
        const container = document.getElementById(this.containerId);
        if (container) container.innerHTML = '';

        console.log(`[SimBase] Cleanly destroyed simulation: ${this.id}`);
    }
}

// Export for browser global context
window.SimBase = SimBase;
