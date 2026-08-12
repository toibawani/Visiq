// ===== SIMULATION INFO SYSTEM =====
// Displays detailed information about each simulation

class SimulationInfo {
    constructor() {
        this.simulationData = {
            'Newton\'s Gravity': {
                difficulty: 'Beginner',
                particles: '80-150',
                estimated_time: '3-5 min',
                tags: ['physics', 'gravity', 'classic']
            },
            'Black Hole': {
                difficulty: 'Advanced',
                particles: '150-610',
                estimated_time: '5-10 min',
                tags: ['physics', 'relativity', 'spacetime']
            },
            'DNA Replication': {
                difficulty: 'Intermediate',
                particles: '80-200',
                estimated_time: '4-6 min',
                tags: ['biology', 'genetics', 'molecular']
            },
            'Mitosis': {
                difficulty: 'Beginner',
                particles: '40-100',
                estimated_time: '3-5 min',
                tags: ['biology', 'cell division']
            },
            'Hurricane Formation': {
                difficulty: 'Intermediate',
                particles: '100-430',
                estimated_time: '5-7 min',
                tags: ['geography', 'weather', 'dynamics']
            },
            'Ocean Currents': {
                difficulty: 'Intermediate',
                particles: '100-200',
                estimated_time: '4-6 min',
                tags: ['geography', 'oceans', 'fluid dynamics']
            }
        };
        
        this.initialize();
    }
    
    initialize() {
        console.log('[SIM-INFO] System initialized');
    }
    
    getInfo(simulationName) {
        return this.simulationData[simulationName] || this.getDefaultInfo();
    }
    
    getDefaultInfo() {
        return {
            difficulty: 'Intermediate',
            particles: '100-200',
            estimated_time: '4-6 min',
            tags: ['exploration']
        };
    }
    
    updatePanel(simulationName, category) {
        const info = this.getInfo(simulationName);
        
        // Update difficulty
        const diffElement = document.getElementById('sim-difficulty');
        if (diffElement) {
            diffElement.textContent = info.difficulty;
            diffElement.className = 'info-value difficulty-' + info.difficulty.toLowerCase();
        }
        
        // Update category
        const catElement = document.getElementById('sim-category-info');
        if (catElement) {
            catElement.textContent = category || 'Science';
        }
        
        // Update particles
        const partElement = document.getElementById('sim-particles');
        if (partElement) {
            partElement.textContent = info.particles;
        }
    }
    
    getDifficultyColor(difficulty) {
        switch(difficulty.toLowerCase()) {
            case 'beginner': return '#00d9ff';
            case 'intermediate': return '#ffd60a';
            case 'advanced': return '#ff006e';
            default: return '#a0a0a8';
        }
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.simInfo = new SimulationInfo();
    });
} else {
    window.simInfo = new SimulationInfo();
}