// ===== SMOOTH SCROLL & PAGE TRANSITIONS =====
// Butter-smooth scrolling like premium apps

class SmoothScroll {
    constructor() {
        this.initialize();
    }
    
    initialize() {
        // Smooth scroll for all links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (link) {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    this.smoothScrollTo(target);
                }
            }
        });
        
        // Scroll position restoration
        window.addEventListener('beforeunload', () => {
            sessionStorage.setItem('scrollPos', window.scrollY);
        });
        
        // Restore scroll on load
        window.addEventListener('load', () => {
            const scrollPos = sessionStorage.getItem('scrollPos');
            if (scrollPos) {
                window.scrollTo(0, parseInt(scrollPos));
                sessionStorage.removeItem('scrollPos');
            }
        });
        
        // Smooth scroll to top on page load
        window.scrollTo(0, 0);
        
        console.log('[SMOOTH] Scroll system initialized');
    }
    
    smoothScrollTo(target, duration = 800) {
        const start = window.scrollY;
        const end = target.offsetTop - 100;
        const distance = end - start;
        const startTime = performance.now();
        
        const easeInOutCubic = (t) => {
            return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
        };
        
        const scroll = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            window.scrollY !== end && window.scrollTo(
                0,
                start + distance * easeInOutCubic(progress)
            );
            
            if (progress < 1) {
                requestAnimationFrame(scroll);
            }
        };
        
        requestAnimationFrame(scroll);
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.smoothScroll = new SmoothScroll();
    });
} else {
    window.smoothScroll = new SmoothScroll();
}