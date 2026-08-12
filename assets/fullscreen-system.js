// ===== FULLSCREEN MODE SYSTEM =====
// Allows users to expand simulations for immersive experience

class FullscreenSystem {
    constructor() {
        this.isFullscreen = false;
        this.button = document.getElementById('fullscreen-button');
        this.initialize();
    }
    
    initialize() {
        if (!this.button) {
            console.warn('[FULLSCREEN] Button not found');
            return;
        }
        
        this.button.addEventListener('click', () => this.toggleFullscreen());
        
        // Listen for ESC key to exit fullscreen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                this.exitFullscreen();
            }
        });
        
        console.log('[FULLSCREEN] System initialized');
    }
    
    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }
    
    enterFullscreen() {
        this.isFullscreen = true;
        
        // Add fullscreen class to body
        document.body.classList.add('fullscreen-mode');
        
        // Update button
        this.button.textContent = '⛶ Exit Fullscreen';
        this.button.title = 'Exit fullscreen (Press ESC)';
        
        // Show hint
        this.showHint();
        
        // Hide navbar
        const navbar = document.querySelector('.navbar');
        if (navbar) navbar.style.display = 'none';
        
        // Hide info panel
        const infoPanel = document.querySelector('.sim-info-panel');
        if (infoPanel) infoPanel.style.display = 'none';
        
        // Disable navbar manager on fullscreen
        if (window.navbarManager) {
            window.navbarManager.show();
        }
        
        console.log('[FULLSCREEN] Entered fullscreen mode');
    }
    
    exitFullscreen() {
        this.isFullscreen = false;
        
        // Remove fullscreen class from body
        document.body.classList.remove('fullscreen-mode');
        
        // Update button
        this.button.textContent = '⛶';
        this.button.title = 'Toggle fullscreen';
        
        // Show navbar
        const navbar = document.querySelector('.navbar');
        if (navbar) navbar.style.display = 'flex';
        
        // Show info panel
        const infoPanel = document.querySelector('.sim-info-panel');
        if (infoPanel) infoPanel.style.display = 'block';
        
        // Remove hint
        const hint = document.querySelector('.fullscreen-hint');
        if (hint) hint.remove();
        
        console.log('[FULLSCREEN] Exited fullscreen mode');
    }
    
    showHint() {
        // Remove old hint if exists
        const oldHint = document.querySelector('.fullscreen-hint');
        if (oldHint) oldHint.remove();
        
        // Create new hint
        const hint = document.createElement('div');
        hint.className = 'fullscreen-hint';
        hint.textContent = 'Press ESC to exit fullscreen';
        
        document.body.appendChild(hint);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (hint.parentNode) {
                hint.style.animation = 'slideInLeft 0.3s ease-out reverse';
                setTimeout(() => {
                    if (hint.parentNode) {
                        hint.parentNode.removeChild(hint);
                    }
                }, 300);
            }
        }, 3000);
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.fullscreenSystem = new FullscreenSystem();
    });
} else {
    window.fullscreenSystem = new FullscreenSystem();
}