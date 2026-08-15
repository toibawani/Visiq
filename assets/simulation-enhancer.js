// ===== SIMULATION ENHANCER =====
// Improve simulation controls and interactions

class SimulationEnhancer {
    constructor() {
        this.initialize();
    }
    
    initialize() {
        this.setupControlPanels();
        this.setupSimulationEvents();
        console.log('[SIM-ENHANCER] Initialized');
    }
    
    setupControlPanels() {
        // Monitor for new simulations and enhance them
        const observer = new MutationObserver(() => {
            this.enhanceControls();
        });
        
        const container = document.getElementById('controls-section');
        if (container) {
            observer.observe(container, { childList: true, subtree: true });
        }
    }
    
    setupSimulationEvents() {
        // Setup reset button with feedback
        const resetBtn = document.getElementById('reset-button');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (window.haptic) window.haptic.medium();
                if (window.UIPolish) {
                    window.UIPolish.showSuccess('Simulation reset');
                }
            });
        }
    }
    
    enhanceControls() {
        // Enhance slider controls with labels
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            if (slider.classList.contains('enhanced')) return;
            slider.classList.add('enhanced');
            
            // Add value display
            const label = slider.parentElement.querySelector('label');
            const valueDisplay = document.createElement('span');
            valueDisplay.className = 'slider-value';
            valueDisplay.textContent = slider.value;
            
            if (label) {
                label.parentElement.insertBefore(valueDisplay, slider);
            }
            
            // Update on change
            slider.addEventListener('input', () => {
                valueDisplay.textContent = parseFloat(slider.value).toFixed(2);
                valueDisplay.style.animation = 'pulse 0.2s ease-out';
            });
        });
    }
    
    // Create custom control
    createControl(name, type, options = {}) {
        const control = document.createElement('div');
        control.className = 'control-group enhanced-control';
        
        switch(type) {
            case 'slider':
                control.innerHTML = `
                    <label>${name}</label>
                    <input type="range" 
                        min="${options.min || 0}" 
                        max="${options.max || 100}"
                        value="${options.default || 50}"
                        step="${options.step || 1}"
                    >
                    <span class="slider-value">${options.default || 50}</span>
                `;
                break;
            
            case 'toggle':
                control.innerHTML = `
                    <label>
                        <input type="checkbox" ${options.default ? 'checked' : ''}>
                        <span>${name}</span>
                    </label>
                `;
                break;
            
            case 'button':
                control.innerHTML = `
                    <button class="btn-control">${name}</button>
                `;
                break;
        }
        
        return control;
    }
    
    // Add real-time statistics
    addStats(statNames) {
        const statsDiv = document.getElementById('stats-panel');
        if (!statsDiv) return;
        
        statNames.forEach(name => {
            const stat = document.createElement('div');
            stat.className = 'stat-item';
            stat.innerHTML = `
                <span class="stat-label">${name}</span>
                <span class="stat-value" id="stat-${name.toLowerCase()}">—</span>
            `;
            statsDiv.appendChild(stat);
        });
    }
    
    // Update stat in real-time
    updateStat(name, value) {
        const stat = document.getElementById(`stat-${name.toLowerCase()}`);
        if (stat) {
            stat.textContent = typeof value === 'number' ? 
                value.toFixed(2) : value;
        }
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.simEnhancer = new SimulationEnhancer();
    });
} else {
    window.simEnhancer = new SimulationEnhancer();
}