// ===== FOCUS MODE =====
// Hide UI for distraction-free simulation viewing

class FocusMode {
    constructor() {
        this.isFocused = false;
        this.initialize();
    }
    
    initialize() {
        this.setupToggle();
        console.log('[FOCUS-MODE] Initialized');
    }
    
    setupToggle() {
        const btn = document.getElementById('focus-button');
        if (btn) {
            btn.addEventListener('click', () => this.toggleFocusMode());
        }
    }
    
    toggleFocusMode() {
        this.isFocused = !this.isFocused;
        
        if (this.isFocused) {
            this.enterFocusMode();
        } else {
            this.exitFocusMode();
        }
    }
    
    enterFocusMode() {
        console.log('[FOCUS-MODE] Entering focus mode');
        
        // Hide navbar
        const navbar = document.querySelector('.navbar');
        if (navbar) navbar.style.display = 'none';
        
        // Hide controls
        const controls = document.querySelector('.controls-wrapper');
        if (controls) controls.style.display = 'none';
        
        // Hide info panel
        const info = document.querySelector('.sim-info-panel');
        if (info) info.style.display = 'none';
        
        // Hide header
        const header = document.querySelector('.sim-header');
        if (header) header.style.display = 'none';
        
        // Expand canvas
        const container = document.querySelector('.sim-container');
        if (container) {
            container.style.gridTemplateColumns = '1fr';
            container.style.marginTop = '0';
        }
        
        // Add fullscreen class
        document.body.classList.add('focus-mode-active');
    }
    
    exitFocusMode() {
        console.log('[FOCUS-MODE] Exiting focus mode');
        
        // Show navbar
        const navbar = document.querySelector('.navbar');
        if (navbar) navbar.style.display = '';
        
        // Show controls
        const controls = document.querySelector('.controls-wrapper');
        if (controls) controls.style.display = '';
        
        // Show info panel
        const info = document.querySelector('.sim-info-panel');
        if (info) info.style.display = '';
        
        // Show header
        const header = document.querySelector('.sim-header');
        if (header) header.style.display = '';
        
        // Reset container
        const container = document.querySelector('.sim-container');
        if (container) {
            container.style.gridTemplateColumns = '1fr 300px';
            container.style.marginTop = '60px';
        }
        
        // Remove fullscreen class
        document.body.classList.remove('focus-mode-active');
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.focusMode = new FocusMode();
    });
} else {
    window.focusMode = new FocusMode();
}