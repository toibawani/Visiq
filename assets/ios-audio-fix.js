// ===== iOS AUDIO CONTEXT FIX =====
// Handles AudioContext suspension on iOS Safari when tab loses focus
// Shows user prompt to resume if needed

class iOSAudioFix {
    constructor() {
        this.audioContext = null;
        this.isSuspended = false;
        this.promptShown = false;
        this.initialize();
    }
    
    initialize() {
        // Find existing audio context from soundManager
        if (window.soundManager && window.soundManager.audioContext) {
            this.audioContext = window.soundManager.audioContext;
            console.log('[VISIQ] Using existing audio context from soundManager');
        } else {
            // Create new one if needed
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('[VISIQ] Created new audio context');
            } catch (error) {
                console.warn('[VISIQ] Audio context not supported:', error);
                return;
            }
        }
        
        this.setupListeners();
        this.checkSuspension();
    }
    
    setupListeners() {
        if (!this.audioContext) return;
        
        // Listen for state changes
        this.audioContext.addEventListener('statechange', () => {
            this.handleStateChange();
        });
        
        // Resume on user interaction (iOS requirement)
        ['click', 'touchstart', 'keydown', 'touchend'].forEach(event => {
            document.addEventListener(event, () => this.attemptResume(), { 
                passive: true 
            });
        });
        
        // Check periodically
        setInterval(() => this.checkSuspension(), 2000);
    }
    
    handleStateChange() {
        if (!this.audioContext) return;
        
        const state = this.audioContext.state;
        
        console.log(`[VISIQ] AudioContext state: ${state}`);
        
        if (state === 'suspended') {
            this.isSuspended = true;
            this.showPrompt();
        } else if (state === 'running') {
            this.isSuspended = false;
            this.hidePrompt();
        }
    }
    
    checkSuspension() {
        if (!this.audioContext) return;
        
        if (this.audioContext.state === 'suspended' && !this.isSuspended) {
            this.isSuspended = true;
            this.showPrompt();
        }
    }
    
    attemptResume() {
        if (!this.audioContext || this.audioContext.state !== 'suspended') {
            return;
        }
        
        this.audioContext.resume()
            .then(() => {
                console.log('[VISIQ] AudioContext resumed successfully');
                this.isSuspended = false;
                this.hidePrompt();
            })
            .catch(error => {
                console.warn('[VISIQ] AudioContext resume failed:', error);
            });
    }
    
    showPrompt() {
        if (this.promptShown) return;
        if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) return; // Only on iOS
        
        this.promptShown = true;
        
        // Check if prompt already exists
        if (document.getElementById('audio-unmute-prompt')) {
            return;
        }
        
        const prompt = document.createElement('div');
        prompt.id = 'audio-unmute-prompt';
        prompt.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            background: rgba(26, 26, 62, 0.98);
            border: 2px solid rgba(255, 0, 110, 0.6);
            border-radius: 8px;
            padding: 14px 18px;
            color: rgba(245, 245, 247, 0.95);
            font-family: 'Space Grotesk', sans-serif;
            font-size: 13px;
            z-index: 900;
            backdrop-filter: blur(20px);
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            max-width: 250px;
        `;
        
        prompt.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 10px;">
                <span style="font-size: 18px;">🔇</span>
                <div>
                    <p style="margin: 0 0 5px 0; font-weight: 600;">Audio Suspended</p>
                    <p style="margin: 0; font-size: 12px; opacity: 0.8;">Tap anywhere to resume simulation audio</p>
                </div>
            </div>
        `;
        
        // Add animation styles
        if (!document.getElementById('audio-prompt-styles')) {
            const style = document.createElement('style');
            style.id = 'audio-prompt-styles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(prompt);
        console.log('[VISIQ] Audio unmute prompt shown');
    }
    
    hidePrompt() {
        if (!this.promptShown) return;
        
        const prompt = document.getElementById('audio-unmute-prompt');
        if (!prompt) return;
        
        prompt.style.animation = 'slideIn 0.3s ease-out reverse';
        
        setTimeout(() => {
            if (prompt.parentNode) {
                prompt.parentNode.removeChild(prompt);
            }
            this.promptShown = false;
            console.log('[VISIQ] Audio unmute prompt hidden');
        }, 300);
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.iOSAudioFix = new iOSAudioFix();
    });
} else {
    window.iOSAudioFix = new iOSAudioFix();
}