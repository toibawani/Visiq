// ===== KEYBOARD SHORTCUTS SYSTEM =====
// Power user controls for simulations

class KeyboardShortcuts {
    constructor() {
        this.shortcuts = {
            'r': 'reset',
            'f': 'fullscreen',
            'm': 'mute',
            's': 'screenshot',
            'escape': 'exit-fullscreen',
            'h': 'show-help'
        };
        
        this.initialize();
    }
    
    initialize() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        console.log('[SHORTCUTS] System initialized');
    }
    
    handleKeyPress(e) {
        // Don't trigger shortcuts if user is typing in input
        if (e.target.matches('input, textarea')) {
            return;
        }
        
        const key = e.key.toLowerCase();
        
        switch(key) {
            case 'r':
                this.resetSimulation();
                break;
            case 'f':
                this.toggleFullscreen();
                break;
            case 'm':
                this.toggleMute();
                break;
            case 's':
                this.takeScreenshot();
                break;
            case 'escape':
                this.handleEscape();
                break;
            case 'h':
                this.showHelp();
                break;
        }
    }
    
    resetSimulation() {
        const resetBtn = document.getElementById('reset-button');
        if (resetBtn && this.isSimulationOpen()) {
            resetBtn.click();
            this.showShortcutFeedback('Reset (R)');
        }
    }
    
    toggleFullscreen() {
        const fsBtn = document.getElementById('fullscreen-button');
        if (fsBtn && this.isSimulationOpen()) {
            fsBtn.click();
            this.showShortcutFeedback('Fullscreen (F)');
        }
    }
    
    toggleMute() {
        const muteBtn = document.getElementById('mute-button');
        if (muteBtn) {
            muteBtn.click();
            this.showShortcutFeedback('Mute (M)');
        }
    }
    
    takeScreenshot() {
        const screenBtn = document.getElementById('screenshot-button');
        if (screenBtn && this.isSimulationOpen()) {
            screenBtn.click();
            this.showShortcutFeedback('Screenshot (S)');
        }
    }
    
    handleEscape() {
        // Only if fullscreen is active
        if (document.body.classList.contains('fullscreen-mode')) {
            if (window.fullscreenSystem) {
                window.fullscreenSystem.exitFullscreen();
            }
        }
    }
    
    showHelp() {
        this.showShortcutHelp();
    }
    
    isSimulationOpen() {
        const simView = document.getElementById('simulation-view');
        return simView && simView.classList.contains('active');
    }
    
    showShortcutFeedback(action) {
        if (window.UIPolish) {
            window.UIPolish.showInfo(action, 1000);
        }
    }
    
    showShortcutHelp() {
        const helpText = `
Keyboard Shortcuts:
R - Reset simulation
F - Toggle fullscreen
M - Mute/Unmute
S - Take screenshot
H - Show this help
ESC - Exit fullscreen
        `;
        
        alert(helpText);
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.keyboardShortcuts = new KeyboardShortcuts();
    });
} else {
    window.keyboardShortcuts = new KeyboardShortcuts();
}