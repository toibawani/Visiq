// ===== KEYBOARD SHORTCUTS =====
// Navigate VISIQ with keyboard

class KeyboardShortcuts {
    constructor() {
        this.setupShortcuts();
        console.log('[KEYBOARD] Shortcuts loaded');
    }
    
    setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            // ESC: Back to gallery
            if (e.key === 'Escape') {
                const simView = document.getElementById('simulation-view');
                if (simView && simView.classList.contains('active')) {
                    window.gallery.backToGallery();
                }
            }
            
            // R: Reset simulation
            if ((e.key === 'r' || e.key === 'R') && e.ctrlKey === false && e.metaKey === false) {
                const simView = document.getElementById('simulation-view');
                if (simView && simView.classList.contains('active')) {
                    window.gallery.resetSimulation();
                }
            }
            
            // ?: Show help
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                this.showHelp();
            }
            
            // /: Focus search
            if (e.key === '/' && !this.isInInput(e.target)) {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
        });
    }
    
    isInInput(element) {
        return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';
    }
    
    showHelp() {
        const existing = document.querySelector('.keyboard-help');
        if (existing) {
            existing.remove();
            return;
        }
        
        const help = document.createElement('div');
        help.className = 'keyboard-help';
        help.innerHTML = `
            <div class="help-content">
                <div class="help-close" onclick="this.parentElement.parentElement.remove()">×</div>
                <h3>Keyboard Shortcuts</h3>
                <div class="help-list">
                    <div class="help-item">
                        <kbd>/</kbd>
                        <span>Focus search</span>
                    </div>
                    <div class="help-item">
                        <kbd>R</kbd>
                        <span>Reset simulation</span>
                    </div>
                    <div class="help-item">
                        <kbd>ESC</kbd>
                        <span>Back to gallery</span>
                    </div>
                    <div class="help-item">
                        <kbd>?</kbd>
                        <span>Show this help</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(help);
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.keyboard = new KeyboardShortcuts();
    });
} else {
    window.keyboard = new KeyboardShortcuts();
}