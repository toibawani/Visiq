// ===== STATS TRACKER & NATIVE SESSION ANALYTICS DRAWER =====
// Tracks user sessions, simulation interaction history, and native analytics drawer

class StatsTracker {
    constructor() {
        this.sessionStartTime = Date.now();
        this.stats = this.loadStats();
        this.currentSimulation = null;
        this.simStartTime = null;
        this.sessionInteractions = 0;
        this.isDrawerOpen = false;
        this.liveTicker = null;

        this.setupTracking();
        this.setupDrawer();
        console.log('[STATS-TRACKER] Initialized');
    }
    
    loadStats() {
        const saved = localStorage.getItem('visiq-stats');
        const defaultStats = {
            simulationsViewed: [],
            totalTimeSpent: 0,
            favoriteIds: [],
            favoriteCount: 0,
            sessionsCompleted: 1,
            totalInteractions: 0,
            history: [] // [{ id, title, category, timestamp, duration }]
        };

        if (!saved) return defaultStats;
        try {
            return Object.assign(defaultStats, JSON.parse(saved));
        } catch (e) {
            return defaultStats;
        }
    }
    
    saveStats() {
        localStorage.setItem('visiq-stats', JSON.stringify(this.stats));
    }
    
    setupTracking() {
        // Track session before page unloads
        window.addEventListener('beforeunload', () => {
            this.trackSessionEnd();
        });

        // Track slider control adjustments
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[type="range"], input[type="checkbox"], select')) {
                this.trackInteraction('control_change');
            }
        });
    }

    trackInteraction(type = 'general') {
        this.sessionInteractions++;
        this.stats.totalInteractions = (this.stats.totalInteractions || 0) + 1;
        this.saveStats();
        if (this.isDrawerOpen) {
            this.updateDrawerMetrics();
        }
    }
    
    trackSimulationOpen(simId) {
        // Record previous sim duration if any
        if (this.currentSimulation && this.simStartTime) {
            const timeInSim = Math.floor((Date.now() - this.simStartTime) / 1000);
            this.stats.totalTimeSpent += timeInSim;
        }

        this.currentSimulation = simId;
        this.simStartTime = Date.now();
        this.trackInteraction('sim_open');
        
        if (!this.stats.simulationsViewed.includes(simId)) {
            this.stats.simulationsViewed.push(simId);
        }

        // Add to rich history (max 30 items)
        const simData = (typeof SIMULATIONS !== 'undefined') ? SIMULATIONS.find(s => s.id === simId) : null;
        const entry = {
            id: simId,
            title: simData ? simData.title : simId,
            category: simData ? simData.category : 'Science',
            timestamp: Date.now()
        };

        this.stats.history = [entry, ...(this.stats.history || []).filter(h => h.id !== simId)].slice(0, 30);
        this.saveStats();

        if (this.isDrawerOpen) {
            this.renderDrawerContent();
        }
    }

    trackSimulationExit() {
        if (this.currentSimulation && this.simStartTime) {
            const timeInSim = Math.floor((Date.now() - this.simStartTime) / 1000);
            this.stats.totalTimeSpent += timeInSim;
            this.simStartTime = null;
            this.currentSimulation = null;
            this.saveStats();
        }
    }
    
    trackSessionEnd() {
        this.trackSimulationExit();
        const currentSessionElapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        this.stats.totalTimeSpent += currentSessionElapsed;
        this.stats.sessionsCompleted = (this.stats.sessionsCompleted || 1) + 1;
        this.saveStats();
    }
    
    addFavorite(simId) {
        if (!this.stats.favoriteIds.includes(simId)) {
            this.stats.favoriteIds.push(simId);
            this.stats.favoriteCount = this.stats.favoriteIds.length;
            this.trackInteraction('add_favorite');
            this.saveStats();
            this.syncFavoriteButtons(simId, true);
            return true;
        }
        return false;
    }
    
    removeFavorite(simId) {
        if (this.stats.favoriteIds.includes(simId)) {
            this.stats.favoriteIds = this.stats.favoriteIds.filter(id => id !== simId);
            this.stats.favoriteCount = this.stats.favoriteIds.length;
            this.trackInteraction('remove_favorite');
            this.saveStats();
            this.syncFavoriteButtons(simId, false);
            return true;
        }
        return false;
    }

    syncFavoriteButtons(simId, isFav) {
        // Find favorite buttons in cards
        document.querySelectorAll(`.sim-card-featured`).forEach(card => {
            const btn = card.querySelector('.btn-favorite');
            const cardId = this.getCardId(card);
            if (cardId === simId && btn) {
                btn.textContent = isFav ? '❤️' : '🤍';
                btn.setAttribute('title', isFav ? 'Remove from favorites' : 'Add to favorites');
                btn.setAttribute('data-tooltip', isFav ? 'Remove favorite' : 'Add favorite');
            }
        });
        if (this.isDrawerOpen) {
            this.updateDrawerMetrics();
        }
    }

    getCardId(card) {
        const body = card.querySelector('.card-body');
        if (!body) return '';
        const oc = body.getAttribute('onclick') || '';
        const match = oc.match(/'([^']+)'/);
        return match ? match[1] : '';
    }
    
    isFavorite(simId) {
        return (this.stats.favoriteIds || []).includes(simId);
    }
    
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${secs}s`;
        return `${secs}s`;
    }

    getSessionDuration() {
        return Math.floor((Date.now() - this.sessionStartTime) / 1000);
    }

    // ===== NATIVE STATS DRAWER =====
    setupDrawer() {
        // Wire up any .btn-stats in navbar
        const statsBtns = document.querySelectorAll('.btn-stats');
        statsBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleDrawer();
            });
        });

        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isDrawerOpen) {
                this.closeDrawer();
            }
        });
    }

    toggleDrawer() {
        if (this.isDrawerOpen) {
            this.closeDrawer();
        } else {
            this.openDrawer();
        }
    }

    openDrawer() {
        let drawer = document.getElementById('stats-drawer');
        let overlay = document.getElementById('stats-drawer-overlay');

        if (!drawer) {
            this.createDrawerDOM();
            drawer = document.getElementById('stats-drawer');
            overlay = document.getElementById('stats-drawer-overlay');
        }

        this.isDrawerOpen = true;
        this.renderDrawerContent();

        requestAnimationFrame(() => {
            if (overlay) overlay.classList.add('active');
            if (drawer) drawer.classList.add('active');
        });

        // Live ticker for session time
        if (this.liveTicker) clearInterval(this.liveTicker);
        this.liveTicker = setInterval(() => {
            this.updateDrawerMetrics();
        }, 1000);

        this.trackInteraction('drawer_open');
    }

    closeDrawer() {
        this.isDrawerOpen = false;
        if (this.liveTicker) {
            clearInterval(this.liveTicker);
            this.liveTicker = null;
        }

        const drawer = document.getElementById('stats-drawer');
        const overlay = document.getElementById('stats-drawer-overlay');

        if (drawer) drawer.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    createDrawerDOM() {
        // Overlay
        const overlay = document.createElement('div');
        overlay.id = 'stats-drawer-overlay';
        overlay.className = 'stats-drawer-overlay';
        overlay.onclick = () => this.closeDrawer();
        document.body.appendChild(overlay);

        // Drawer
        const drawer = document.createElement('aside');
        drawer.id = 'stats-drawer';
        drawer.className = 'stats-drawer';
        drawer.setAttribute('role', 'dialog');
        drawer.setAttribute('aria-label', 'Session Analytics and History');
        drawer.innerHTML = `
            <div class="drawer-header">
                <div class="drawer-title-row">
                    <span class="drawer-icon">📊</span>
                    <h2>Learning Analytics</h2>
                </div>
                <button class="drawer-close-btn" title="Close drawer (Esc)" aria-label="Close drawer">✕</button>
            </div>
            <div class="drawer-body" id="drawer-body-content"></div>
        `;

        drawer.querySelector('.drawer-close-btn').onclick = () => this.closeDrawer();
        document.body.appendChild(drawer);
    }

    renderDrawerContent() {
        const body = document.getElementById('drawer-body-content');
        if (!body) return;

        const totalSims = typeof SIMULATIONS !== 'undefined' ? SIMULATIONS.length : 5;
        const viewedCount = (this.stats.simulationsViewed || []).length;
        const completionPct = Math.min(100, Math.round((viewedCount / totalSims) * 100));
        const totalTime = (this.stats.totalTimeSpent || 0) + this.getSessionDuration();
        const historyList = this.stats.history || [];

        body.innerHTML = `
            <!-- Live Session Metric Cards -->
            <div class="drawer-section">
                <div class="drawer-section-title">Active Session</div>
                <div class="stats-metrics-grid">
                    <div class="metric-card">
                        <span class="metric-icon">⏱️</span>
                        <div class="metric-val" id="metric-session-time">${this.formatTime(this.getSessionDuration())}</div>
                        <div class="metric-lbl">This Session</div>
                    </div>
                    <div class="metric-card">
                        <span class="metric-icon">⏳</span>
                        <div class="metric-val" id="metric-total-time">${this.formatTime(totalTime)}</div>
                        <div class="metric-lbl">Total Time</div>
                    </div>
                    <div class="metric-card">
                        <span class="metric-icon">⚡</span>
                        <div class="metric-val" id="metric-interactions">${(this.stats.totalInteractions || 0) + this.sessionInteractions}</div>
                        <div class="metric-lbl">Interactions</div>
                    </div>
                    <div class="metric-card">
                        <span class="metric-icon">❤️</span>
                        <div class="metric-val" id="metric-favorites">${this.stats.favoriteCount || 0}</div>
                        <div class="metric-lbl">Favorites</div>
                    </div>
                </div>
            </div>

            <!-- Progress Bar -->
            <div class="drawer-section">
                <div class="drawer-progress-header">
                    <span>Library Mastery</span>
                    <span><strong>${viewedCount}</strong> / ${totalSims} explored (${completionPct}%)</span>
                </div>
                <div class="drawer-progress-track">
                    <div class="drawer-progress-fill" style="width: ${completionPct}%;"></div>
                </div>
            </div>

            <!-- Milestones & Empathy Badges -->
            <div class="drawer-section">
                <div class="drawer-section-title">Milestones</div>
                <div class="drawer-badges">
                    <span class="badge ${viewedCount >= 1 ? 'unlocked' : 'locked'}" title="Explored your first simulation">
                        🚀 First Spark
                    </span>
                    <span class="badge ${viewedCount >= 3 ? 'unlocked' : 'locked'}" title="Explored 3 or more simulations">
                        🌌 Cosmic Explorer
                    </span>
                    <span class="badge ${(this.stats.favoriteCount || 0) >= 1 ? 'unlocked' : 'locked'}" title="Pinned a favorite simulation">
                        ⭐ Curator
                    </span>
                    <span class="badge ${totalTime > 300 ? 'unlocked' : 'locked'}" title="Spent 5+ minutes learning">
                        🔬 Dedicated Mind
                    </span>
                </div>
            </div>

            <!-- Exploration History -->
            <div class="drawer-section">
                <div class="drawer-history-header">
                    <div class="drawer-section-title">Recent History</div>
                    ${historyList.length > 0 ? `<button class="btn-clear-history" title="Clear exploration history">Clear</button>` : ''}
                </div>
                <div class="drawer-history-list">
                    ${historyList.length > 0 ? historyList.map(item => `
                        <div class="history-item" onclick="window.statsTracker.openFromHistory('${item.id}')">
                            <div class="history-item-left">
                                <span class="history-dot"></span>
                                <div>
                                    <div class="history-title">${item.title}</div>
                                    <div class="history-meta">${item.category} • ${this.timeAgo(item.timestamp)}</div>
                                </div>
                            </div>
                            <span class="history-arrow">Launch →</span>
                        </div>
                    `).join('') : `
                        <div class="empty-history-note">
                            <span>🌱</span>
                            <p>No simulations explored yet. Launch any simulation in Newton's Playground, Chaos, or Waves to see your journey unfold!</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        const clearBtn = body.querySelector('.btn-clear-history');
        if (clearBtn) {
            clearBtn.onclick = () => {
                this.stats.history = [];
                this.saveStats();
                this.renderDrawerContent();
            };
        }
    }

    updateDrawerMetrics() {
        const sessionTimeEl = document.getElementById('metric-session-time');
        const totalTimeEl = document.getElementById('metric-total-time');
        const interactionsEl = document.getElementById('metric-interactions');
        const favoritesEl = document.getElementById('metric-favorites');

        if (sessionTimeEl) sessionTimeEl.textContent = this.formatTime(this.getSessionDuration());
        if (totalTimeEl) totalTimeEl.textContent = this.formatTime((this.stats.totalTimeSpent || 0) + this.getSessionDuration());
        if (interactionsEl) interactionsEl.textContent = (this.stats.totalInteractions || 0) + this.sessionInteractions;
        if (favoritesEl) favoritesEl.textContent = this.stats.favoriteCount || 0;
    }

    openFromHistory(simId) {
        this.closeDrawer();
        if (window.gallery && typeof window.gallery.openSimulation === 'function') {
            window.gallery.openSimulation(simId);
        }
    }

    timeAgo(timestamp) {
        if (!timestamp) return 'Just now';
        const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
        if (diffSeconds < 60) return 'Just now';
        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.statsTracker = new StatsTracker();
    });
} else {
    window.statsTracker = new StatsTracker();
}