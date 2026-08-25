class SimulationDetails {
    constructor() {
        this.setupDetails();
    }
    
    setupDetails() {
        // Details shown when simulation opens
    }
    
    showDetails(sim) {
        const infoPanel = document.querySelector('.sim-info-panel');
        if (!infoPanel) return;
        
        let html = `<div id="sim-description" class="sim-description-text">${sim.longDescription}</div>`;
        
        if (sim.learningOutcomes && sim.learningOutcomes.length > 0) {
            html += `
                <div class="learning-outcomes">
                    <h4>What You'll Learn</h4>
                    <ul>
                        ${sim.learningOutcomes.map(outcome => `<li>${outcome}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        html += `
            <div class="sim-meta">
                <div class="meta-item">
                    <span class="meta-label">Difficulty</span>
                    <span class="meta-value">${sim.difficulty}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Time</span>
                    <span class="meta-value">${sim.estimatedTime}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Category</span>
                    <span class="meta-value">${sim.category}</span>
                </div>
            </div>
        `;
        
        infoPanel.innerHTML = html;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.simDetails = new SimulationDetails();
    });
} else {
    window.simDetails = new SimulationDetails();
}