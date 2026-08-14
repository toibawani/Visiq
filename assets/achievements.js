// ===== ACHIEVEMENT SYSTEM =====
// Badges and gamification for engagement

class AchievementSystem {
    constructor() {
        this.achievements = this.defineAchievements();
        this.unlockedAchievements = this.loadUnlocked();
        this.initialize();
    }
    
    defineAchievements() {
        return {
            explorer: {
                id: 'explorer',
                name: 'Explorer',
                description: 'View 5 different simulations',
                icon: '🔍',
                condition: (stats) => stats.viewCount >= 5,
                rarity: 'common'
            },
            enthusiast: {
                id: 'enthusiast',
                name: 'Enthusiast',
                description: 'View 15 different simulations',
                icon: '⭐',
                condition: (stats) => stats.viewCount >= 15,
                rarity: 'uncommon'
            },
            master: {
                id: 'master',
                name: 'Master Explorer',
                description: 'View all simulations',
                icon: '👑',
                condition: (stats) => stats.viewCount >= 13,
                rarity: 'rare'
            },
            collector: {
                id: 'collector',
                name: 'Collector',
                description: 'Favorite 5 simulations',
                icon: '❤️',
                condition: (prefs) => prefs.favorites.length >= 5,
                rarity: 'common'
            },
            speedrunner: {
                id: 'speedrunner',
                name: 'Speed Demon',
                description: 'Spend 30 minutes in simulations',
                icon: '⚡',
                condition: (stats) => stats.totalPlayTime >= 1800,
                rarity: 'uncommon'
            },
            marathoner: {
                id: 'marathoner',
                name: 'Marathoner',
                description: 'Spend 2 hours in simulations',
                icon: '🏃',
                condition: (stats) => stats.totalPlayTime >= 7200,
                rarity: 'rare'
            },
            physicist: {
                id: 'physicist',
                name: 'Physicist',
                description: 'View 3 physics simulations',
                icon: '⚛️',
                condition: (stats) => stats.physicsViews >= 3,
                rarity: 'uncommon'
            },
            biologist: {
                id: 'biologist',
                name: 'Biologist',
                description: 'View 3 biology simulations',
                icon: '🧬',
                condition: (stats) => stats.biologyViews >= 3,
                rarity: 'uncommon'
            }
        };
    }
    
    initialize() {
        this.checkAchievements();
        this.setupAchievementButton();
        console.log('[ACHIEVEMENTS] System initialized');
    }
    
    setupAchievementButton() {
        const navbar = document.querySelector('.nav-right');
        if (!navbar) return;
        
        const achievementBtn = document.createElement('button');
        achievementBtn.id = 'achievement-button';
        achievementBtn.className = 'btn-achievements';
        achievementBtn.innerHTML = '🏆';
        achievementBtn.title = 'View achievements';
        achievementBtn.onclick = () => this.showAchievements();
        
        const statsBtn = navbar.querySelector('.btn-stats');
        if (statsBtn) {
            statsBtn.parentNode.insertBefore(achievementBtn, statsBtn);
        }
    }
    
    checkAchievements() {
        const stats = window.userPrefs.getStatistics();
        const prefs = window.userPrefs.preferences;
        
        Object.values(this.achievements).forEach(achievement => {
            if (!this.unlockedAchievements.includes(achievement.id)) {
                let isUnlocked = false;
                
                if (achievement.id.includes('collector') || achievement.id.includes('enthusiast')) {
                    isUnlocked = achievement.condition(prefs);
                } else {
                    isUnlocked = achievement.condition(stats);
                }
                
                if (isUnlocked) {
                    this.unlockAchievement(achievement);
                }
            }
        });
    }
    
    unlockAchievement(achievement) {
        this.unlockedAchievements.push(achievement.id);
        this.saveUnlocked();
        
        // Show notification
        this.showAchievementNotification(achievement);
        
        // Haptic feedback
        if (window.haptic) {
            window.haptic.success();
        }
        
        console.log('[ACHIEVEMENTS] Unlocked:', achievement.name);
    }
    
    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-popup';
        notification.innerHTML = `
            <div class="achievement-popup-content">
                <div class="achievement-popup-icon">${achievement.icon}</div>
                <div class="achievement-popup-text">
                    <div class="achievement-popup-title">Achievement Unlocked!</div>
                    <div class="achievement-popup-name">${achievement.name}</div>
                    <div class="achievement-popup-desc">${achievement.description}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    showAchievements() {
        const modal = this.createAchievementModal();
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') modal.remove();
        });
    }
    
    createAchievementModal() {
        const overlay = document.createElement('div');
        overlay.className = 'stats-modal-overlay';
        
        const unlocked = this.unlockedAchievements.length;
        const total = Object.keys(this.achievements).length;
        const progress = Math.round((unlocked / total) * 100);
        
        const achievementHTML = Object.values(this.achievements)
            .map(achievement => {
                const isUnlocked = this.unlockedAchievements.includes(achievement.id);
                return `
                    <div class="achievement-item ${isUnlocked ? 'unlocked' : 'locked'}">
                        <div class="achievement-icon">${achievement.icon}</div>
                        <div class="achievement-details">
                            <div class="achievement-name">${achievement.name}</div>
                            <div class="achievement-desc">${achievement.description}</div>
                        </div>
                        <div class="achievement-rarity rarity-${achievement.rarity}">${achievement.rarity}</div>
                    </div>
                `;
            }).join('');
        
        overlay.innerHTML = `
            <div class="stats-modal">
                <div class="modal-header">
                    <h2>🏆 Achievements</h2>
                    <button class="modal-close" onclick="this.closest('.stats-modal-overlay').remove()">×</button>
                </div>
                
                <div class="achievement-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-text">${unlocked} of ${total} Achievements Unlocked</div>
                </div>
                
                <div class="achievement-list">
                    ${achievementHTML}
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.stats-modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        
        return overlay;
    }
    
    saveUnlocked() {
        const userId = window.userPrefs.userId;
        localStorage.setItem(`achievements_${userId}`, JSON.stringify(this.unlockedAchievements));
    }
    
    loadUnlocked() {
        const userId = window.userPrefs ? window.userPrefs.userId : 'guest';
        const saved = localStorage.getItem(`achievements_${userId}`);
        return saved ? JSON.parse(saved) : [];
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.achievements = new AchievementSystem();
    });
} else {
    window.achievements = new AchievementSystem();
}