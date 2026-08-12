// ===== STATISTICS MONITOR =====
// Shows FPS, particle count, and render time

class StatsMonitor {
    constructor() {
        this.fpsPanel = document.getElementById('stat-fps');
        this.particlesPanel = document.getElementById('stat-particles');
        this.renderPanel = document.getElementById('stat-render');
        
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 60;
        this.renderTime = 0;
        
        this.isRunning = false;
        this.initialize();
    }
    
    initialize() {
        console.log('[STATS] Monitor initialized');
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.frameCount = 0;
        this.lastTime = performance.now();
        
        this.monitorLoop();
        console.log('[STATS] Monitoring started');
    }
    
    stop() {
        this.isRunning = false;
        console.log('[STATS] Monitoring stopped');
    }
    
    monitorLoop() {
        if (!this.isRunning) return;
        
        const now = performance.now();
        this.frameCount++;
        
        // Update FPS every second
        if (now - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
            
            this.updateFpsDisplay();
        }
        
        // Continue monitoring
        requestAnimationFrame(() => this.monitorLoop());
    }
    
    updateFpsDisplay() {
        if (this.fpsPanel) {
            this.fpsPanel.textContent = this.fps;
            
            // Color code FPS
            this.fpsPanel.classList.remove('warning', 'critical');
            
            if (this.fps < 30) {
                this.fpsPanel.classList.add('critical');
            } else if (this.fps < 50) {
                this.fpsPanel.classList.add('warning');
            }
        }
    }
    
    updateParticleCount(count) {
        if (this.particlesPanel) {
            this.particlesPanel.textContent = Math.floor(count);
        }
    }
    
    updateRenderTime(milliseconds) {
        this.renderTime = milliseconds;
        
        if (this.renderPanel) {
            this.renderPanel.textContent = Math.round(milliseconds) + 'ms';
            
            // Color code render time
            this.renderPanel.classList.remove('warning', 'critical');
            
            if (milliseconds > 20) {
                this.renderPanel.classList.add('critical');
            } else if (milliseconds > 16) {
                this.renderPanel.classList.add('warning');
            }
        }
    }
    
    getStats() {
        return {
            fps: this.fps,
            renderTime: this.renderTime
        };
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.statsMonitor = new StatsMonitor();
    });
} else {
    window.statsMonitor = new StatsMonitor();
}