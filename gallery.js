// ===== GALLERY SYSTEM =====
// Main simulation gallery interface

class Gallery {
    constructor() {
        console.log('[GALLERY] Constructor called');
        console.log('[GALLERY] SIMULATIONS available:', typeof SIMULATIONS !== 'undefined');
        
        this.currentFilter = 'all';
        this.currentSort = 'popular';
        this.filteredSimulations = SIMULATIONS ? [...SIMULATIONS] : [];
        this.initialize();
    }
    
    initialize() {
        console.log('[GALLERY] Initializing with ' + this.filteredSimulations.length + ' simulations');
        this.setupEventListeners();
        this.renderGallery();
        this.showResumeOption();
    }
    
    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('sim-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
    }
    
    handleSearch(query) {
        const q = query.toLowerCase();
        this.filteredSimulations = SIMULATIONS.filter(sim =>
            sim.title.toLowerCase().includes(q) ||
            sim.description.toLowerCase().includes(q) ||
            (sim.tags && sim.tags.some(tag => tag.toLowerCase().includes(q)))
        );
        this.renderGallery();
    }
    renderGallery() {
    console.log('[GALLERY] Gallery is now a landing page');
    // Gallery rendering is now handled by index.html hero section
    // This function is kept for compatibility
}
    
        
        const sections = {};
        
        // Group by category
        this.filteredSimulations.forEach(sim => {
            if (!sections[sim.category]) {
                sections[sim.category] = [];
            }
            sections[sim.category].push(sim);
        });
        
        const galleryView = document.getElementById('gallery-view');
        if (!galleryView) {
            console.error('[GALLERY] gallery-view not found');
            return;
        }
        
        let html = '';
        
        Object.entries(sections).forEach(([category, sims]) => {
            html += `
                <section class="category-section">
                    <div class="category-header">
                        <div class="category-badge">${this.getCategoryEmoji(category)}</div>
                        <div class="category-info">
                            <h2>${category}</h2>
                            <p>${sims.length} interactive simulations</p>
                        </div>
                    </div>
                    <div class="simulations-grid">
                        ${sims.map(sim => this.createSimulationCard(sim)).join('')}
                    </div>
                </section>
            `;
        });
        
        // Set gallery content
        galleryView.innerHTML = html;
        
