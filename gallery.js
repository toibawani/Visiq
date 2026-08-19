// ===== GALLERY SYSTEM =====
// Main simulation gallery and interaction handler

class Gallery {
    constructor() {
        console.log('[GALLERY] Initializing');
        this.currentSimulation = null;
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.loadUserData();
        console.log('[GALLERY] Ready');
    }

    setupEventListeners() {
        // Back button
        const backBtn = document.querySelector('.btn-back');

        if (backBtn) {
            backBtn.addEventListener('click', () => this.backToGallery());
        }

        // Reset button
        const resetBtn = document.getElementById('reset-button');

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSimulation());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.backToGallery();
            if (e.key === 'r' || e.key === 'R') this.resetSimulation();
        });
    }

    loadUserData() {
        const lastSimId = window.userPrefs?.preferences?.lastSimulation;

        if (lastSimId) {
            this.showResumeOption(lastSimId);
        }
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

        // Track view
        if (window.userPrefs) {
            window.userPrefs.recordSimulationView(simId, 0);
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

        console.log('[GALLERY] Simulation opened:', sim.title);
    }

    updateSimulationHeader(sim) {
        const titleEl = document.getElementById('sim-title');
        const categoryEl = document.getElementById('sim-category');
        const descEl = document.getElementById('sim-description');

        if (titleEl) titleEl.textContent = sim.title;
        if (categoryEl) categoryEl.textContent = sim.category;
        if (descEl) descEl.textContent = sim.longDescription;
    }

    // ==================================================
    // LOAD SKETCH
    // ==================================================

    loadSketch(sketchId) {
        const container = document.getElementById('simulation-canvas');

        if (!container) {
            console.error('[GALLERY] simulation-canvas not found');
            return;
        }

        // Show loading state
        container.innerHTML = `
            <div class="sim-loading">
                <div class="loading-spinner"></div>
                <p>Loading simulation...</p>
            </div>
        `;

        console.log('[GALLERY] Loading sketch:', sketchId);

        // Load sketch script
        const script = document.createElement('script');
        script.src = `sketches/${sketchId}.js`;

        script.onload = () => {
            console.log('[GALLERY] Sketch loaded:', sketchId);

            // Clear loading state
            container.innerHTML = '';

            // Initialize sketch
            if (typeof window.initSketch === 'function') {
                window.initSketch({
                    containerId: 'simulation-canvas'
                });
            } else {
                console.error('[GALLERY] initSketch function not found');

                container.innerHTML = `
                    <div class="sim-error">
                        <p>⚠️ Simulation could not be initialized</p>
                        <p style="font-size: 12px; color: #666; margin-top: 8px;">
                            Try refreshing the page
                        </p>
                    </div>
                `;
            }
        };

        script.onerror = () => {
            console.error('[GALLERY] Failed to load sketch:', sketchId);

            container.innerHTML = `
                <div class="sim-error">
                    <p>⚠️ Simulation failed to load</p>
                    <p style="font-size: 12px; color: #666; margin-top: 8px;">
                        Try refreshing the page
                    </p>
                </div>
            `;
        };

        document.body.appendChild(script);
    }

    backToGallery() {
        console.log('[GALLERY] Back to gallery');

        const galleryView = document.getElementById('gallery-view');
        const simView = document.getElementById('simulation-view');

        if (galleryView && simView) {
            simView.classList.remove('active');
            galleryView.classList.add('active');
        }

        const container = document.getElementById('simulation-canvas');

        if (container) {
            container.innerHTML = '';
        }

        this.currentSimulation = null;
    }

    resetSimulation() {
        if (!this.currentSimulation) return;

        console.log('[GALLERY] Resetting simulation');

        const container = document.getElementById('simulation-canvas');

        if (container) {
            container.innerHTML = '';
        }

        this.loadSketch(this.currentSimulation.id);
    }

    toggleFavorite(simId) {
        if (!window.userPrefs) return;

        const btn = document.querySelector(
            `[data-sim-id="${simId}"] .btn-favorite`
        );

        if (!btn) return;

        if (window.userPrefs.isFavorite(simId)) {
            window.userPrefs.removeFavorite(simId);
            btn.textContent = '🤍';
        } else {
            window.userPrefs.addFavorite(simId);
            btn.textContent = '❤️';
        }
    }

    showResumeOption(simId) {
        if (typeof SIMULATIONS === 'undefined') return;

        const sim = SIMULATIONS.find(s => s.id === simId);

        if (!sim) return;

        console.log('[GALLERY] Showing resume for:', sim.title);

        const banner = document.createElement('div');
        banner.className = 'resume-banner';

        banner.innerHTML = `
            <div class="resume-content">
                <div class="resume-icon">▶️</div>

                <div class="resume-text">
                    <div class="resume-label">Continue Learning</div>
                    <div class="resume-sim">${sim.title}</div>
                </div>

                <button class="btn-resume">
                    Resume
                </button>

                <button class="btn-dismiss">
                    ×
                </button>
            </div>
        `;

        const resumeButton = banner.querySelector('.btn-resume');
        const dismissButton = banner.querySelector('.btn-dismiss');

        resumeButton.addEventListener('click', () => {
            this.openSimulation(sim.id);
        });

        dismissButton.addEventListener('click', () => {
            banner.remove();
        });

        const heroSection = document.querySelector('.hero-section');

        if (heroSection) {
            heroSection.parentElement.insertBefore(
                banner,
                heroSection.nextElementSibling
            );
        }
    }
}

// ==================================================
// INITIALIZE GALLERY
// ==================================================

function initGallery() {
    if (typeof SIMULATIONS === 'undefined') {
        console.error('[GALLERY] SIMULATIONS not loaded');
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