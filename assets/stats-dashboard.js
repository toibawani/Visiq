// ===== STATISTICS DASHBOARD =====
// Shows user activity and achievements

class StatsDashboard {
    constructor() {
        this.initialize();
    }
    
    initialize() {
        this.createDashboard();
        console.log('[STATS-DASH] Dashboard initialized');
    }
    
    createDashboard() {
        // Add stats button to navbar
        const navbar = document.querySelector('.nav-right');
        if (!navbar) return;
        
        const statsBtn = document.createElement('button');
        statsBtn.id = 'stats-button';
        statsBtn.className = 'btn-stats';
        statsBtn.innerHTML = '📊';
        statsBtn.title = 'View statistics';
        statsBtn.onclick = () => this.showDashboard();
        
        // Insert before logout button
        const logoutBtn = navbar.querySelector('.btn-logout');
        if (logoutBtn) {
            logoutBtn.parentNode.insertBefore(statsBtn, logoutBtn);
        }
    }
    
    showDashboard() {
        const modal = this.createModal();
        document.body.appendChild(modal);
        
        // Add close handler
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Close on ESC
        const closeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', closeHandler);
            }
        };
        document.addEventListener('keydown', closeHandler);
    }
    
    createModal() {
        const stats = window.userPrefs.getStatistics();
        const favorites = window.userPrefs.preferences.favorites;
        
        const totalHours = Math.floor(stats.totalPlayTime / 3600);
        const totalMinutes = Math.floor((stats.totalPlayTime % 3600) / 60);
        
        const modal = document.createElement('div');
        modal.className = 'stats-modal-overlay';
        modal.innerHTML = `
            <div class="stats-modal">
                <div class="modal-header">
                    <h2>Your Statistics</h2>
                    <button class="modal-close" onclick="this.closest('.stats-modal-overlay').remove()">×</button>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">👁️</div>
                        <div class="stat-info">
                            <div class="stat-label">Simulations Viewed</div>
                            <div class="stat-value">${stats.viewCount}</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">⏱️</div>
                        <div class="stat-info">
                            <div class="stat-label">Total Play Time</div>
                            <div class="stat-value">${totalHours}h ${totalMinutes}m</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">❤️</div>
                        <div class="stat-info">
                            <div class="stat-label">Favorite Simulations</div>
                            <div class="stat-value">${favorites.length}</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-info">
                            <div class="stat-label">Completion Rate</div>
                            <div class="stat-value">${this.getCompletionRate(stats)}%</div>
                        </div>
                    </div>
                </div>
                
                <div class="stats-section">
                    <h3>Last Simulation</h3>
                    <p>${stats.lastSimulation || 'None yet'}</p>
                </div>
                
                <div class="stats-section">
                    <h3>Favorite Simulations</h3>
                    <div class="favorites-list">
                        ${favorites.length > 0 ? 
                            favorites.map(fav => `<span class="favorite-tag">${fav}</span>`).join('') :
                            '<p style="color: var(--text-tertiary);">No favorites yet</p>'
                        }
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.stats-modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        
        return modal;
    }
    
    getCompletionRate(stats) {
        const totalSimulations = 13; // Total number of simulations
        return Math.round((stats.viewCount / totalSimulations) * 100);
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.statsDash = new StatsDashboard();
    });
} else {
    window.statsDash = new StatsDashboard();
}