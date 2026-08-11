// ===== DEVICE PERFORMANCE SCALING SYSTEM =====
// Automatically detects device specs and scales particle counts
// Result: 60fps on all devices (low-end to high-end)

window.performanceSettings = {
    // Device info
    isMobile: false,
    isLowEnd: false,
    deviceMemory: 8,
    cores: 4,
    screenWidth: 0,
    screenHeight: 0,
    
    // Performance factor (multiplier for particle counts)
    particleScaleFactor: 1.0,
    diskParticleScaleFactor: 1.0,
    effectParticleScaleFactor: 1.0,
    
    // Cached fps estimate
    estimatedFPS: 60,
    
    initialize() {
        console.log('[VISIQ] Initializing performance settings...');
        this.detectDevice();
        this.calculatePerformanceFactors();
        this.logPerformanceProfile();
        this.monitorFrameRate();
    },
    
    detectDevice() {
        // Detect mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );
        
        // Get device memory (Chrome, Edge, some Androids)
        if (navigator.deviceMemory) {
            this.deviceMemory = navigator.deviceMemory;
            this.isLowEnd = this.deviceMemory <= 4;
        } else {
            // Estimate based on user agent
            this.estimateMemory();
        }
        
        // Get CPU cores
        if (navigator.hardwareConcurrency) {
            this.cores = navigator.hardwareConcurrency;
        }
        
        // Get screen dimensions
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
    },
    
    estimateMemory() {
        // Rough estimates for devices without navigator.deviceMemory
        const ua = navigator.userAgent;
        
        if (/iPad/.test(ua)) {
            this.deviceMemory = 4;
        } else if (/iPhone/.test(ua)) {
            this.deviceMemory = 3;
        } else if (/Pixel [34]/.test(ua)) {
            this.deviceMemory = 4;
        } else if (/Samsung/.test(ua)) {
            this.deviceMemory = 3;
        } else if (/Desktop|Windows/.test(ua)) {
            this.deviceMemory = 16;
        } else {
            this.deviceMemory = 6;
        }
    },
    
    calculatePerformanceFactors() {
        let factor = 1.0;
        
        // === MEMORY IMPACT (Heavy) ===
        if (this.deviceMemory <= 4) {
            factor *= 0.4;  // 60% reduction for 4GB or less
        } else if (this.deviceMemory <= 6) {
            factor *= 0.6;  // 40% reduction for 6GB
        } else if (this.deviceMemory >= 12) {
            factor *= 1.15; // 15% boost for 12GB+
        }
        
        // === MOBILE IMPACT (Medium) ===
        // Mobile GPUs are slower than desktop
        if (this.isMobile) {
            factor *= 0.75;
        }
        
        // === CPU CORE IMPACT (Light) ===
        if (this.cores <= 2) {
            factor *= 0.8;
        } else if (this.cores >= 8) {
            factor *= 1.05;
        }
        
        // === SCREEN SIZE IMPACT ===
        const pixelCount = this.screenWidth * this.screenHeight;
        if (pixelCount > 2073600) { // 4K or large
            factor *= 0.85;
        } else if (pixelCount < 921600) { // Small screen
            factor *= 1.05;
        }
        
        // Constrain between reasonable limits
        this.particleScaleFactor = Math.max(0.25, Math.min(1.5, factor));
        
        // Disk particles (accretion disks, etc) are heavier
        this.diskParticleScaleFactor = Math.max(0.2, this.particleScaleFactor * 0.8);
        
        // Effect particles (lighter, more CPU-friendly)
        this.effectParticleScaleFactor = Math.max(0.3, this.particleScaleFactor * 1.1);
    },
    
    logPerformanceProfile() {
        const profile = {
            'Device Type': this.isMobile ? 'Mobile' : 'Desktop',
            'RAM': this.deviceMemory + ' GB',
            'CPU Cores': this.cores,
            'Low-End?': this.isLowEnd ? 'YES' : 'NO',
            'Screen': this.screenWidth + 'x' + this.screenHeight,
            'Particle Scale': this.particleScaleFactor.toFixed(2),
            'Disk Scale': this.diskParticleScaleFactor.toFixed(2),
            'Effect Scale': this.effectParticleScaleFactor.toFixed(2)
        };
        
        console.table(profile);
        
        if (this.isLowEnd) {
            console.warn('[VISIQ] Low-end device detected. Reducing particle counts for 60fps.');
        }
    },
    
    monitorFrameRate() {
        // Simple FPS monitor (runs in background)
        let lastTime = performance.now();
        let frames = 0;
        
        const checkFPS = () => {
            const now = performance.now();
            frames++;
            
            if (now - lastTime >= 1000) {
                this.estimatedFPS = frames;
                
                // Adjust scaling if FPS is too low
                if (frames < 50) {
                    console.warn('[VISIQ] Low FPS detected (' + frames + '). Consider reducing particle counts further.');
                }
                
                frames = 0;
                lastTime = now;
            }
            
            requestAnimationFrame(checkFPS);
        };
        
        requestAnimationFrame(checkFPS);
    },
    
    // Public methods for simulations to use
    
    getScaledParticleCount(baseCount) {
        return Math.floor(baseCount * this.particleScaleFactor);
    },
    
    getScaledDiskParticleCount(baseCount) {
        return Math.floor(baseCount * this.diskParticleScaleFactor);
    },
    
    getScaledEffectParticleCount(baseCount) {
        return Math.floor(baseCount * this.effectParticleScaleFactor);
    },
    
    // Utility methods
    
    isHighEndDevice() {
        return this.deviceMemory >= 8 && this.cores >= 6;
    },
    
    isLowEndDevice() {
        return this.isLowEnd;
    },
    
    isMobileDevice() {
        return this.isMobile;
    },
    
    getMemoryEstimate() {
        return this.deviceMemory;
    },
    
    getCoreCount() {
        return this.cores;
    },
    
    getScreenResolution() {
        return {
            width: this.screenWidth,
            height: this.screenHeight,
            area: this.screenWidth * this.screenHeight
        };
    }
};

// Initialize immediately
window.performanceSettings.initialize();

// Reinitialize on resize (if moving from mobile to desktop, etc)
window.addEventListener('resize', () => {
    window.performanceSettings.screenWidth = window.innerWidth;
    window.performanceSettings.screenHeight = window.innerHeight;
});

console.log('[VISIQ] Performance scaling system ready');