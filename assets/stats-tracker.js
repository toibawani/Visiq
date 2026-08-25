class StatsTracker {
    constructor() {
        this.stats = this.loadStats();
        this.currentSimulation = null;
        this.setupTracking();
    }
    
    loadStats() {
        const saved = localStorage.getItem('visiq-stats');
        return saved ? JSON.parse(saved) : {
            simulationsViewed: [],
            totalTimeSpent: 0,
            favoriteIds: [],
            favoriteCount: 0,
            sessionsCompleted: 0
        };
    }
    
    saveStats() {
        localStorage.setItem('visiq-stats', JSON.stringify(this.stats));
    }
    
    setupTracking() {
        const originalOpen = window.gallery?.openSimulation;
        if (originalOpen) {
            window.gallery.openSimulation = function(simId) {
                window.statsTracker?.trackSimulationOpen(simId);
                return originalOpen.call(this, simId);
            };
        }
        
        window.addEventListener('beforeunload', () => {
            this.trackSessionEnd();
        });
    }
    
    trackSimulationOpen(simId) {
        this.currentSimulation = simId;
        
        if (!this.stats.simulationsViewed.includes(simId)) {
            this.stats.simulationsViewed.push(simId);
        }
        
        this.saveStats();
    }
    
    trackSessionEnd() {
        if (this.currentSimulation) {
            const elapsed = window.simTimer?.getElapsedTime() || 0;
            this.stats.totalTimeSpent += elapsed;
            this.stats.sessionsCompleted += 1;
            this.saveStats();
        }
    }
    
    addFavorite(simId) {
        if (!this.stats.favoriteIds.includes(simId)) {
            this.stats.favoriteIds.push(simId);
            this.stats.favoriteCount = this.stats.favoriteIds.length;
            this.saveStats();
            return true;
        }
        return false;
    }
    
    removeFavorite(simId) {
        this.stats.favoriteIds = this.stats.favoriteIds.filter(id => id !== simId);
        this.stats.favoriteCount = this.stats.favoriteIds.length;
        this.saveStats();
        return true;
    }
    
    isFavorite(simId) {
        return this.stats.favoriteIds.includes(simId);
    }
    
    getStats() {
        return {
            simulationsViewed: this.stats.simulationsViewed.length,
            totalTimeSpent: this.formatTime(this.stats.totalTimeSpent),
            favorites: this.stats.favoriteCount
        };
    }
    
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.statsTracker = new StatsTracker();
    });
} else {
    window.statsTracker = new StatsTracker();
}