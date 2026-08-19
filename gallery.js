// ===== GALLERY SYSTEM =====
// Main simulation gallery and interaction handler

class Gallery {
    constructor() {
        console.log('[GALLERY] Initializing');

        this.currentSimulation = null;

        this.initialize();
    }

    // ==================================================
    // INITIALIZE
    // ==================================================

    initialize() {
        this.setupEventListeners();
        this.loadUserData();

        console.log('[GALLERY] Ready');
    }

    // ==================================================
    // EVENT LISTENERS
    // ==================================================

    setupEventListeners() {

        // Back button
        const backBtn = document.querySelector('.btn-back');

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.backToGallery();
            });
        }

        // Reset button
        const resetBtn = document.getElementById('reset-button');

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetSimulation();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {

            // Escape → back to gallery
            if (e.key === 'Escape') {
                this.backToGallery();
            }

            // R → reset simulation
            if (e.key === 'r' || e.key === 'R') {
                this.resetSimulation();
            }
        });
    }

    // ==================================================
    // USER DATA
    // ==================================================

    loadUserData() {

        // Load last simulation
        const lastSimId =
            window.userPrefs?.preferences?.lastSimulation;

        if (lastSimId) {
            this.showResumeOption(lastSimId);
        }
    }

    // ==================================================
    // OPEN SIMULATION
    // ==================================================

    openSimulation(simId) {

        console.log(
            '[GALLERY] Opening simulation:',
            simId
        );

        // Make sure simulations exist
        if (typeof SIMULATIONS === 'undefined') {

            console.error(
                '[GALLERY] SIMULATIONS not loaded'
            );

            return;
        }

        // Find simulation
        const sim = SIMULATIONS.find(
            s => s.id === simId
        );

        if (!sim) {

            console.error(
                '[GALLERY] Simulation not found:',
                simId
            );

            return;
        }

        // Track simulation view
        if (
            window.userPrefs &&
            typeof window.userPrefs.recordSimulationView === 'function'
        ) {

            window.userPrefs.recordSimulationView(
                simId,
                0
            );
        }

        // Store current simulation
        this.currentSimulation = sim;

        // Get views
        const galleryView =
            document.getElementById('gallery-view');

        const simView =
            document.getElementById('simulation-view');

        // Switch from gallery → simulation
        if (galleryView && simView) {

            galleryView.classList.remove('active');

            simView.classList.add('active');
        }

        // Update simulation information
        this.updateSimulationHeader(sim);

        // Load simulation
        this.loadSketch(simId);

        console.log(
            '[GALLERY] Simulation opened:',
            sim.title
        );
    }

    // ==================================================
    // UPDATE SIMULATION HEADER
    // ==================================================

    updateSimulationHeader(sim) {

        const titleEl =
            document.getElementById('sim-title');

        const categoryEl =
            document.getElementById('sim-category');

        if (titleEl) {
            titleEl.textContent = sim.title;
        }

        if (categoryEl) {
            categoryEl.textContent = sim.category;
        }

        // Show detailed simulation information
        if (
            window.simDetails &&
            typeof window.simDetails.showDetails === 'function'
        ) {

            window.simDetails.showDetails(sim);
        }
    }

    // ==================================================
    // LOAD SKETCH
    // ==================================================

    loadSketch(sketchId) {

        const container =
            document.getElementById('simulation-canvas');

        if (!container) {

            console.error(
                '[GALLERY] simulation-canvas not found'
            );

            return;
        }

        // Show loading state
        container.innerHTML = `
            <div class="sim-loading">

                <div class="loading-spinner"></div>

                <p>
                    Loading simulation...
                </p>

            </div>
        `;

        console.log(
            '[GALLERY] Loading sketch:',
            sketchId
        );

        // Create script
        const script =
            document.createElement('script');

        script.src =
            `sketches/${sketchId}.js`;

        // ==================================================
        // SCRIPT LOADED
        // ==================================================

        script.onload = () => {

            console.log(
                '[GALLERY] Sketch loaded:',
                sketchId
            );

            // Remove loading screen
            container.innerHTML = '';

            // Initialize sketch
            if (
                typeof window.initSketch === 'function'
            ) {

                window.initSketch({
                    containerId:
                        'simulation-canvas'
                });

            } else {

                console.error(
                    '[GALLERY] initSketch function not found'
                );

                container.innerHTML = `
                    <div class="sim-error">

                        <p>
                            ⚠️ Simulation could not be initialized
                        </p>

                        <p
                            style="
                                font-size: 12px;
                                color: #666;
                                margin-top: 8px;
                            "
                        >
                            Try refreshing the page
                        </p>

                    </div>
                `;
            }
        };

        // ==================================================
        // SCRIPT FAILED
        // ==================================================

        script.onerror = () => {

            console.error(
                '[GALLERY] Failed to load sketch:',
                sketchId
            );

            container.innerHTML = `
                <div class="sim-error">

                    <p>
                        ⚠️ Simulation failed to load
                    </p>

                    <p
                        style="
                            font-size: 12px;
                            color: #666;
                            margin-top: 8px;
                        "
                    >
                        Try refreshing the page
                    </p>

                </div>
            `;
        };

        // Add script to page
        document.body.appendChild(script);
    }

    // ==================================================
    // BACK TO GALLERY
    // ==================================================

    backToGallery() {

        // Don't do anything if gallery is already visible
        if (!this.currentSimulation) {
            return;
        }

        console.log(
            '[GALLERY] Back to gallery'
        );

        const galleryView =
            document.getElementById('gallery-view');

        const simView =
            document.getElementById('simulation-view');

        // Switch views
        if (galleryView && simView) {

            simView.classList.remove('active');

            galleryView.classList.add('active');
        }

        // Clear simulation canvas
        const container =
            document.getElementById('simulation-canvas');

        if (container) {
            container.innerHTML = '';
        }

        // Clear current simulation
        this.currentSimulation = null;
    }

    // ==================================================
    // RESET SIMULATION
    // ==================================================

    resetSimulation() {

        if (!this.currentSimulation) {
            return;
        }

        console.log(
            '[GALLERY] Resetting simulation'
        );

        const container =
            document.getElementById('simulation-canvas');

        if (container) {
            container.innerHTML = '';
        }

        // Reload current simulation
        this.loadSketch(
            this.currentSimulation.id
        );
    }

    // ==================================================
    // FAVORITES
    // ==================================================

    toggleFavorite(simId) {

        if (!window.userPrefs) {
            return;
        }

        const btn =
            document.querySelector(
                `[data-sim-id="${simId}"] .btn-favorite`
            );

        if (!btn) {
            return;
        }

        // Remove favorite
        if (
            typeof window.userPrefs.isFavorite === 'function' &&
            window.userPrefs.isFavorite(simId)
        ) {

            window.userPrefs.removeFavorite(simId);

            btn.textContent = '🤍';

        } else {

            // Add favorite
            window.userPrefs.addFavorite(simId);

            btn.textContent = '❤️';
        }
    }

    // ==================================================
    // RESUME SIMULATION
    // ==================================================

    showResumeOption(simId) {

        if (typeof SIMULATIONS === 'undefined') {
            return;
        }

        const sim =
            SIMULATIONS.find(
                s => s.id === simId
            );

        if (!sim) {
            return;
        }

        console.log(
            '[GALLERY] Showing resume for:',
            sim.title
        );

        // Create banner
        const banner =
            document.createElement('div');

        banner.className =
            'resume-banner';

        banner.innerHTML = `
            <div class="resume-content">

                <div class="resume-icon">
                    ▶️
                </div>

                <div class="resume-text">

                    <div class="resume-label">
                        Continue Learning
                    </div>

                    <div class="resume-sim">
                        ${sim.title}
                    </div>

                </div>

                <button class="btn-resume">
                    Resume
                </button>

                <button class="btn-dismiss">
                    ×
                </button>

            </div>
        `;

        // Resume button
        const resumeButton =
            banner.querySelector('.btn-resume');

        if (resumeButton) {

            resumeButton.addEventListener(
                'click',
                () => {

                    this.openSimulation(
                        sim.id
                    );

                }
            );
        }

        // Dismiss button
        const dismissButton =
            banner.querySelector('.btn-dismiss');

        if (dismissButton) {

            dismissButton.addEventListener(
                'click',
                () => {

                    banner.remove();

                }
            );
        }

        // Insert banner
        const heroSection =
            document.querySelector('.hero-section');

        if (
            heroSection &&
            heroSection.parentElement
        ) {

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

    // Wait for simulations to load
    if (
        typeof SIMULATIONS === 'undefined'
    ) {

        console.error(
            '[GALLERY] SIMULATIONS not loaded'
        );

        setTimeout(
            initGallery,
            100
        );

        return;
    }

    // Prevent duplicate initialization
    if (!window.gallery) {

        window.gallery =
            new Gallery();

        console.log(
            '[GALLERY] Gallery initialized'
        );
    }
}

// ==================================================
// WAIT FOR DOM
// ==================================================

if (
    document.readyState === 'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        initGallery
    );

} else {

    initGallery();
}

// ==================================================
// SAFETY RETRY
// ==================================================

setTimeout(
    initGallery,
    500
);