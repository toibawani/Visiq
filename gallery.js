// ===== GALLERY SYSTEM =====
// Complete simulation gallery with p5 lifecycle management, 29-simulation catalog,
// IntersectionObserver pause/resume, URL deep-linking, and complete memory leak prevention.

class Gallery {
    constructor() {
        console.log('[GALLERY] Initializing');
        this.currentSimulation = null;
        this._currentSimController = null;
        this._p5Instance = null;
        this._keydownHandler = null;
        this._sparklineTimer = null;
        this._sparklineHistory = null;
        this._compareSpeed = 1.0;
        this._cardObserver = null;
        this.loadingMessages = [
            'Preparing physical force calculations...',
            'Setting up coordinate spaces...',
            'Calibrating differential equations...',
            'Positioning particle bounds...',
            'Initializing state variables...',
            'Loading physical constants...',
        ];
        this.initialize();
    }
    
    initialize() {
        this.renderSimulationsCatalog();
        this.setupEventListeners();
        this.setupCardIntersectionObserver();
        this.loadUserData();
        this.setupOnboarding();
        this.syncFavoriteButtons();
        this.checkInitialUrlParam();
        console.log('[GALLERY] Ready with 29 simulations');
    }

    renderSimulationsCatalog() {
        const container = document.getElementById('simulations-container');
        if (!container || typeof SIMULATIONS === 'undefined') return;

        // Render all 29 simulations with accessible semantics
        container.innerHTML = '';

        const categories = ['Physics', 'Biology', 'Geography', 'Astronomy'];
        const channelCodes = {
            'Physics': 'CH-01 · PHYS',
            'Biology': 'CH-02 · BIO',
            'Geography': 'CH-03 · GEO',
            'Astronomy': 'CH-04 · ASTRO'
        };

        let cardIdx = 0;

        categories.forEach(category => {
            const sims = SIMULATIONS.filter(s => s.category === category);
            if (sims.length === 0) return;

            // Category group header
            const sectionHeader = document.createElement('div');
            sectionHeader.className = 'gallery-category-header';
            sectionHeader.innerHTML = `
                <div class="category-title-wrap">
                    <span class="category-channel-badge">${channelCodes[category] || category.toUpperCase()}</span>
                    <h2>${category}</h2>
                    <span class="category-count">${sims.length} modules</span>
                </div>
            `;
            container.appendChild(sectionHeader);

            const grid = document.createElement('div');
            grid.className = 'category-sim-grid';

            sims.forEach(sim => {
                const card = document.createElement('article');
                card.className = 'sim-card-featured';
                card.setAttribute('role', 'article');
                card.setAttribute('aria-label', `${sim.title} simulation`);
                card.setAttribute('data-sim-id', sim.id);
                card.setAttribute('data-category', sim.category);
                card.style.setProperty('--card-idx', cardIdx++);

                const isFav = window.statsTracker?.isFavorite(sim.id) || false;

                card.innerHTML = `
                    <div class="card-header">
                        <div class="card-icon" aria-hidden="true">${sim.icon}</div>
                        <button class="btn-favorite no-ripple"
                                id="fav-btn-${sim.id}"
                                data-sim-id="${sim.id}"
                                aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}"
                                data-tooltip="${isFav ? 'Remove favorite' : 'Add favorite'}"
                                type="button">
                            ${isFav ? '❤️' : '🤍'}
                        </button>
                        <div class="card-meta">
                            <div class="card-title">${sim.title}</div>
                            <div class="card-category">${sim.category} • ${sim.difficulty}</div>
                        </div>
                    </div>
                    <div class="card-body" role="button" tabindex="0" aria-label="Open ${sim.title} simulation" style="cursor: pointer;">
                        <p>${sim.description}</p>
                        <div class="card-tags">
                            ${sim.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                    <div class="card-footer" role="button" tabindex="0" aria-label="Launch ${sim.title}" style="cursor: pointer;">
                        <span class="time">⏱ ${sim.estimatedTime}</span>
                        <span class="arrow" aria-hidden="true">→</span>
                    </div>
                `;

                // Wire click and keyboard handlers
                const openHandler = () => this.openSimulation(sim.id);
                const body = card.querySelector('.card-body');
                const footer = card.querySelector('.card-footer');
                const favBtn = card.querySelector('.btn-favorite');

                if (body) {
                    body.onclick = openHandler;
                    body.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHandler(); } };
                }
                if (footer) {
                    footer.onclick = openHandler;
                    footer.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHandler(); } };
                }
                if (favBtn) {
                    favBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (window.statsTracker) {
                            const cur = window.statsTracker.isFavorite(sim.id);
                            cur ? window.statsTracker.removeFavorite(sim.id) : window.statsTracker.addFavorite(sim.id);
                            favBtn.textContent = cur ? '🤍' : '❤️';
                            favBtn.setAttribute('data-tooltip', cur ? 'Add favorite' : 'Remove favorite');
                        }
                    };
                }

