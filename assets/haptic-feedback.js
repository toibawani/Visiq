// ===== HAPTIC FEEDBACK SYSTEM =====
// Tactile feedback on mobile devices for premium feel

class HapticFeedback {
    constructor() {
        this.isSupported = 'vibrate' in navigator;
        this.initialize();
    }
    
    initialize() {
        if (!this.isSupported) {
            console.log('[HAPTIC] Not supported on this device');
            return;
        }
        
        // Add haptic to all buttons
        this.attachToButtons();
        console.log('[HAPTIC] System initialized');
    }
    
    attachToButtons() {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', () => this.tap());
        });
    }
    
    // Light tap - button clicks
    tap() {
        if (this.isSupported) {
            navigator.vibrate(10);
        }
    }
    
    // Medium feedback - actions
    medium() {
        if (this.isSupported) {
            navigator.vibrate(30);
        }
    }
    
    // Heavy feedback - important actions
    heavy() {
        if (this.isSupported) {
            navigator.vibrate(50);
        }
    }
    
    // Double tap pattern
    doubleTap() {
        if (this.isSupported) {
            navigator.vibrate([15, 50, 15]);
        }
    }
    
    // Success pattern
    success() {
        if (this.isSupported) {
            navigator.vibrate([10, 20, 10, 20, 50]);
        }
    }
    
    // Error pattern
    error() {
        if (this.isSupported) {
            navigator.vibrate([30, 100, 30]);
        }
    }
    
    // Warning pattern
    warning() {
        if (this.isSupported) {
            navigator.vibrate([20, 50, 20, 50, 20]);
        }
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.haptic = new HapticFeedback();
    });
} else {
    window.haptic = new HapticFeedback();
}