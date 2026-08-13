// ===== USER PREFERENCES SYSTEM =====
// Persistent user settings and customization

class UserPreferences {
    constructor() {
        this.userId = this.getCurrentUserId();
        this.preferences = this.loadPreferences();
        this.initialize();
    }
    
    initialize() {
        this.applyPreferences();
        this.setupListeners();
        console.log('[PREFS] Preferences loaded for user:', this.userId);
    }
    
    getCurrentUserId() {
        const session = localStorage.getItem('visiq_user_email');
        return session || 'guest';
    }
    
    loadPreferences() {
        const saved = localStorage.getItem(`prefs_${this.userId}`);
        
        return saved ? JSON.parse(saved) : {
            audioVolume: 0.5,
            audioEnabled: true,
            theme: 'dark',
            notifications: true,
            simulationSpeed: 1.0,
            favorites: [],
            lastSimulation: null,
            viewCount: 0,
            totalPlayTime: 0,
            showTips: true
        };
    }
    
    savePreferences() {
        localStorage.setItem(`prefs_${this.userId}`, JSON.stringify(this.preferences));
        console.log('[PREFS] Preferences saved');
    }
    
    applyPreferences() {
        // Apply theme
        if (this.preferences.theme === 'dark') {
            document.body.classList.add('theme-dark');
        }
        
        // Apply audio volume
        if (window.soundManager && window.soundManager.masterGain) {
            window.soundManager.masterGain.gain.value = this.preferences.audioEnabled ? 
                this.preferences.audioVolume : 0;
        }
    }
    
    // Audio preferences
    setAudioVolume(volume) {
        this.preferences.audioVolume = Math.max(0, Math.min(1, volume));
        
        if (window.soundManager && window.soundManager.masterGain) {
            window.soundManager.masterGain.gain.value = this.preferences.audioEnabled ? 
                this.preferences.audioVolume : 0;
        }
        
        this.savePreferences();
    }
    
    setAudioEnabled(enabled) {
        this.preferences.audioEnabled = enabled;
        
        if (window.soundManager && window.soundManager.masterGain) {
            window.soundManager.masterGain.gain.value = enabled ? 
                this.preferences.audioVolume : 0;
        }
        
        this.savePreferences();
    }
    
    // Favorites
    addFavorite(simulationName) {
        if (!this.preferences.favorites.includes(simulationName)) {
            this.preferences.favorites.push(simulationName);
            this.savePreferences();
            return true;
        }
        return false;
    }
    
    removeFavorite(simulationName) {
        this.preferences.favorites = this.preferences.favorites.filter(
            sim => sim !== simulationName
        );
        this.savePreferences();
    }
    
    isFavorite(simulationName) {
        return this.preferences.favorites.includes(simulationName);
    }
    
    getFavorites() {
        return this.preferences.favorites;
    }
    
    // Simulation tracking
    recordSimulationView(simulationName, playTime) {
        this.preferences.lastSimulation = simulationName;
        this.preferences.viewCount += 1;
        this.preferences.totalPlayTime += playTime;
        this.savePreferences();
    }
    
    getStatistics() {
        return {
            viewCount: this.preferences.viewCount,
            totalPlayTime: this.preferences.totalPlayTime,
            lastSimulation: this.preferences.lastSimulation,
            favoriteCount: this.preferences.favorites.length
        };
    }
    
    // Theme
    setTheme(theme) {
        this.preferences.theme = theme;
        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.add(`theme-${theme}`);
        this.savePreferences();
    }
    
    // Notifications
    setNotifications(enabled) {
        this.preferences.notifications = enabled;
        this.savePreferences();
    }
    
    // Tips
    setShowTips(enabled) {
        this.preferences.showTips = enabled;
        this.savePreferences();
    }
    
    // Export all preferences
    exportPreferences() {
        return JSON.stringify(this.preferences, null, 2);
    }
    
    // Import preferences
    importPreferences(data) {
        try {
            const imported = JSON.parse(data);
            this.preferences = { ...this.preferences, ...imported };
            this.savePreferences();
            this.applyPreferences();
            return true;
        } catch (error) {
            console.error('[PREFS] Import failed:', error);
            return false;
        }
    }
    
    // Reset to defaults
    resetPreferences() {
        this.preferences = {
            audioVolume: 0.5,
            audioEnabled: true,
            theme: 'dark',
            notifications: true,
            simulationSpeed: 1.0,
            favorites: [],
            lastSimulation: null,
            viewCount: 0,
            totalPlayTime: 0,
            showTips: true
        };
        this.savePreferences();
        this.applyPreferences();
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.userPrefs = new UserPreferences();
    });
} else {
    window.userPrefs = new UserPreferences();
}