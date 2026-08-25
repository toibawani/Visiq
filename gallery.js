// ===== GALLERY SYSTEM =====
// Complete simulation gallery and interaction handler

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
        const backBtn = document.querySelector('.btn-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.backToGallery());
        }
        
        const resetBtn = document.getElementById('reset-button');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSimulation());
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.backToGallery();
            if (e.key === 'r' || e.key === 'R') this.resetSimulation();
        });
    }
    
    loadUserData() {
        const lastSimId = window.statsTracker?.stats?.simulationsViewed?.[0];
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
        
        if (window.recentlyViewed) {
            window.recentlyViewed.addToRecent(simId);
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
        
        console.log('[GALLERY] Simulation opened:', sim.title);
    }
    
    updateSimulationHeader(sim) {
        const titleEl = document.getElementById('sim-title');
        const categoryEl = document.getElementById('sim-category');
        
        if (titleEl) titleEl.textContent = sim.title;
        if (categoryEl) categoryEl.textContent = sim.category;
        
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
        
        container.innerHTML = '<div class="sim-loading"><div class="loading-spinner"></div><p>Loading simulation...</p></div>';
        
        console.log('[GALLERY] Loading sketch:', sketchId);
        
        const script = document.createElement('script');
        script.src = 'sketches/' + sketchId + '.js';
        
        script.onload = () => {
            console.log('[GALLERY] Sketch loaded:', sketchId);
            container.innerHTML = '';
            
            if (window.initSketch) {
                window.initSketch({ containerId: 'simulation-canvas' });
            }
        };
        
        script.onerror = () => {
            console.error('[GALLERY] Failed to load sketch:', sketchId);
            container.innerHTML = '<div class="sim-error"><p>⚠️ Simulation failed to load</p><p style="font-size: 12px; color: #666; margin-top: 8px;">Try refreshing the page</p></div>';
        };
        
        document.body.appendChild(script);
    }
    
    backToGallery() {
        console.log('[GALLERY] Back to gallery');
        
        if (window.simTimer) {
            window.simTimer.stopTimer();
        }
        
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
    
    showResumeOption(simId) {
        const sim = SIMULATIONS.find(s => s.id === simId);
        if (!sim) return;
        
        console.log('[GALLERY] Showing resume for:', sim.title);
        
        const existing = document.querySelector('.resume-banner');
        if (existing) existing.remove();
        
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

// Initialize
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