                grid.appendChild(card);
            });

            container.appendChild(grid);
        });
    }

    setupCardIntersectionObserver() {
        if (typeof IntersectionObserver === 'undefined') return;

        this._cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const card = entry.target;
                const canvas = card.querySelector('canvas');
                if (canvas && canvas._p5Instance) {
                    if (entry.isIntersecting) {
                        canvas._p5Instance.loop();
                    } else {
                        canvas._p5Instance.noLoop();
                    }
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.sim-card-featured').forEach(card => {
            this._cardObserver.observe(card);
        });
    }

    checkInitialUrlParam() {
        const urlParams = new URLSearchParams(window.location.search);

        // Compare mode takes precedence over ?sim=
        const compare = this.parseCompareUrl();
        if (compare) {
            setTimeout(() => {
                // Give compare its own history entry: the current entry
                // becomes the plain gallery URL, so browser Back closes
                // compare mode (routed via the popstate listener).
                try {
                    const galleryUrl = new URL(window.location.href);
                    galleryUrl.search = '';
                    window.history.replaceState({}, '', galleryUrl.toString());
                    const compareUrl = new URL(window.location.href);
                    compareUrl.search = `compare=${compare[0]},${compare[1]}`;
                    window.history.pushState({}, '', compareUrl.toString());
                } catch (e) {}
                this.openCompare(compare[0], compare[1]);
            }, 100);
            return;
        }

        const simId = urlParams.get('sim');
        if (simId && typeof SIMULATIONS !== 'undefined') {
            const match = SIMULATIONS.find(s => s.id === simId);
            if (match) {
                setTimeout(() => this.openSimulation(simId), 100);
            }
        }
    }
    
    setupEventListeners() {
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
        }

        const backBtn = document.querySelector('.btn-back');
        if (backBtn) {
            backBtn.onclick = () => this.backToGallery();
        }
        
        const resetBtn = document.getElementById('reset-button');
        if (resetBtn) {
            resetBtn.onclick = () => this.resetSimulation();
        }

        this._keydownHandler = (e) => {
            const activeSimView = document.getElementById('simulation-view')?.classList.contains('active');
            if (activeSimView && e.key === 'Escape') {
                // Compare mode manages its own teardown and view swap
                if (document.querySelector('.compare-view')) {
                    this.closeCompare();
                } else {
                    this.backToGallery();
                }
            }
        };
        document.addEventListener('keydown', this._keydownHandler);

        // Browser Back/Forward drives compare mode: derive state from the URL
        // and open/close the compare view to match the history entry.
        window.addEventListener('popstate', () => {
            const compare = this.parseCompareUrl();
            const compareOpen = !!document.querySelector('.compare-view');
            if (compare && !compareOpen) {
                this.openCompare(compare[0], compare[1]);
            } else if (!compare && compareOpen) {
                this.closeCompare();
            }
        });
    }
    
    loadUserData() {
        const lastSimId = window.statsTracker?.stats?.simulationsViewed?.[0];
        if (lastSimId && typeof SIMULATIONS !== 'undefined') {
            this.showResumeOption(lastSimId);
        }
    }

    setupOnboarding() {
        const dismissed = localStorage.getItem('visiq-onboarding-dismissed');
        if (dismissed) return;

        const heroSection = document.querySelector('.hero-section');
        if (!heroSection) return;

        const onboarding = document.createElement('div');
        onboarding.className = 'onboarding-banner';
        onboarding.innerHTML = `
            <div class="onboarding-inner">
                <span class="onboarding-icon">👋</span>
                <div class="onboarding-text">
                    <strong>Welcome to VISIQ</strong>
                    <p>Pick any simulation below to explore physical principles interactively. Press <kbd>?</kbd> anytime for keyboard shortcuts, and <kbd>Esc</kbd> to return.</p>
                </div>
                <button class="onboarding-dismiss" aria-label="Dismiss welcome hint" title="Dismiss">Got it ✓</button>
            </div>
        `;

        onboarding.querySelector('.onboarding-dismiss').onclick = () => {
            onboarding.classList.add('dismissing');
            setTimeout(() => onboarding.remove(), 300);
            localStorage.setItem('visiq-onboarding-dismissed', '1');
        };

        heroSection.parentElement.insertBefore(onboarding, heroSection);
    }

    syncFavoriteButtons() {
        if (!window.statsTracker) return;
        const simIds = window.statsTracker.stats?.favoriteIds || [];
        document.querySelectorAll('.sim-card-featured').forEach(card => {
            const btn = card.querySelector('.btn-favorite');
            const cardId = card.getAttribute('data-sim-id');
            if (!btn || !cardId) return;
            const isFav = simIds.includes(cardId);
            btn.textContent = isFav ? '❤️' : '🤍';
            btn.setAttribute('title', isFav ? 'Remove from favorites' : 'Add to favorites');
            btn.setAttribute('data-tooltip', isFav ? 'Remove favorite' : 'Add favorite');
        });
    }
    
    openSimulation(simId) {
        console.log('[GALLERY] Opening simulation:', simId);
        
        if (typeof SIMULATIONS === 'undefined') {
            console.error('[GALLERY] SIMULATIONS not loaded');
            return;
        }
        
        const sim = SIMULATIONS.find(s => s.id === simId);
        if (!sim) {
            console.error('[GALLERY] Simulation not found:', simId);
            return;
        }
        
        this.currentSimulation = sim;
        
        const galleryView = document.getElementById('gallery-view');
        const simView = document.getElementById('simulation-view');
        
        if (galleryView && simView) {
            galleryView.classList.remove('active');
            simView.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        this.updateSimulationHeader(sim);
        this.loadSketch(simId);
        
        if (window.simTimer) {
            window.simTimer.startTimer();
        }

        if (window.statsTracker) {
            window.statsTracker.trackSimulationOpen(simId);
        }
        
        console.log('[GALLERY] Simulation opened:', sim.title);
    }
    
    updateSimulationHeader(sim) {
        const titleEl = document.getElementById('sim-title');
        const categoryEl = document.getElementById('sim-category');
        const descEl = document.getElementById('sim-description');
        
        if (titleEl) titleEl.textContent = sim.title;
        if (categoryEl) categoryEl.textContent = `${sim.category} • ${sim.difficulty}`;
        if (descEl) descEl.textContent = sim.longDescription || sim.description;
        
        if (window.simDetails) {
            window.simDetails.showDetails(sim);
        }
    }
    
    loadSketch(sketchId) {
        const container = document.getElementById('simulation-canvas');
        if (!container) {
            console.error('[GALLERY] simulation-canvas not found');
            return;
        }

        // ===== TEARDOWN EXISTING INSTANCE TO GUARANTEE ZERO LEAKS =====
        this.destroyCurrentSketch(container);
        
        const msgIndex = Math.floor(Math.random() * this.loadingMessages.length);
        container.innerHTML = `
            <div class="sim-loading">
                <div class="loading-ring">
                    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                        <circle class="loading-ring-track" cx="40" cy="40" r="32"/>
                        <circle class="loading-ring-fill" cx="40" cy="40" r="32"/>
                    </svg>
                </div>
                <p class="loading-label">${this.loadingMessages[msgIndex]}</p>
                <p class="loading-hint">Tip: Space = Play/Pause • R = Reset • Esc = Return to Gallery</p>
            </div>
        `;
        
        console.log('[GALLERY] Loading sketch:', sketchId);
        
        // Clear any previously registered initSketch so a sketch file that never
        // defines one (hurricane-formation, star-lifecycle) can't silently remount
        // the previous simulation under the new title.
        delete window.initSketch;
        
        const existingScript = document.querySelector(`script[data-sketch="${sketchId}"]`);
        if (existingScript) existingScript.remove();

        const script = document.createElement('script');
        script.src = `sketches/${sketchId}.js?v=${Date.now()}`;
        script.setAttribute('data-sketch', sketchId);
        
        script.onload = () => {
            console.log('[GALLERY] Sketch script loaded:', sketchId);
            container.innerHTML = '';
            
            const fontGate = (document.fonts && document.fonts.ready)
                ? document.fonts.ready
                : Promise.resolve();

            fontGate.then(() => {
                if (typeof window.initSketch === 'function') {
                    const instance = window.initSketch({
                        containerId: 'simulation-canvas',
                        controlsContainerId: 'controls-section'
                    });

                    if (instance && typeof instance.destroy === 'function') {
                        this._currentSimController = instance;
                        this._p5Instance = instance.p5Instance || instance.p || null;
                    } else if (instance && typeof instance.remove === 'function') {
                        this._p5Instance = instance;
                    } else {
                        this._p5Instance = window.__lastP5Instance || null;
                    }
                } else {
                    // Sketch file loaded but never registered window.initSketch
                    // (or died before it could). Say so instead of leaving a blank frame.
                    console.error('[GALLERY] Sketch did not register window.initSketch:', sketchId);
                    container.innerHTML = `
                        <div class="sim-error">
                            <span class="sim-error-icon">⚠️</span>
                            <p>This simulation isn't on the shared sim engine yet.</p>
                            <p class="sim-error-hint">It can't mount here, so nothing was drawn. Pick another module.</p>
                            <button class="btn-retry-sketch" onclick="window.gallery.backToGallery()">Back to Gallery</button>
                        </div>
                    `;
                }
            });
        };
        
        script.onerror = () => {
            console.error('[GALLERY] Failed to load sketch:', sketchId);
            container.innerHTML = `
                <div class="sim-error">
                    <span class="sim-error-icon">⚠️</span>
                    <p>Simulation couldn't be loaded.</p>
                    <p class="sim-error-hint">Please check your network connection or try another simulation.</p>
                    <button class="btn-retry-sketch" onclick="window.gallery.loadSketch('${sketchId}')">Retry</button>
                </div>
            `;
        };
        
        document.body.appendChild(script);
    }

    destroyCurrentSketch(container) {
        if (this._currentSimController && typeof this._currentSimController.destroy === 'function') {
            try {
                this._currentSimController.destroy();
            } catch (e) {
                console.warn('[GALLERY] SimController destroy warning:', e);
            }
            this._currentSimController = null;
        }

        if (this._p5Instance && typeof this._p5Instance.remove === 'function') {
            try {
                this._p5Instance.remove();
                console.log('[GALLERY] p5 instance removed (memory cleaned)');
            } catch (e) {
                console.warn('[GALLERY] p5 remove error:', e);
            }
            this._p5Instance = null;
        }

        const controlsWrapper = document.getElementById('controls-section');
        if (controlsWrapper) controlsWrapper.innerHTML = '';

        if (container) {
            const oldCanvases = container.querySelectorAll('canvas');
            oldCanvases.forEach(c => c.remove());
            container.innerHTML = '';
        }

        window.__lastP5Instance = null;
    }
    
    backToGallery() {
        console.log('[GALLERY] Back to gallery');
        
        if (window.simTimer) {
            window.simTimer.stopTimer();
        }

        if (window.statsTracker) {
            window.statsTracker.trackSimulationExit();
        }
        
        const galleryView = document.getElementById('gallery-view');
        const simView = document.getElementById('simulation-view');
        
        if (galleryView && simView) {
            simView.classList.remove('active');
            galleryView.classList.add('active');
        }
        
        const container = document.getElementById('simulation-canvas');
        this.destroyCurrentSketch(container);
        
        this.currentSimulation = null;

        // Clear query parameters in URL cleanly
        try {
            const url = new URL(window.location.href);
            url.search = '';
            window.history.replaceState({}, '', url.toString());
        } catch (e) {}
    }
    
    resetSimulation() {
        if (!this.currentSimulation) return;
        
        console.log('[GALLERY] Resetting simulation');

        if (this._currentSimController && typeof this._currentSimController.reset === 'function') {
            this._currentSimController.reset();
            return;
        }

        if (window.simTimer) {
            window.simTimer.stopTimer();
            window.simTimer.startTimer();
        }
        
        this.loadSketch(this.currentSimulation.id);
    }
    
    showResumeOption(simId) {
        if (typeof SIMULATIONS === 'undefined') return;
        const sim = SIMULATIONS.find(s => s.id === simId);
        if (!sim) return;
        
        const existing = document.querySelector('.resume-banner');
        if (existing) existing.remove();
        
        const banner = document.createElement('div');
        banner.className = 'resume-banner';
        banner.setAttribute('role', 'status');
        banner.innerHTML = `
            <div class="resume-content">
                <div class="resume-icon">▶️</div>
                <div class="resume-text">
                    <div class="resume-label">Continue Where You Left Off</div>
                    <div class="resume-sim">${sim.title}</div>
                </div>
                <button class="btn-resume" onclick="window.gallery.openSimulation('${sim.id}')">Jump Back In</button>
                <button class="btn-dismiss" aria-label="Dismiss resume prompt" onclick="this.closest('.resume-banner').remove()">×</button>
            </div>
        `;
        
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            heroSection.parentElement.insertBefore(banner, heroSection.nextElementSibling);
        }
    }
    // ── compare mode ─────────────────────────────────────────────────────────

    /** Parse "?compare=a,b" from the URL into two sim ids. Returns [a,b] or null. */
    parseCompareUrl() {
        if (typeof SIMULATIONS === 'undefined') return null;
        const params = new URLSearchParams(window.location.search);
        const cmp = params.get('compare');
        if (!cmp) return null;
        const [a, b] = String(cmp).split(',').map(s => s.trim());
        if (!a || !b) return null;
        if (a === b) return null; // comparing a sim with itself is meaningless
        if (!SIMULATIONS.some(s => s.id === a) || !SIMULATIONS.some(s => s.id === b)) return null;
        return [a, b];
    }

    /** Open a compare-mode view: two panes, synced controls, shared sparkline inset. */
    openCompare(a, b) {
        const view = document.getElementById('simulation-view');
        if (!view) return;

        // Show the sim view, hide the gallery (mirrors openSimulation)
        const galleryView = document.getElementById('gallery-view');
        if (galleryView) galleryView.classList.remove('active');
        view.classList.add('active');
        view.classList.add('compare-mode');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Tear down a solo sim if one is running, and any stale compare
        // session left behind (e.g. a forward-navigation double-open).
        if (this._currentSimController) {
            this.destroyCurrentSketch(view);
            this._currentSimController = null;
        }
        if (this._compareSims) {
            this._compareSims.forEach(s => {
                if (s && typeof s.destroy === 'function') { try { s.destroy(); } catch (e) {} }
            });
            this._compareSims = null;
        }
        clearInterval(this._sparklineTimer);
        this._sparklineTimer = null;

        const simById = (id) => SIMULATIONS.find(s => s.id === id);
        const panes = [
            { id: a, title: simById(a)?.title || a, category: simById(a)?.category },
            { id: b, title: simById(b)?.title || b, category: simById(b)?.category }
        ];

        const panesHtml = panes.map((p, i) => `
            <div class="compare-pane" data-pane-index="${i}" role="group" aria-label="${p.title} pane">
                <div class="compare-pane-title">${p.title} <span class="compare-pane-cat">${p.category}</span></div>
                <div class="compare-canvas" id="compare-canvas-${i}"></div>
                <div class="compare-controls" id="compare-controls-${i}"></div>
            </div>
        `).join('');

        const html = `
            <div class="compare-view">
                <div class="compare-header">
                    <button class="btn-back">← Back</button>
                    <h1>Compare · ${panes[0].title} vs ${panes[1].title}</h1>
                </div>
                <div class="compare-panes" role="group" aria-label="Comparison: ${panes[0].title} versus ${panes[1].title}">
                    ${panesHtml}
                </div>
                <div class="compare-chrome">
                    <div class="compare-playback">
                        <button class="btn-control btn-play-pause" id="compare-play-pause">▶ Play both</button>
                        <button class="btn-control btn-reset-sim" id="compare-reset">↺ Reset both</button>
                        <div class="speed-control-group">
                            <label for="compare-speed" class="speed-label">Speed</label>
                            <select id="compare-speed" class="speed-select">
                                <option value="0.25">0.25×</option>
                                <option value="0.5">0.5×</option>
                                <option value="1.0" selected>1.0×</option>
                                <option value="1.5">1.5×</option>
                                <option value="2.0">2.0×</option>
                            </select>
                        </div>
                    </div>
                    <div class="compare-sparkline-panel">
                        <div class="compare-sparkline-label">Energy · shared time axis</div>
                        <div class="compare-sparkline-wrap" id="compare-sparkline-wrap"></div>
                    </div>
                </div>
            </div>
        `;
        view.innerHTML = html;

        const panesData = panes.map((pane, i) => ({
            id: pane.id, container: document.getElementById(`compare-canvas-${i}`), controls: document.getElementById(`compare-controls-${i}`), i
        }));

        // Keyboard: Escape is handled by the global _keydownHandler, which
        // routes to closeCompare() while .compare-view is open.

        // Loading indicator (announced politely to screen readers)
        const loadingEl = document.createElement('div');
        loadingEl.id = 'compare-loading';
        loadingEl.setAttribute('role', 'status');
        loadingEl.setAttribute('aria-live', 'polite');
        loadingEl.innerHTML = '<div class="compare-loading-spinner" aria-hidden="true"></div><p>Loading both simulations...</p>';
        view.querySelector('.compare-panes').prepend(loadingEl);

        this._compareSims = [];
        // Remove the loading indicator once both scripts have settled
        // (loaded or failed), so it cannot hang forever on a failed load.
        let pendingScripts = panesData.length;
        const session = (this._compareSession = (this._compareSession || 0) + 1);
        const settleScript = () => {
            pendingScripts -= 1;
            if (pendingScripts <= 0) {
                const loading = document.getElementById('compare-loading');
                if (loading) loading.remove();
            }
        };
        panesData.forEach((pd) => {
            const script = document.createElement('script');
            script.src = `sketches/${pd.id}.js?v=${Date.now()}`;
            script.onload = () => {
                // Stale callback: either compare mode closed while this script
                // was in flight, or a newer compare session replaced it —
                // initializing then would attach a sketch to the wrong (or
                // detached) container and throw on the cleared sims array.
                if (session !== this._compareSession || !this._compareSims) {
                    script.remove();
                    return;
                }
                if (window.initSketch) {
                    const instance = window.initSketch({ containerId: pd.container.id, controlsContainerId: pd.controls.id });
                    if (instance && typeof instance.destroy === 'function') {
                        // Sketches load at different times — apply the shared
                        // speed so a late pane does not start out of sync.
                        instance.speed = this._compareSpeed;
                        this._compareSims[pd.i] = instance;
                    }
                    this._syncAndRender();
                }
                settleScript();
                script.remove();
            };
            script.onerror = () => {
                console.error(`[GALLERY] Failed to load sketch: sketches/${pd.id}.js`);
                if (session !== this._compareSession) {
                    script.remove();
                    return;
                }
                // Skip this pane if script fails to load
                if (this._compareSims) {
                    this._compareSims[pd.i] = null;
                    if (pd.container) {
                        pd.container.innerHTML = '<div class="compare-empty">Failed to load this sketch.</div>';
                    }
                }
                settleScript();
                script.remove();
            };
            document.body.appendChild(script);
        });

        this._renderSparklineCells(panes);
        this._sparklineHistory = [[], []];
        this._compareSpeed = 1.0;
        document.title = `Compare · ${panes[0].title} vs ${panes[1].title} — VISIQ`;

        // Sparklines were previously rendered only once when each script
        // loaded; sample them on an interval so they track live energy.
        clearInterval(this._sparklineTimer);
        this._sparklineTimer = setInterval(() => this._updateSparklines(), 250);

        const backBtn = view.querySelector('.btn-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.closeCompare());
            backBtn.setAttribute('aria-label', 'Back to Gallery (Esc)');
        }
    }

    _syncAndRender() {
        this._wireSyncedControls();
        this._updateSparklines();
    }

    /** Compare sketch controllers that actually loaded (failed panes are null). */
    loadedCompareSims() {
        return (this._compareSims || []).filter(s => s != null);
    }

    _wireSyncedControls() {
        const playBtn = document.getElementById('compare-play-pause');
        const resetBtn = document.getElementById('compare-reset');
        const speedSelect = document.getElementById('compare-speed');
        if (playBtn) {
            playBtn.onclick = () => {
                const sims = this.loadedCompareSims();
                // Converge: if panes drifted into mixed states, snap them all
                // to one target instead of blindly toggling (a blind toggle of
                // mixed panes just keeps them mixed).
                const target = !(sims.length > 0 && sims.every(s => s.isPlaying));
                sims.forEach(s => {
                    if (!s.togglePlay) return;
                    if (!!s.isPlaying !== target) s.togglePlay();
                });
                this._updatePlayBothLabel();
            };
        }
        if (resetBtn) {
            resetBtn.onclick = () => { this.loadedCompareSims().forEach(s => s.reset && s.reset()); };
        }
        if (speedSelect) {
            speedSelect.onchange = (e) => {
                const speed = parseFloat(e.target.value) || 1.0;
                this._compareSpeed = speed;
                this.loadedCompareSims().forEach(s => { s.speed = speed; });
            };
            // Keep the select visually aligned (a reopen resets it to 1.0).
            speedSelect.value = String(this._compareSpeed);
        }
        this._updatePlayBothLabel();
    }

    /** Keep the shared Play/Pause button label in sync with pane state. */
    _updatePlayBothLabel() {
        const playBtn = document.getElementById('compare-play-pause');
        if (!playBtn) return;
        const sims = this.loadedCompareSims();
        const playing = sims.length > 0 && sims.every(s => s.isPlaying);
        playBtn.innerHTML = playing
            ? '<span aria-hidden="true">⏸</span> Pause both'
            : '<span aria-hidden="true">▶</span> Play both';
        playBtn.setAttribute('aria-pressed', String(playing));
    }

    _renderSparklineCells(panes) {
        const wrap = document.getElementById('compare-sparkline-wrap');
        if (!wrap) return;
        wrap.innerHTML = '';
        panes.forEach((pane, i) => {
            const cell = document.createElement('div');
            cell.className = 'sparkline-cell';
            const label = document.createElement('div');
            label.className = 'sparkline-label';
            label.textContent = pane.title;
            const canvas = document.createElement('canvas');
            canvas.className = 'compare-sparkline';
            canvas.id = `compare-sparkline-${i}`;
            cell.appendChild(label);
            cell.appendChild(canvas);
            wrap.appendChild(cell);
        });
    }

    _updateSparklines() {
        const wrap = document.getElementById('compare-sparkline-wrap');
        if (!wrap || !this._compareSims || this._compareSims.length !== 2) return;
        if (!this._sparklineHistory) this._sparklineHistory = [[], []];
        const HISTORY_CAP = 60; // ~15s of samples at the 250ms tick

        // Sims surface energy as formatted telemetry strings ('12.3 J', '62.5%')
        // under keys like 'Total Energy' — so take the numeric convention
        // first, then prefer energy-like keys, then any parseable readout.
        const readEnergy = (sim) => {
            if (!sim) return null;
            if (sim._telemetry && typeof sim._telemetry.energy_kinetic === 'number') {
                return sim._telemetry.energy_kinetic;
            }
            if (typeof sim.getReadouts !== 'function') return null;
            let readouts = null;
            try { readouts = sim.getReadouts(); } catch (e) { return null; }
            if (!readouts || typeof readouts !== 'object') return null;
            const entries = Object.entries(readouts).sort(([a], [b]) => {
                const ea = /energy|kinetic|total/i.test(a) ? 0 : 1;
                const eb = /energy|kinetic|total/i.test(b) ? 0 : 1;
                return ea - eb;
            });
            for (const [, v] of entries) {
                if (typeof v === 'number' && Number.isFinite(v)) return v;
                const n = parseFloat(String(v));
                if (Number.isFinite(n)) return n;
            }
            return null;
        };

        // Record this tick for each pane (failed panes have no history)
        this._compareSims.forEach((sim, i) => {
            const energy = readEnergy(sim);
            if (energy == null) return;
            const hist = this._sparklineHistory[i];
            hist.push(energy);
            if (hist.length > HISTORY_CAP) hist.shift();
        });

        // Shared scale across both series so the panes are comparable
        const all = this._sparklineHistory[0].concat(this._sparklineHistory[1]);
        if (all.length < 2) return;
        let min = Math.min(...all);
        let max = Math.max(...all);
        if (max - min < 1e-9) max = min + 1;
        const pad = (max - min) * 0.08;
        min -= pad;
        max += pad;

        wrap.querySelectorAll('.sparkline-cell canvas').forEach((canvas, i) => {
            const hist = this._sparklineHistory[i];
            const w = canvas.clientWidth || 120;
            const h = canvas.clientHeight || 40;
            if (canvas.width !== w) canvas.width = w;
            if (canvas.height !== h) canvas.height = h;
            const ctx2d = canvas.getContext('2d');
            ctx2d.clearRect(0, 0, w, h);
            if (hist.length < 2) return;

            const toY = (v) => h - 4 - ((v - min) / (max - min)) * (h - 8);
            // Sample-index alignment: sample k of pane A and sample k of pane B
            // share the same x, giving a true shared time axis.
            const toX = (idx) => (idx / (HISTORY_CAP - 1)) * w;

            ctx2d.strokeStyle = i === 0 ? '#4A90D9' : '#7B61FF';
            ctx2d.lineWidth = 2;
            ctx2d.beginPath();
            hist.forEach((v, idx) => {
                const x = toX(idx);
                const y = toY(v);
                idx === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
            });
            ctx2d.stroke();

            // Fill under the curve
            ctx2d.lineTo(toX(hist.length - 1), h - 2);
            ctx2d.lineTo(0, h - 2);
            ctx2d.closePath();
            ctx2d.fillStyle = i === 0 ? 'rgba(74,144,217,0.12)' : 'rgba(123,97,255,0.12)';
            ctx2d.fill();
        });
    }

    closeCompare() {
        const view = document.getElementById('simulation-view');
        // Idempotent: a second call (e.g. Back click + Escape) must be a no-op
        if (!view || !view.querySelector('.compare-view')) return;
        // Destroy compare two-pane sims
        if (this._compareSims) {
            this._compareSims.forEach(s => {
                if (s && typeof s.destroy === 'function') { try { s.destroy(); } catch (e) {} }
            });
            this._compareSims = null;
        }
        // Empty the view
        view.innerHTML = '';
        view.classList.remove('compare-mode');
        document.title = 'VISIQ – Interactive Science Learning';
        // Restore the gallery view (mirrors backToGallery)
        const galleryView = document.getElementById('gallery-view');
        if (galleryView) galleryView.classList.add('active');
        view.classList.remove('active');
        // Clear the compare query parameter so a refresh stays in the gallery
        try {
            const url = new URL(window.location.href);
            url.search = '';
            window.history.replaceState({}, '', url.toString());
        } catch (e) {}
        // Clean up UI state
        clearInterval(this._sparklineTimer);
        this._sparklineTimer = null;
        this._sparklineHistory = null;
        this._compareSpeed = 1.0;
    }
}

(function patchP5ForTracking() {
    const _original = window.p5;
    if (!_original) return;
    window.p5 = function(sketch, container) {
        const inst = new _original(sketch, container);
        window.__lastP5Instance = inst;
        return inst;
    };
    window.p5.prototype = _original.prototype;
    Object.keys(_original).forEach(k => { window.p5[k] = _original[k]; });
})();

// Initialize
function initGallery() {
    if (typeof SIMULATIONS === 'undefined') {
        setTimeout(initGallery, 100);
        return;
    }
    
    if (!window.gallery) {
        window.gallery = new Gallery();
        console.log('[GALLERY] Gallery initialized');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGallery);
} else {
    initGallery();
}

setTimeout(initGallery, 500);