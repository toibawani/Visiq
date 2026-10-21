// ===== THEME TOGGLE (DARK & HIGH-CLARITY) =====
// Switches between Deep Obsidian Dark and High-Clarity Light modes with WCAG AAA contrast
// System colour-scheme preference, used as a fallback when no theme is saved.
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

class ThemeToggle {
    constructor() {
        // Fall back to the system colour scheme when the user has not saved one.
        this.currentTheme = localStorage.getItem('visiq-theme') || (systemPrefersDark ? 'dark' : 'light');
        this.setupToggle();
        this.applyTheme();
        console.log('[THEME] Initialized in', this.currentTheme, 'mode');
    }
    
    setupToggle() {
        const btn = document.querySelector('.btn-theme-toggle');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });
        }
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('visiq-theme', this.currentTheme);
        this.applyTheme();

        if (window.statsTracker && typeof window.statsTracker.trackInteraction === 'function') {
            window.statsTracker.trackInteraction('theme_toggle');
        }
    }
    
    applyTheme() {
        const root = document.documentElement;
        root.setAttribute('data-theme', this.currentTheme);

        const btn = document.querySelector('.btn-theme-toggle');
        if (btn) {
            if (this.currentTheme === 'dark') {
                btn.textContent = 'Light Mode';
                btn.setAttribute('title', 'Switch to High-Clarity Light Mode (T)');
                btn.setAttribute('data-tooltip', 'High-Clarity Light Mode (T)');
                btn.setAttribute('aria-label', 'Switch to High-Clarity Light Mode');
            } else {
                btn.textContent = 'Dark Mode';
                btn.setAttribute('title', 'Switch to Deep Obsidian Dark Mode (T)');
                btn.setAttribute('data-tooltip', 'Deep Dark Mode (T)');
                btn.setAttribute('aria-label', 'Switch to Deep Obsidian Dark Mode');
            }
        }

        // Dispatch custom event for canvas or other components
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: this.currentTheme } }));
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeToggle = new ThemeToggle();
    });
} else {
    window.themeToggle = new ThemeToggle();
}