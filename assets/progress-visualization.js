// ===== PROGRESS VISUALIZATION =====
// Beautiful progress tracking and visualization

class ProgressVisualization {
    constructor() {
        this.initialize();
    }
    
    initialize() {
        this.setupProgressTracking();
        console.log('[PROGRESS] Visualization initialized');
    }
    
    setupProgressTracking() {
        // Update progress when simulations are viewed
        const originalOpen = window.gallery?.openSimulation;
        if (originalOpen) {
            window.gallery.openSimulation = function(simId) {
                originalOpen.call(this, simId);
                window.progressViz?.updateProgressBars();
            };
        }
    }
    
    createProgressDashboard() {
        const dashboard = document.createElement('div');
        dashboard.className = 'progress-dashboard';
        dashboard.innerHTML = `
            <h3>Learning Progress</h3>
            
            <div class="progress-section">
                <div class="progress-label">Overall Progress</div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" id="overall-progress"></div>
                </div>
                <div class="progress-percent" id="overall-percent">0%</div>
            </div>
            
            <div class="category-progress">
                <div class="category-progress-item">
                    <div class="cat-label">⚛️ Physics</div>
                    <div class="cat-bar">
                        <div class="cat-fill" id="physics-progress"></div>
                    </div>
                </div>
                <div class="category-progress-item">
                    <div class="cat-label">🧬 Biology</div>
                    <div class="cat-bar">
                        <div class="cat-fill" id="biology-progress"></div>
                    </div>
                </div>
                <div class="category-progress-item">
                    <div class="cat-label">🌍 Geography</div>
                    <div class="cat-bar">
                        <div class="cat-fill" id="geography-progress"></div>
                    </div>
                </div>
                <div class="category-progress-item">
                    <div class="cat-label">🌌 Astronomy</div>
                    <div class="cat-bar">
                        <div class="cat-fill" id="astronomy-progress"></div>
                    </div>
                </div>
            </div>
            
            <div class="progress-stats">
                <div class="stat-box">
                    <div class="stat-num" id="sims-completed">0</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-box">
                    <div class="stat-num" id="sims-total">39</div>
                    <div class="stat-label">Available</div>
                </div>
                <div class="stat-box">
                    <div class="stat-num" id="hours-spent">0</div>
                    <div class="stat-label">Hours</div>
                </div>
            </div>
        `;
        
        return dashboard;
    }
    
    updateProgressBars() {
        if (!window.userPrefs) return;
        
        const stats = window.userPrefs.getStatistics();
        const totalSims = SIMULATIONS.length;
        const overallPercent = Math.round((stats.viewCount / totalSims) * 100);
        
        // Update overall
        const overallBar = document.getElementById('overall-progress');
        const overallText = document.getElementById('overall-percent');
        if (overallBar) {
            overallBar.style.width = overallPercent + '%';
            overallBar.style.animation = 'slideInLeft 0.5s ease-out';
        }
        if (overallText) {
            overallText.textContent = overallPercent + '%';
        }
        
        // Update by category
        const categories = {
            'physics': '⚛️',
            'biology': '🧬',
            'geography': '🌍',
            'astronomy': '🌌'
        };
        
        Object.entries(categories).forEach(([category, emoji]) => {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            const sims = SIMULATIONS.filter(s => s.category === categoryName);
            const viewed = sims.filter(s => 
                window.userPrefs.preferences.favorites.includes(s.id) ||
                stats.viewCount > 0
            ).length;
            const percent = Math.round((viewed / sims.length) * 100);
            
            const bar = document.getElementById(`${category}-progress`);
            if (bar) {
                bar.style.width = percent + '%';
            }
        });
        
        // Update stats
        const hoursSpent = Math.floor(stats.totalPlayTime / 3600);
        const simsCompleted = Math.min(stats.viewCount, totalSims);
        
        const completedEl = document.getElementById('sims-completed');
        const hoursEl = document.getElementById('hours-spent');
        
        if (completedEl) completedEl.textContent = simsCompleted;
        if (hoursEl) hoursEl.textContent = hoursSpent;
    }
}

// Add CSS
const style = document.createElement('style');
style.textContent = `
    .progress-dashboard {
        padding: 24px;
        background: var(--bg-secondary);
        border-radius: 12px;
        border: 1px solid var(--border-subtle);
    }
    
    .progress-dashboard h3 {
        margin: 0 0 20px 0;
        font-size: 18px;
        color: var(--text-primary);
    }
    
    .progress-section {
        margin-bottom: 24px;
    }
    
    .progress-label {
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .progress-bar-container {
        width: 100%;
        height: 12px;
        background: rgba(0, 217, 255, 0.1);
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        position: relative;
    }
    
    .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent-primary), #00a8cc);
        border-radius: 6px;
        transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        width: 0%;
    }
    
    .progress-percent {
        margin-top: 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--accent-primary);
    }
    
    .category-progress {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 24px;
    }
    
    .category-progress-item {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .cat-label {
        min-width: 80px;
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary);
    }
    
    .cat-bar {
        flex: 1;
        height: 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        overflow: hidden;
    }
    
    .cat-fill {
        height: 100%;
        background: linear-gradient(90deg, #00d9ff, #6366f1);
        border-radius: 4px;
        transition: width 0.6s ease-out;
        width: 0%;
    }
    
    .progress-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        padding-top: 16px;
        border-top: 1px solid var(--border-subtle);
    }
    
    .stat-box {
        text-align: center;
    }
    
    .stat-num {
        font-size: 24px;
        font-weight: 700;
        color: var(--accent-primary);
    }
    
    .stat-label {
        font-size: 11px;
        color: var(--text-secondary);
        margin-top: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
`;
document.head.appendChild(style);

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.progressViz = new ProgressVisualization();
    });
} else {
    window.progressViz = new ProgressVisualization();
}