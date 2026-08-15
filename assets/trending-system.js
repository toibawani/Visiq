// ===== TRENDING SYSTEM =====
// Shows popular and trending simulations

class TrendingSystem {
    constructor() {
        this.initialize();
    }
    
    initialize() {
        setTimeout(() => this.showTrendingSimulations(), 500);
        console.log('[TRENDING] System initialized');
    }
    
    showTrendingSimulations() {
        const trendingGrid = document.getElementById('trending-grid');
        if (!trendingGrid) return;
        
        const trending = this.getTrendingSimulations();
        
        if (trending.length === 0) {
            document.getElementById('trending-section').style.display = 'none';
            return;
        }
        
        trendingGrid.innerHTML = '';
        
        trending.forEach((sim, index) => {
            const card = document.createElement('div');
            card.className = 'trending-card';
            card.innerHTML = `
                <div class="trending-rank">#${index + 1}</div>
                <div class="sim-card" onclick="openSimulation('${sim.name}')">
                    <div class="sim-card-icon">${sim.icon}</div>
                    <div class="sim-card-title">${sim.name}</div>
                    <div class="sim-card-description">${sim.description}</div>
                    <div class="trending-stats">
                        <span class="trending-stat">❤️ ${this.getLikeCount(sim.name)}</span>
                        <span class="trending-stat">📤 ${this.getShareCount(sim.name)}</span>
                    </div>
                </div>
            `;
            trendingGrid.appendChild(card);
        });
    }
    
    getTrendingSimulations() {
        if (!window.shareSystem) return [];
        
        const trending = window.shareSystem.getTrendingSimulations();
        
        return SIMULATIONS
            .filter(sim => trending.some(t => t.name === sim.name) || Math.random() > 0.3)
            .sort((a, b) => {
                const aScore = this.getScore(a.name);
                const bScore = this.getScore(b.name);
                return bScore - aScore;
            })
            .slice(0, 4);
    }
    
    getScore(simName) {
        if (!window.shareSystem) return 0;
        
        const shares = window.shareSystem.getShareCount(simName);
        const likes = window.shareSystem.getLikeCount(simName);
        const favorites = window.userPrefs.preferences.favorites.includes(simName) ? 2 : 0;
        
        return shares + (likes * 0.5) + favorites;
    }
    
    getLikeCount(simName) {
        return window.shareSystem ? window.shareSystem.getLikeCount(simName) : 0;
    }
    
    getShareCount(simName) {
        return window.shareSystem ? window.shareSystem.getShareCount(simName) : 0;
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.trendingSystem = new TrendingSystem();
    });
} else {
    window.trendingSystem = new TrendingSystem();
}