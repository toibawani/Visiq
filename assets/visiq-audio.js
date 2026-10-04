// ===== VISIQ AUDIO ENGINE v3.0 =====
// Single shared AudioContext, created lazily on first user gesture.
// No audio files. All sound via Web Audio API oscillators + gain envelopes.
// Global mute persists via localStorage across sims.
//
// Usage: window.VisiqAudio.ensureContext() → Promise<AudioContext>
//        window.VisiqAudio.muted
//        window.VisiqAudio.setMuted(bool)
//        window.VisiqAudio.createPitchNode(freq, type) → { osc, gain }
//        window.VisiqAudio.playTone(freq, dur, vol, type, attack, release)

(function() {
    'use strict';

    let _ctx = null;
    let _masterGain = null;
    let _gestureUnlocked = false;
    let _muted = localStorage.getItem('visiq-muted') === 'true';

    // UI for the "tap to enable sound" affordance
    let _gateEl = null;
    let _muteBtn = null;

    /**
     * Show a visible, non-blocking "tap to enable sound" banner.
     * This is NOT a modal — it sits at the bottom of the screen and
     * disappears once the user taps it or taps anywhere else first.
     */
    function showGate() {
        if (_gateEl || _gestureUnlocked) return;
        _gateEl = document.createElement('div');
        _gateEl.id = 'visiq-sound-gate';
        _gateEl.role = 'status';
        _gateEl.setAttribute('aria-live', 'polite');
        _gateEl.innerHTML = `
            <button id="visiq-sound-gate-btn" aria-label="Tap to enable sound for simulations">
                🔈 Tap to enable sound
            </button>
            <button id="visiq-sound-gate-skip" aria-label="Dismiss sound prompt">✕</button>
        `;
        _gateEl.style.cssText = `
            position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
            z-index: 9000; display: flex; align-items: center; gap: 8px;
            background: rgba(15,17,23,0.92); border: 1px solid rgba(45,212,191,0.35);
            border-radius: 999px; padding: 10px 18px;
            font-family: var(--font-sans, 'IBM Plex Sans', sans-serif); font-size: 0.85rem;
            color: #f1f5f9; box-shadow: 0 4px 24px rgba(0,0,0,0.4);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        `;
        _gateEl.querySelector('#visiq-sound-gate-btn').style.cssText = `
            background: none; border: none; color: #2dd4bf; cursor: pointer;
            font-size: 0.85rem; font-family: inherit; padding: 0;
        `;
        _gateEl.querySelector('#visiq-sound-gate-skip').style.cssText = `
            background: none; border: none; color: #64748b; cursor: pointer;
            font-size: 0.85rem; font-family: inherit; padding: 0 0 0 4px;
        `;

        const enable = () => { VisiqAudio.ensureContext(); dismissGate(); };
        const dismiss = () => dismissGate();
        _gateEl.querySelector('#visiq-sound-gate-btn').addEventListener('click', enable);
        _gateEl.querySelector('#visiq-sound-gate-skip').addEventListener('click', dismiss);
        document.body.appendChild(_gateEl);
    }

    function dismissGate() {
        if (_gateEl) { _gateEl.remove(); _gateEl = null; }
    }

    /**
     * Ensure an AudioContext exists and is running.
     * Safe to call multiple times; only creates once.
     * Returns a Promise that resolves when context is running.
     */
    async function ensureContext() {
        if (!_ctx) {
            _ctx = new (window.AudioContext || window.webkitAudioContext)();
            _masterGain = _ctx.createGain();
            _masterGain.connect(_ctx.destination);
            _masterGain.gain.value = _muted ? 0 : 0.18;
        }
        if (_ctx.state === 'suspended') {
            await _ctx.resume();
        }
        _gestureUnlocked = true;
        dismissGate();
        updateMuteBtn();
        return _ctx;
    }

    /** Get context if it exists, or null (safe for callers that shouldn't create it) */
    function getContext() { return _ctx; }

    /**
     * Play a short tone with attack/release envelope.
     * @param {number} freq - Frequency in Hz
     * @param {number} dur  - Duration in seconds
     * @param {number} vol  - Volume 0–1
     * @param {string} type - OscillatorType (sine, square, sawtooth, triangle)
     * @param {number} attack  - Attack time in seconds
     * @param {number} release - Release time in seconds
     */
    async function playTone(freq, dur = 0.3, vol = 0.1, type = 'sine', attack = 0.01, release = 0.1) {
        if (_muted) return;
        const ctx = await ensureContext();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(_masterGain);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + attack);
        gain.gain.setValueAtTime(vol, ctx.currentTime + dur - release);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + dur);
    }

    /**
     * Create a persistent oscillator node (for continuous tones that update per frame).
     * Caller is responsible for calling node.osc.stop() and node.gain.disconnect() on cleanup.
     * @returns {{ osc: OscillatorNode, gain: GainNode } | null}
     */
    function createPitchNode(freq, type = 'sine', vol = 0.06) {
        if (!_ctx || _muted) return null;
        const osc  = _ctx.createOscillator();
        const gain = _ctx.createGain();
        osc.connect(gain);
        gain.connect(_masterGain);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, _ctx.currentTime);
        gain.gain.setValueAtTime(vol, _ctx.currentTime);
        osc.start();
        return { osc, gain, ctx: _ctx };
    }

    /**
     * Create two oscillators whose beat frequency equals f2 - f1.
     * The beating is the constructive/destructive interference made audible.
     * @returns {{ osc1, osc2, gain1, gain2 } | null}
     */
    function createBeatPair(f1, f2, vol = 0.05) {
        if (!_ctx || _muted) return null;
        const n1 = createPitchNode(f1, 'sine', vol);
        const n2 = createPitchNode(f2, 'sine', vol);
        return n1 && n2 ? { ...n1, osc2: n2.osc, gain2: n2.gain } : null;
    }

    // ── Mute / Volume ──────────────────────────────────────────────────────
    function setMuted(m) {
        _muted = m;
        localStorage.setItem('visiq-muted', String(m));
        if (_masterGain) {
            _masterGain.gain.setTargetAtTime(m ? 0 : 0.18, _ctx ? _ctx.currentTime : 0, 0.05);
        }
        updateMuteBtn();
    }

    function updateMuteBtn() {
        if (_muteBtn) {
            _muteBtn.textContent = _muted ? '🔇 Sound off' : '🔊 Sound on';
            _muteBtn.setAttribute('aria-pressed', String(_muted));
        }
    }

    /**
     * Render a small persistent mute toggle at a given container.
     * Call this from sim setup to add a per-sim sound toggle.
     * @param {HTMLElement} container
     * @param {string} description What the sound represents (shown as tooltip)
     */
    function attachMuteToggle(container, description) {
        if (!container) return;
        const btn = document.createElement('button');
        btn.className = 'visiq-mute-btn';
        btn.setAttribute('aria-pressed', String(_muted));
        btn.setAttribute('title', description || 'Toggle simulation sound');
        btn.setAttribute('aria-label', `Toggle sound — ${description}`);
        btn.textContent = _muted ? '🔇 Sound off' : '🔊 Sound on';
        btn.style.cssText = `
            background: rgba(45,212,191,0.1); border: 1px solid rgba(45,212,191,0.25);
            border-radius: 999px; color: var(--text-secondary,#94a3b8); cursor: pointer;
            font-size: 0.78rem; padding: 5px 12px; font-family: inherit;
            transition: background 0.15s; margin-top: 8px;
        `;
        btn.addEventListener('click', () => {
            setMuted(!_muted);
            if (!_muted) { ensureContext(); } // unlock on enable
        });
        container.appendChild(btn);
        _muteBtn = btn;

        // Sound description
        if (description) {
            const note = document.createElement('div');
            note.style.cssText = `font-size:0.72rem;color:var(--text-muted,#64748b);margin-top:4px;line-height:1.4;max-width:220px;`;
            note.textContent = description;
            container.appendChild(note);
        }
    }

    // Expose gate when sound sims mount (if context not yet created)
    function requestGate() {
        if (!_gestureUnlocked && !_muted) showGate();
    }

    // ── Public API ────────────────────────────────────────────────────────
    window.VisiqAudio = {
        get muted()  { return _muted; },
        get context(){ return _ctx; },
        ensureContext,
        getContext,
        playTone,
        createPitchNode,
        createBeatPair,
        setMuted,
        attachMuteToggle,
        requestGate,
    };

})();
