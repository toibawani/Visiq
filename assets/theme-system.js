// ===== ADVANCED THEME SYSTEM =====
// Multiple themes and customization

class ThemeSystem {
    constructor() {
        this.themes = {
            dark: {
                name: 'Dark (Premium)',
                primary: '#0a0a0f',
                accent: '#00d9ff'
            },
            midnight: {
                name: 'Midnight Blue',
                primary: '#0f1419',
                accent: '#00d9ff'
            },
            cyberpunk: {
                name: 'Cyberpunk',
                primary: '#0a0015',
                accent: '#ff006e'
            },
            ocean: {
                name: 'Ocean',
                primary: '#0a1428',
                accent: '#00d9ff'
            }
        };
        
        this.currentTheme = this.loadTheme();
        this.initialize();
    }
    
    initialize() {
        this.applyTheme(this.currentTheme);
        this.setupThemeButton();
        console.log('[THEME] System initialized');
    }
    
    setupThemeButton() {
        const navbar = document.querySelector('.nav-right');
        if (!navbar) return;
        
        const themeBtn = document.createElement('button');
        themeBtn.id = 'theme-button';
        themeBtn.className = 'btn-theme';
        themeBtn.innerHTML = '🎨';
        themeBtn.title = 'Change theme';
        themeBtn.onclick = () => this.showThemeSelector();
        
        const muteBtn = navbar.querySelector('.btn-mute');
        if (muteBtn) {
            muteBtn.parentNode.insertBefore(themeBtn, muteBtn);
        }
    }
    
    showThemeSelector() {
        const modal = this.createThemeModal();
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    createThemeModal() {
        const overlay = document.createElement('div');
        overlay.className = 'stats-modal-overlay';
        
        const themeHTML = Object.entries(this.themes)
            .map(([key, theme]) => {
                const isActive = this.currentTheme === key;
                return `
                    <div class="theme-option ${isActive ? 'active' : ''}" onclick="window.themeSystem.switchTheme('${key}')">
                        <div class="theme-preview" style="background: ${theme.primary}; border: 2px solid ${theme.accent};"></div>
                        <div class="theme-name">${theme.name}</div>
                        ${isActive ? '<div class="theme-checkmark">✓</div>' : ''}
                    </div>
                `;
            }).join('');
        
        overlay.innerHTML = `
            <div class="stats-modal">
                <div class="modal-header">
                    <h2>Choose Theme</h2>
                    <button class="modal-close" onclick="this.closest('.stats-modal-overlay').remove()">×</button>
                </div>
                
                <div class="theme-grid">
                    ${themeHTML}
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.stats-modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        
        return overlay;
    }
    
    switchTheme(themeName) {
        this.currentTheme = themeName;
        this.applyTheme(themeName);
        this.saveTheme();
        
        // Show feedback
        if (window.haptic) {
            window.haptic.medium();
        }
        
        if (window.UIPolish) {
            window.UIPolish.showSuccess('Theme changed to ' + this.themes[themeName].name);
        }
    }
    
    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;
        
        document.documentElement.style.setProperty('--bg-primary', theme.primary);
        document.documentElement.style.setProperty('--accent-primary', theme.accent);
    }
    
    saveTheme() {
        const userId = window.userPrefs ? window.userPrefs.userId : 'guest';
        localStorage.setItem(`theme_${userId}`, this.currentTheme);
    }
    
    loadTheme() {
        const userId = window.userPrefs ? window.userPrefs.userId : 'guest';
        return localStorage.getItem(`theme_${userId}`) || 'dark';
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeSystem = new ThemeSystem();
    });
} else {
    window.themeSystem = new ThemeSystem();
}