// ===== STATS TRACKER =====
// Track user engagement and learning

class StatsTracker {
    constructor() {
        this.stats = this.loadStats();
        this.currentSimulation = null;
        this.setupTracking();
        console.log('[STATS-TRACKER] Initialized');
    }
    
    loadStats() {
        const saved = localStorage.getItem('visiq-stats');
        return saved ? JSON.parse(saved) : {
            simulationsViewed: [],
            totalTimeSpent: 0,
            favoriteCount: 0,
            sessionsCompleted: 0
        };
    }
    
    saveStats() {
        localStorage.setItem('visiq-stats', JSON.stringify(this.stats));
    }
    
    setupTracking() {
        // Track simulation opens
        const originalOpen = window.gallery?.openSimulation;
        if (originalOpen) {
            window.gallery.openSimulation = function(simId) {
                window.statsTracker?.trackSimulationOpen(simId);
                return originalOpen.call(this, simId);
            };
        }
        
        // Track session close
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
    
    getStats() {
        return {
            ...this.stats,
            simulationsViewed: this.stats.simulationsViewed.length,
            totalTimeSpent: this.formatTime(this.stats.totalTimeSpent)
        };
    }
    
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.statsTracker = new StatsTracker();
    });
} else {
    window.statsTracker = new StatsTracker();
}