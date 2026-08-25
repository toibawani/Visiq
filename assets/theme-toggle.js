class ThemeToggle {
    constructor() {
        this.currentTheme = localStorage.getItem('visiq-theme') || 'dark';
        this.setupToggle();
        this.applyTheme();
    }
    
    setupToggle() {
        const btn = document.querySelector('.btn-theme-toggle');
        if (btn) {
            btn.addEventListener('click', () => this.toggleTheme());
        }
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('visiq-theme', this.currentTheme);
        this.applyTheme();
    }
    
    applyTheme() {
        const root = document.documentElement;
        if (this.currentTheme === 'light') {
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--bg-secondary', '#f5f5f5');
            root.style.setProperty('--text-primary', '#1a1a1a');
            root.style.setProperty('--text-secondary', '#666');
            document.body.style.background = '#ffffff';
            document.body.style.color = '#1a1a1a';
        } else {
            root.style.setProperty('--bg-primary', '#0a0a0a');
            root.style.setProperty('--bg-secondary', '#1a1a1a');
            root.style.setProperty('--text-primary', '#e0e0e0');
            root.style.setProperty('--text-secondary', '#888');
            document.body.style.background = '#0a0a0a';
            document.body.style.color = '#e0e0e0';
        }
        
        const btn = document.querySelector('.btn-theme-toggle');
        if (btn) {
            btn.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeToggle = new ThemeToggle();
    });
} else {
    window.themeToggle = new ThemeToggle();
}