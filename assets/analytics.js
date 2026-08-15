// ===== ANALYTICS & TELEMETRY =====
// Track usage patterns (privacy-first)

class Analytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.events = [];
        this.initialize();
    }
    
    initialize() {
        this.trackSessionStart();
        this.setupEventTracking();
        console.log('[ANALYTICS] Initialized - Session: ' + this.sessionId);
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    trackSessionStart() {
        this.trackEvent('session_start', {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            language: navigator.language
        });
    }
    
    setupEventTracking() {
        // Track simulation opens
        const originalOpen = window.gallery?.openSimulation;
        if (originalOpen) {
            window.gallery.openSimulation = function(simId) {
                window.analytics?.trackEvent('simulation_open', { simId });
                return originalOpen.call(this, simId);
            };
        }
        
        // Track favorites
        const originalFav = window.gallery?.toggleFavorite;
        if (originalFav) {
            window.gallery.toggleFavorite = function(simId, btn) {
                const isFav = btn.textContent.includes('❤️');
                window.analytics?.trackEvent(
                    isFav ? 'favorite_removed' : 'favorite_added',
                    { simId }
                );
                return originalFav.call(this, simId, btn);
            };
        }
        
        // Track achievements
        const originalUnlock = window.achievements?.unlockAchievement;
        if (originalUnlock) {
            window.achievements.unlockAchievement = function(achievement) {
                window.analytics?.trackEvent('achievement_unlocked', {
                    achievementId: achievement.id
                });
                return originalUnlock.call(this, achievement);
            };
        }
    }
    
    trackEvent(eventName, data = {}) {
        const event = {
            name: eventName,
            timestamp: Date.now(),
            data: data,
            sessionId: this.sessionId
        };
        
        this.events.push(event);
        
        // Keep only last 100 events in memory
        if (this.events.length > 100) {
            this.events.shift();
        }
        
        // Periodically save to localStorage
        if (this.events.length % 10 === 0) {
            this.saveEvents();
        }
    }
    
    saveEvents() {
        try {
            const saved = localStorage.getItem('visiq_events') || '[]';
            const allEvents = JSON.parse(saved);
            const combined = [...allEvents, ...this.events].slice(-1000);
            localStorage.setItem('visiq_events', JSON.stringify(combined));
        } catch (e) {
            // Silent fail if storage is full
        }
    }
    
    trackTiming(label, duration) {
        this.trackEvent('timing', {
            label,
            duration: Math.round(duration)
        });
    }
    
    trackError(errorMessage) {
        this.trackEvent('error', {
            message: errorMessage,
            url: window.location.href
        });
    }
    
    // Get session summary
    getSessionSummary() {
        return {
            sessionId: this.sessionId,
            eventCount: this.events.length,
            startTime: this.events[0]?.timestamp,
            endTime: this.events[this.events.length - 1]?.timestamp,
            duration: (this.events[this.events.length - 1]?.timestamp - this.events[0]?.timestamp) / 1000
        };
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.analytics = new Analytics();
    });
} else {
    window.analytics = new Analytics();
}