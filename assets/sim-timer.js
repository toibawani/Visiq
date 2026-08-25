class SimulationTimer {
    constructor() {
        this.startTime = null;
        this.elapsedTime = 0;
        this.intervalId = null;
    }
    
    startTimer() {
        this.startTime = Date.now();
        this.elapsedTime = 0;
        
        this.intervalId = setInterval(() => {
            this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.updateDisplay();
        }, 1000);
    }
    
    stopTimer() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    
    updateDisplay() {
        const display = document.querySelector('.sim-timer-display');
        if (display) {
            const minutes = Math.floor(this.elapsedTime / 60);
            const seconds = this.elapsedTime % 60;
            display.textContent = `${minutes}m ${seconds}s`;
        }
    }
    
    getElapsedTime() {
        return this.elapsedTime;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.simTimer = new SimulationTimer();
    });
} else {
    window.simTimer = new SimulationTimer();
}