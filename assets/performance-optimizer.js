// ===== PERFORMANCE OPTIMIZER =====
// Optimize FPS, memory, and rendering

class PerformanceOptimizer {
    constructor() {
        this.metrics = {
            fps: 60,
            memoryUsage: 0,
            renderTime: 0
        };
        this.initialize();
    }
    
    initialize() {
        this.setupPerformanceMonitoring();
        this.setupMemoryManagement();
        this.setupAnimationOptimization();
        console.log('[PERFORMANCE] Optimizer initialized');
    }
    
    setupPerformanceMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();
        
        const monitor = () => {
            const now = performance.now();
            frameCount++;
            
            if (now - lastTime >= 1000) {
                this.metrics.fps = frameCount;
                frameCount = 0;
                lastTime = now;
                
                // Warn if FPS drops
                if (this.metrics.fps < 50) {
                    console.warn('[PERFORMANCE] Low FPS: ' + this.metrics.fps);
                }
            }
            
            requestAnimationFrame(monitor);
        };
        
        requestAnimationFrame(monitor);
    }
    
    setupMemoryManagement() {
        // Clean up unused elements
        setInterval(() => {
            // Remove detached DOM elements
            const orphaned = document.querySelectorAll('[data-orphaned="true"]');
            orphaned.forEach(el => el.remove());
            
            // Clear animation queues
            this.clearAnimationQueue();
        }, 30000); // Every 30 seconds
    }
    
    setupAnimationOptimization() {
        // Use requestAnimationFrame for smooth animations
        let ticking = false;
        
        const update = () => {
            // Perform updates
            ticking = false;
        };
        
        // Debounce scroll events
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
    }
    
    clearAnimationQueue() {
        // Clear any pending animations
        document.querySelectorAll('[style*="animation"]').forEach(el => {
            const style = window.getComputedStyle(el);
            const animationState = style.animationPlayState;
            
            if (animationState === 'finished') {
                el.style.animation = '';
            }
        });
    }
    
    // Lazy load images
    setupLazyLoading() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            observer.observe(img);
        });
    }
    
    // Debounce expensive operations
    debounce(fn, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }
    
    // Throttle frequent events
    throttle(fn, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Get performance metrics
    getMetrics() {
        return {
            fps: this.metrics.fps,
            memoryUsage: this.metrics.memoryUsage,
            renderTime: this.metrics.renderTime
        };
    }
    
    // Optimize canvas rendering
    optimizeCanvas(canvas) {
        if (!canvas) return;
        
        // Use devicePixelRatio for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        return ctx;
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.performanceOptimizer = new PerformanceOptimizer();
    });
} else {
    window.performanceOptimizer = new PerformanceOptimizer();
}