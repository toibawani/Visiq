// ===== RESPONSIVE SYSTEM =====
// Perfect mobile, tablet, and desktop experiences

class ResponsiveSystem {
    constructor() {
        this.currentBreakpoint = this.detectBreakpoint();
        this.initialize();
    }
    
    initialize() {
        this.setupMediaQueries();
        this.setupTouchOptimizations();
        this.setupViewportHandler();
        console.log('[RESPONSIVE] System initialized at ' + this.currentBreakpoint);
    }
    
    detectBreakpoint() {
        const width = window.innerWidth;
        if (width < 480) return 'mobile-sm';
        if (width < 768) return 'mobile';
        if (width < 1024) return 'tablet';
        if (width < 1440) return 'desktop';
        return 'desktop-xl';
    }
    
    setupMediaQueries() {
        // Mobile-specific optimizations
        const mobileQuery = window.matchMedia('(max-width: 768px)');
        mobileQuery.addListener((e) => {
            if (e.matches) {
                this.applyMobileOptimizations();
            } else {
                this.applyDesktopOptimizations();
            }
        });
        
        if (mobileQuery.matches) {
            this.applyMobileOptimizations();
        }
    }
    
    applyMobileOptimizations() {
        // Adjust touch targets
        document.querySelectorAll('button').forEach(btn => {
            btn.style.minHeight = '48px';
            btn.style.minWidth = '48px';
        });
        
        // Hide desktop-only elements
        document.querySelectorAll('.desktop-only').forEach(el => {
            el.style.display = 'none';
        });
        
        // Adjust modal sizes
        document.querySelectorAll('.stats-modal').forEach(modal => {
            modal.style.width = '90vw';
            modal.style.maxHeight = '80vh';
        });
        
        // Optimize navbar
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.style.padding = '0 15px';
            navbar.style.height = '50px';
        }
        
        console.log('[RESPONSIVE] Mobile optimizations applied');
    }
    
    applyDesktopOptimizations() {
        // Show desktop elements
        document.querySelectorAll('.desktop-only').forEach(el => {
            el.style.display = '';
        });
        
        // Restore optimal spacing
        document.querySelectorAll('button').forEach(btn => {
            btn.style.minHeight = '';
            btn.style.minWidth = '';
        });
        
        console.log('[RESPONSIVE] Desktop optimizations applied');
    }
    
    setupTouchOptimizations() {
        // Detect touch device
        const isTouchDevice = () => {
            return (('ontouchstart' in window) ||
                    (navigator.maxTouchPoints > 0) ||
                    (navigator.msMaxTouchPoints > 0));
        };
        
        if (isTouchDevice()) {
            document.body.classList.add('touch-device');
            
            // Increase touch target sizes
            const style = document.createElement('style');
            style.textContent = `
                .touch-device button {
                    min-height: 48px;
                    min-width: 48px;
                }
                
                .touch-device input,
                .touch-device select,
                .touch-device textarea {
                    min-height: 44px;
                    font-size: 16px;
                }
                
                .touch-device .sim-card {
                    margin-bottom: 8px;
                }
            `;
            document.head.appendChild(style);
            
            console.log('[RESPONSIVE] Touch optimizations applied');
        }
    }
    
    setupViewportHandler() {
        // Handle viewport changes
        window.addEventListener('resize', () => {
            const newBreakpoint = this.detectBreakpoint();
            if (newBreakpoint !== this.currentBreakpoint) {
                this.currentBreakpoint = newBreakpoint;
                this.handleBreakpointChange();
            }
        });
        
        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
    }
    
    handleBreakpointChange() {
        // Reflow layout if needed
        const event = new CustomEvent('breakpointchange', {
            detail: { breakpoint: this.currentBreakpoint }
        });
        window.dispatchEvent(event);
        
        console.log('[RESPONSIVE] Breakpoint changed to ' + this.currentBreakpoint);
    }
    
    handleOrientationChange() {
        // Reset canvas sizes
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            }
        });
        
        // Reflow layout
        window.dispatchEvent(new Event('resize'));
    }
    
    // Get current breakpoint
    getBreakpoint() {
        return this.currentBreakpoint;
    }
    
    // Check if mobile
    isMobile() {
        return this.currentBreakpoint.includes('mobile');
    }
    
    // Check if tablet
    isTablet() {
        return this.currentBreakpoint === 'tablet';
    }
    
    // Check if desktop
    isDesktop() {
        return this.currentBreakpoint.includes('desktop');
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.responsiveSystem = new ResponsiveSystem();
    });
} else {
    window.responsiveSystem = new ResponsiveSystem();
}