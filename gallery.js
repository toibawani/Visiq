// ===== GALLERY SYSTEM =====
// Complete simulation gallery with p5 lifecycle management, empathetic states, and analytics hooks

class Gallery {
    constructor() {
        console.log('[GALLERY] Initializing');
        this.currentSimulation = null;
        this._p5Instance = null;
        this._keydownHandler = null;
        this.loadingMessages = [
            'Calibrating wave superposition fields...',
            'Computing gravitational matrices...',
            'Initializing particle trajectories...',
            'Mapping orbital resonance curves...',
            'Engaging chaos theory variables...',
            'Rendering quantum probability clouds...',
            'Aligning cosmic force vectors...',
        ];
        this.initialize();
    }
    
    initialize() {
        this.setupEventListeners();
        this.loadUserData();
        this.setupOnboarding();
        this.syncFavoriteButtons();
        console.log('[GALLERY] Ready');
    }
    
    setupEventListeners() {
        // Cleanup any existing handler before adding new one
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
        }

        const backBtn = document.querySelector('.btn-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.backToGallery());
        }
        
        const resetBtn = document.getElementById('reset-button');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSimulation());
        }
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
                    <strong>Welcome to VISIQ!</strong>
                    <p>Pick any simulation below to explore forces, waves, and chaos interactively. Press <kbd>?</kbd> anytime for keyboard shortcuts. Click ❤️ to save your favorites.</p>
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
            const cardId = this.getCardId(card);
            if (!btn || !cardId) return;
            const isFav = simIds.includes(cardId);
            btn.textContent = isFav ? '❤️' : '🤍';
            btn.setAttribute('title', isFav ? 'Remove from favorites' : 'Add to favorites');
            btn.setAttribute('data-tooltip', isFav ? 'Remove favorite' : 'Add favorite');
        });
    }

    getCardId(card) {
        const body = card.querySelector('.card-body');
        if (!body) return '';
        const oc = body.getAttribute('onclick') || '';
        const match = oc.match(/'([^']+)'/);
        return match ? match[1] : '';
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
        }
        
        this.updateSimulationHeader(sim);
        this.loadSketch(simId);
        
        if (window.simTimer) {
            window.simTimer.startTimer();
        }

        // Track in stats
        if (window.statsTracker) {
            window.statsTracker.trackSimulationOpen(simId);
        }
        
        console.log('[GALLERY] Simulation opened:', sim.title);
    }
    
    updateSimulationHeader(sim) {
        const titleEl = document.getElementById('sim-title');
        const categoryEl = document.getElementById('sim-category');
        
        if (titleEl) titleEl.textContent = sim.title;
        if (categoryEl) categoryEl.textContent = `${sim.category} • ${sim.difficulty}`;
        
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

        // ===== CRITICAL: Teardown existing p5 instance to prevent memory leaks =====
        this.destroyCurrentSketch(container);
        
        // Show empathetic loading screen with rotating message
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
                <p class="loading-hint">Tip: Press <kbd>R</kbd> to reset • <kbd>?</kbd> for shortcuts • <kbd>Esc</kbd> to return</p>
            </div>
        `;
        
        console.log('[GALLERY] Loading sketch:', sketchId);
        
        // Remove old script tag to allow re-loading on reset
        const existingScript = document.querySelector(`script[data-sketch="${sketchId}"]`);
        if (existingScript) existingScript.remove();

        const script = document.createElement('script');
        script.src = `sketches/${sketchId}.js?v=${Date.now()}`;
        script.setAttribute('data-sketch', sketchId);
        
        script.onload = () => {
            console.log('[GALLERY] Sketch loaded:', sketchId);
            container.innerHTML = '';
            
            if (typeof window.initSketch === 'function') {
                const p5inst = window.initSketch({ containerId: 'simulation-canvas' });
                // If the sketch returns a p5 instance, track it for cleanup
                if (p5inst && typeof p5inst.remove === 'function') {
                    this._p5Instance = p5inst;
                } else {
                    // Try to find the last created p5 instance
                    this._p5Instance = window.__lastP5Instance || null;
                }
            }
        };
        
        script.onerror = () => {
            console.error('[GALLERY] Failed to load sketch:', sketchId);
            container.innerHTML = `
                <div class="sim-error">
                    <span class="sim-error-icon">⚠️</span>
                    <p>Simulation couldn't be loaded right now.</p>
                    <p class="sim-error-hint">Check your connection or try a different simulation.</p>
                    <button class="btn-retry-sketch" onclick="window.gallery.loadSketch('${sketchId}')">Retry</button>
                </div>
            `;
        };
        
        document.body.appendChild(script);
    }

    destroyCurrentSketch(container) {
        // Clean up p5 instance if tracked
        if (this._p5Instance && typeof this._p5Instance.remove === 'function') {
            try {
                this._p5Instance.remove();
                console.log('[GALLERY] p5 instance removed (memory cleaned)');
            } catch (e) {
                console.warn('[GALLERY] p5 remove error:', e);
            }
            this._p5Instance = null;
        }

        // Also remove any canvas elements orphaned in the container
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
    }
    
    resetSimulation() {
        if (!this.currentSimulation) return;
        
        console.log('[GALLERY] Resetting simulation');

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
        
        console.log('[GALLERY] Showing resume for:', sim.title);
        
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
    // Copy prototype and static props
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

// Fallback in case scripts load out of order
setTimeout(initGallery, 500);