        console.log('[GALLERY] Gallery rendered successfully');
    }
    
    createSimulationCard(sim) {
        const isFavorite = window.userPrefs?.preferences?.favorites?.includes(sim.id);
        const shares = window.shareSystem?.getShareCount(sim.id) || 0;
        
        return `
            <div class="sim-card" onclick="window.gallery.openSimulation('${sim.id}')">
                <div class="sim-card-header">
                    <div class="sim-card-icon">${sim.icon}</div>
                    <button class="btn-favorite" onclick="event.stopPropagation(); window.gallery.toggleFavorite('${sim.id}', this)">
                        ${isFavorite ? '❤️' : '🤍'}
                    </button>
                </div>
                <div class="sim-card-title">${sim.title}</div>
                <div class="sim-card-description">${sim.description}</div>
                <div class="sim-card-footer">
                    <span class="sim-difficulty difficulty-${sim.difficulty.toLowerCase()}">${sim.difficulty}</span>
                    <span class="sim-time">${sim.estimatedTime}</span>
                </div>
                <div class="sim-card-stats">
                    <span>⭐ ${shares} shared</span>
                </div>
            </div>
        `;
    }
    
    getCategoryEmoji(category) {
        const emojis = {
            'Physics': '⚛️',
            'Biology': '🧬',
            'Geography': '🌍',
            'Astronomy': '🌌'
        };
        return emojis[category] || '🔬';
    }
    
    toggleFavorite(simId, button) {
        if (!window.userPrefs) {
            console.warn('[GALLERY] userPrefs not available');
            return;
        }
        
        const sim = SIMULATIONS.find(s => s.id === simId);
        if (!sim) {
            console.warn('[GALLERY] Simulation not found:', simId);
            return;
        }
        
        if (window.userPrefs.isFavorite(simId)) {
            window.userPrefs.removeFavorite(simId);
            button.textContent = '🤍';
        } else {
            window.userPrefs.addFavorite(simId);
            button.textContent = '❤️';
            
            if (window.haptic) window.haptic.success();
            if (window.UIPolish) window.UIPolish.showSuccess('Added to favorites!');
        }
    }
    
    openSimulation(simId) {
        console.log('[GALLERY] Opening simulation:', simId);
        
        const sim = SIMULATIONS.find(s => s.id === simId);
        if (!sim) {
            console.error('[GALLERY] Simulation not found:', simId);
            return;
        }
        
        // Track view
        if (window.userPrefs) {
            window.userPrefs.recordSimulationView(simId, 0);
        }
        
        // Show simulation view
        const simView = document.getElementById('simulation-view');
        const galleryView = document.getElementById('gallery-view');
        
        if (simView && galleryView) {
            galleryView.classList.remove('active');
            simView.classList.add('active');
            
            // Update simulation content
            this.renderSimulation(sim);
            
            // Start monitoring
            if (window.statsMonitor) {
                window.statsMonitor.start();
            }
            
            if (window.UIPolish) {
                window.UIPolish.showSuccess('Loading: ' + sim.title);
            }
        }
    }
    
    renderSimulation(sim) {
        // Update header
        const titleEl = document.getElementById('sim-title');
        const categoryEl = document.getElementById('sim-category');
        
        if (titleEl) titleEl.textContent = sim.title;
        if (categoryEl) categoryEl.textContent = sim.category;
        
        // Update description
        const descEl = document.getElementById('sim-description');
        if (descEl) {
            descEl.textContent = sim.longDescription;
        }
        
        // Update info panel if exists
        if (window.simInfo) {
            window.simInfo.updatePanel(sim.title, sim.category, sim.difficulty);
        }
        
        // Load p5.js sketch
        this.loadSketch(sim.id);
    }
    
    loadSketch(sketchId) {
        const container = document.getElementById('simulation-canvas');
        if (!container) {
            console.error('[GALLERY] simulation-canvas not found');
            return;
        }
        
        container.innerHTML = '<div class="sketch-loading">Loading simulation...</div>';
        
        console.log('[GALLERY] Loading sketch:', sketchId);
        
        // Create and load script
        const script = document.createElement('script');
        script.src = 'sketches/' + sketchId + '.js';
        
        script.onload = () => {
            console.log('[GALLERY] Sketch loaded:', sketchId);
            if (window.initSketch) {
                window.initSketch({ containerId: 'simulation-canvas' });
            }
        };
        
        script.onerror = () => {
            console.error('[GALLERY] Failed to load sketch:', sketchId);
            container.innerHTML = '<div class="sketch-error">Simulation not found</div>';
            if (window.UIPolish) {
                window.UIPolish.showError('Failed to load simulation');
            }
        };
        
        document.body.appendChild(script);
    }
    
    backToGallery() {
        console.log('[GALLERY] Back to gallery');
        
        const simView = document.getElementById('simulation-view');
        const galleryView = document.getElementById('gallery-view');
        
        if (simView && galleryView) {
            simView.classList.remove('active');
            galleryView.classList.add('active');
            
            // Stop monitoring
            if (window.statsMonitor) {
                window.statsMonitor.stop();
            }
        }
    }
    
    showResumeOption() {
        const lastSimId = window.userPrefs?.preferences?.lastSimulation;
        if (!lastSimId) return;
        
        const sim = SIMULATIONS.find(s => s.id === lastSimId);
        if (!sim) return;
        
        console.log('[GALLERY] Showing resume option for:', sim.title);
        
        const banner = document.createElement('div');
        banner.className = 'resume-banner';
        banner.innerHTML = `
            <div class="resume-content">
                <div class="resume-icon">▶️</div>
                <div class="resume-text">
                    <div class="resume-label">Continue Learning</div>
                    <div class="resume-sim">${sim.title}</div>
                </div>
                <button class="btn-resume">Resume</button>
                <button class="btn-dismiss">×</button>
            </div>
        `;
        
        banner.querySelector('.btn-resume').addEventListener('click', () => {
            this.openSimulation(sim.id);
        });
        
        banner.querySelector('.btn-dismiss').addEventListener('click', () => {
            banner.remove();
        });
        
        const galleryView = document.getElementById('gallery-view');
        if (galleryView) {
            galleryView.insertBefore(banner, galleryView.firstChild);
        }
    }
}

// Initialize when everything is ready
function initGallery() {
    console.log('[GALLERY] Init function called');
    console.log('[GALLERY] SIMULATIONS defined?', typeof SIMULATIONS !== 'undefined');
    console.log('[GALLERY] Gallery class exists?', typeof Gallery !== 'undefined');
    
    if (typeof SIMULATIONS === 'undefined') {
        console.error('[GALLERY] SIMULATIONS not defined! Check simulations-data.js loaded');
        setTimeout(initGallery, 100); // Retry
        return;
    }
    
    if (!window.gallery) {
        window.gallery = new Gallery();
        console.log('[GALLERY] Gallery instance created');
    }
}

// Wait for DOM and other systems
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGallery);
} else {
    initGallery();
}

// Also try after a small delay to ensure everything loaded
setTimeout(initGallery, 500);