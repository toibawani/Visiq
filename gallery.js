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
        // Load resume option if exists
        const lastSimId = window.userPrefs?.preferences?.lastSimulation;
        if (lastSimId) {
            this.showResumeOption(lastSimId);
        }
    }
    
    openSimulation(simId) {
        console.log('[GALLERY] Opening simulation:', simId);
        
        if (!SIMULATIONS) {
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
        
        // Store current simulation
        this.currentSimulation = sim;
        
        // Switch views
        const galleryView = document.getElementById('gallery-view');
        const simView = document.getElementById('simulation-view');
        
        if (galleryView && simView) {
            galleryView.classList.remove('active');
            simView.classList.add('active');
        }
        
        // Update UI
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
    
    loadSketch(sketchId) {
        const container = document.getElementById('simulation-canvas');
        if (!container) {
            console.error('[GALLERY] simulation-canvas not found');
            return;
        }
        
        // Clear previous sketch
        container.innerHTML = '';
        
        console.log('[GALLERY] Loading sketch:', sketchId);
        
        // Load sketch script
        const script = document.createElement('script');
        script.src = 'sketches/' + sketchId + '.js';
        
        script.onload = () => {
            console.log('[GALLERY] Sketch loaded:', sketchId);
            
            // Initialize sketch
            if (window.initSketch) {
                window.initSketch({ containerId: 'simulation-canvas' });
            }
        };
        
        script.onerror = () => {
            console.error('[GALLERY] Failed to load sketch:', sketchId);
            container.innerHTML = '<div style="padding: 20px; color: #888;">Simulation failed to load</div>';
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
        
        // Clean up sketch
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
        
        // Reload sketch
        this.loadSketch(this.currentSimulation.id);
    }
    
    toggleFavorite(simId) {
        if (!window.userPrefs) return;
        
        const btn = document.querySelector(`[data-sim-id="${simId}"] .btn-favorite`);
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
                <button class="btn-resume" onclick="window.gallery.openSimulation('${sim.id}')">Resume</button>
                <button class="btn-dismiss" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            heroSection.parentElement.insertBefore(banner, heroSection.nextElementSibling);
        }
    }
}

// Initialize when ready
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

// Wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGallery);
} else {
    initGallery();
}

// Retry after delay
setTimeout(initGallery, 500);