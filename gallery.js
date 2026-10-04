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
                this.backToGallery();
            }
        };
        document.addEventListener('keydown', this._keydownHandler);
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
}

// Patch p5 global constructor to track instances for cleanup
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