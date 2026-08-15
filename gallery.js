// ===== GALLERY SYSTEM =====
// Main simulation gallery interface

class Gallery {
    constructor() {
        this.currentFilter = 'all';
        this.currentSort = 'popular';
        this.filteredSimulations = [...SIMULATIONS];
        this.initialize();
    }
    
    initialize() {
        this.setupEventListeners();
        this.renderGallery();
        this.showResumeOption();
        console.log('[GALLERY] Initialized with ' + SIMULATIONS.length + ' simulations');
    }
    
    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('sim-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
        
        // Category filters
        document.querySelectorAll('[data-category]').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterByCategory(e.target.dataset.category));
        });
        
        // Difficulty filters
        document.querySelectorAll('[data-difficulty]').forEach(btn => {
            btn.addEventListener('btn', (e) => this.filterByDifficulty(e.target.dataset.difficulty));
        });
    }
    
    handleSearch(query) {
        const q = query.toLowerCase();
        this.filteredSimulations = SIMULATIONS.filter(sim =>
            sim.title.toLowerCase().includes(q) ||
            sim.description.toLowerCase().includes(q) ||
            sim.tags.some(tag => tag.toLowerCase().includes(q))
        );
        this.renderGallery();
    }
    
    filterByCategory(category) {
        this.currentFilter = category;
        
        if (category === 'all') {
            this.filteredSimulations = [...SIMULATIONS];
        } else {
            this.filteredSimulations = SIMULATIONS.filter(sim => sim.category === category);
        }
        
        this.renderGallery();
    }
    
    filterByDifficulty(difficulty) {
        this.filteredSimulations = SIMULATIONS.filter(sim => sim.difficulty === difficulty);
        this.renderGallery();
    }
    
    sortSimulations() {
        switch(this.currentSort) {
            case 'popular':
                this.filteredSimulations.sort((a, b) => 
                    (window.shareSystem?.getShareCount(b.id) || 0) - 
                    (window.shareSystem?.getShareCount(a.id) || 0)
                );
                break;
            case 'difficulty':
                const diffOrder = { 'Beginner': 0, 'Intermediate': 1, 'Advanced': 2 };
                this.filteredSimulations.sort((a, b) => 
                    diffOrder[a.difficulty] - diffOrder[b.difficulty]
                );
                break;
        }
    }
    
    renderGallery() {
        this.sortSimulations();
        
        const sections = {};
        
        // Group by category
        this.filteredSimulations.forEach(sim => {
            if (!sections[sim.category]) {
                sections[sim.category] = [];
            }
            sections[sim.category].push(sim);
        });
        
        const galleryView = document.getElementById('gallery-view');
        if (!galleryView) return;
        
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
        
        // Replace gallery content
        const galleryContent = galleryView.querySelector('.gallery-content') || galleryView;
        galleryContent.innerHTML = html;
    }
    
    createSimulationCard(sim) {
        const isFavorite = window.userPrefs?.preferences.favorites.includes(sim.id);
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
        if (!window.userPrefs) return;
        
        const sim = SIMULATIONS.find(s => s.id === simId);
        if (!sim) return;
        
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
        const sim = SIMULATIONS.find(s => s.id === simId);
        if (!sim) return;
        
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
        document.getElementById('sim-title').textContent = sim.title;
        document.getElementById('sim-category').textContent = sim.category;
        
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
        if (!container) return;
        
        container.innerHTML = '';
        
        // Check if sketch exists
        const scriptPath = `sketches/${sketchId}.js`;
        
        // Create script loader
        const script = document.createElement('script');
        script.src = scriptPath;
        script.onload = () => {
            if (window.initSketch) {
                window.initSketch({ container });
            }
        };
        script.onerror = () => {
            container.innerHTML = '<div class="sketch-error">Simulation not found</div>';
            if (window.UIPolish) {
                window.UIPolish.showError('Failed to load simulation');
            }
        };
        
        document.body.appendChild(script);
    }
    
    backToGallery() {
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
        const lastSimId = window.userPrefs?.preferences.lastSimulation;
        if (!lastSimId) return;
        
        const sim = SIMULATIONS.find(s => s.id === lastSimId);
        if (!sim) return;
        
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

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.gallery = new Gallery();
    });
} else {
    window.gallery = new Gallery();
}