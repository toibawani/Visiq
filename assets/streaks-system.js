// ===== STREAKS & NOTIFICATIONS SYSTEM =====
// Track login streaks and motivational messages

class StreaksSystem {
    constructor() {
        this.streakData = this.loadStreakData();
        this.updateStreak();
        this.initialize();
    }
    
    initialize() {
        this.setupStreakDisplay();
        this.showStreakNotification();
        console.log('[STREAKS] System initialized');
    }
    
    loadStreakData() {
        const userId = window.userPrefs ? window.userPrefs.userId : 'guest';
        const saved = localStorage.getItem(`streak_${userId}`);
        
        return saved ? JSON.parse(saved) : {
            currentStreak: 0,
            bestStreak: 0,
            lastLoginDate: null,
            totalLogins: 0
        };
    }
    
    updateStreak() {
        const today = new Date().toDateString();
        const lastLogin = this.streakData.lastLoginDate;
        
        if (lastLogin === today) return; // Already counted today
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        
        if (lastLogin === yesterdayStr) {
            // Streak continues
            this.streakData.currentStreak += 1;
        } else if (!lastLogin) {
            // First login
            this.streakData.currentStreak = 1;
        } else {
            // Streak broken
            this.streakData.currentStreak = 1;
        }
        
        this.streakData.lastLoginDate = today;
        this.streakData.totalLogins += 1;
        
        // Update best streak
        if (this.streakData.currentStreak > this.streakData.bestStreak) {
            this.streakData.bestStreak = this.streakData.currentStreak;
        }
        
        this.saveStreakData();
    }
    
    saveStreakData() {
        const userId = window.userPrefs ? window.userPrefs.userId : 'guest';
        localStorage.setItem(`streak_${userId}`, JSON.stringify(this.streakData));
    }
    
    setupStreakDisplay() {
        const navbar = document.querySelector('.nav-right');
        if (!navbar) return;
        
        const streakIndicator = document.createElement('div');
        streakIndicator.className = 'streak-indicator';
        streakIndicator.innerHTML = `🔥 ${this.streakData.currentStreak}`;
        streakIndicator.title = `Best streak: ${this.streakData.bestStreak} days`;
        
        const muteBtn = navbar.querySelector('.btn-mute');
        if (muteBtn) {
            muteBtn.parentNode.insertBefore(streakIndicator, muteBtn);
        }
    }
    
    showStreakNotification() {
        const messages = {
            1: "🔥 You're on fire! 1 day streak started",
            2: "🔥 Keep it up! 2 day streak going",
            3: "🔥 On a roll! 3 day streak",
            5: "🔥 Incredible! 5 day streak - you're dedicated!",
            7: "🔥 Amazing! 1 week streak! Don't break it now!",
            10: "🔥 Wow! 10 day streak! You're a master!",
            14: "🔥 2 weeks! This is legendary!",
            30: "🔥 1 month streak! You're unstoppable!"
        };
        
        const streak = this.streakData.currentStreak;
        let message = messages[streak] || messages[Object.keys(messages).pop()];
        
        if (this.streakData.currentStreak === 1) {
            message = "🔥 Welcome back! Starting fresh today";
        }
        
        setTimeout(() => {
            if (window.UIPolish) {
                window.UIPolish.showInfo(message, 3000);
            }
        }, 1500);
    }
    
    getStreakData() {
        return {
            current: this.streakData.currentStreak,
            best: this.streakData.bestStreak,
            total: this.streakData.totalLogins
        };
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.streaks = new StreaksSystem();
    });
} else {
    window.streaks = new StreaksSystem();
}