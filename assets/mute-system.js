// ===== AUDIO MUTE SYSTEM =====
// Allows users to mute VISIQ audio without muting browser

class MuteSystem {
    constructor() {
        this.isMuted = this.loadMuteState();
        this.button = document.getElementById('mute-button');
        this.originalVolume = 1.0;
        this.initialize();
    }
    
    initialize() {
        if (!this.button) {
            console.warn('[MUTE] Button not found');
            return;
        }
        
        // Setup button click
        this.button.addEventListener('click', () => this.toggleMute());
        
        // Apply saved state
        this.updateUI();
        
        console.log('[MUTE] System initialized. Muted: ' + this.isMuted);
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.saveMuteState();
        this.updateUI();
        this.applyMute();
    }
    
    updateUI() {
        if (!this.button) return;
        
        if (this.isMuted) {
            this.button.textContent = '🔇';
            this.button.classList.add('muted');
            this.button.title = 'Audio is muted. Click to unmute.';
        } else {
            this.button.textContent = '🔊';
            this.button.classList.remove('muted');
            this.button.title = 'Audio is on. Click to mute.';
        }
    }
    
    applyMute() {
        // Mute soundManager if it exists
        if (window.soundManager) {
            if (this.isMuted) {
                this.muteAudio();
            } else {
                this.unmuteAudio();
            }
        }
    }
    
    muteAudio() {
        if (!window.soundManager) return;
        
        // Reduce master volume to 0
        if (window.soundManager.masterGain) {
            this.originalVolume = window.soundManager.masterGain.gain.value;
            window.soundManager.masterGain.gain.value = 0;
        }
        
        console.log('[MUTE] Audio muted');
    }
    
    unmuteAudio() {
        if (!window.soundManager) return;
        
        // Restore volume
        if (window.soundManager.masterGain) {
            window.soundManager.masterGain.gain.value = this.originalVolume || 0.5;
        }
        
        console.log('[MUTE] Audio unmuted');
    }
    
    saveMuteState() {
        localStorage.setItem('visiq_audio_muted', this.isMuted);
    }
    
    loadMuteState() {
        const saved = localStorage.getItem('visiq_audio_muted');
        return saved === 'true';
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.muteSystem = new MuteSystem();
    });
} else {
    window.muteSystem = new MuteSystem();
}