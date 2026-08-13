// ===== GESTURE SUPPORT SYSTEM =====
// Swipe and pinch gestures for mobile

class GestureSupport {
    constructor() {
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.initialDistance = 0;
        this.initialize();
    }
    
    initialize() {
        // Swipe detection
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), false);
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), false);
        
        // Pinch detection
        document.addEventListener('touchmove', (e) => this.handlePinch(e), false);
        
        console.log('[GESTURE] System initialized');
    }
    
    handleTouchStart(e) {
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
        
        // Store initial distance for pinch
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            this.initialDistance = Math.hypot(dx, dy);
        }
    }
    
    handleTouchEnd(e) {
        this.touchEndX = e.changedTouches[0].screenX;
        this.touchEndY = e.changedTouches[0].screenY;
        
        this.handleSwipe();
    }
    
    handleSwipe() {
        const diffX = this.touchEndX - this.touchStartX;
        const diffY = this.touchEndY - this.touchStartY;
        
        // Only register horizontal swipes
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            if (diffX > 0) {
                // Swipe right - go back
                this.swipeRight();
            }
        }
    }
    
    handlePinch(e) {
        if (e.touches.length !== 2) return;
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        const currentDistance = Math.hypot(dx, dy);
        
        if (this.initialDistance === 0) return;
        
        const scale = currentDistance / this.initialDistance;
        
        // Zoom in with pinch
        if (scale > 1.1 && e.target.closest('#simulation-canvas')) {
            this.zoomIn();
        }
        // Zoom out with reverse pinch
        else if (scale < 0.9 && e.target.closest('#simulation-canvas')) {
            this.zoomOut();
        }
    }
    
    swipeRight() {
        const backBtn = document.querySelector('.btn-back');
        if (backBtn && this.isSimulationOpen()) {
            backBtn.click();
            if (window.haptic) {
                window.haptic.medium();
            }
        }
    }
    
    zoomIn() {
        // Store zoom level in canvas
        const canvas = document.querySelector('#simulation-canvas');
        if (canvas) {
            canvas.style.transform = 'scale(1.1)';
        }
    }
    
    zoomOut() {
        const canvas = document.querySelector('#simulation-canvas');
        if (canvas) {
            canvas.style.transform = 'scale(1)';
        }
    }
    
    isSimulationOpen() {
        const simView = document.getElementById('simulation-view');
        return simView && simView.classList.contains('active');
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.gestures = new GestureSupport();
    });
} else {
    window.gestures = new GestureSupport();
}