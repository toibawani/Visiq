// ===== DYNAMIC KEYBOARD ACCESSIBILITY SHORTCUTS =====
// Power user navigation and quick-toggle shortcuts modal

class KeyboardShortcuts {
    constructor() {
        this.isModalOpen = false;
        this.setupShortcuts();
        console.log('[KEYBOARD] Dynamic shortcuts engine loaded');
    }
    
    setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore shortcuts if focused in an input field (except Escape)
            if (this.isInInput(e.target)) {
                if (e.key === 'Escape') {
                    e.target.blur();
                    e.target.value = '';
                    if (window.advancedSearch) {
                        window.advancedSearch.performSearch('');
                    }
                }
                return;
            }

            // ? or Shift + /: Toggle shortcuts modal
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                this.toggleHelp();
                return;
            }

            // /: Quick search focus
            if (e.key === '/') {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            // ESC: Close drawer / modal / return to gallery
            if (e.key === 'Escape') {
                if (this.isModalOpen) {
                    this.closeHelp();
                    return;
                }
                if (window.statsTracker && window.statsTracker.isDrawerOpen) {
                    window.statsTracker.closeDrawer();
                    return;
                }
                const simView = document.getElementById('simulation-view');
                if (simView && simView.classList.contains('active')) {
                    if (window.gallery) window.gallery.backToGallery();
                    return;
                }
            }

            // R: Reset simulation
            if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
                const simView = document.getElementById('simulation-view');
                if (simView && simView.classList.contains('active')) {
                    if (window.gallery) {
                        window.gallery.resetSimulation();
                        this.showFeedbackToast('Simulation Reset (R)');
                    }
                }
                return;
            }

            // T: Toggle theme
            if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                if (window.themeToggle) {
                    window.themeToggle.toggleTheme();
                    this.showFeedbackToast(`Theme: ${window.themeToggle.currentTheme === 'dark' ? 'Deep Dark' : 'High-Clarity Light'}`);
                }
                return;
            }

            // S: Toggle stats drawer
            if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                if (window.statsTracker) {
                    window.statsTracker.toggleDrawer();
                }
                return;
            }

            // F: Toggle favorites filter
            if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                if (window.favoritesFilter) {
                    window.favoritesFilter.toggleFavoritesOnly();
                }
                return;
            }

            // Number keys 1-5 to quick-launch simulations from gallery
            if (['1', '2', '3', '4', '5'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                const galleryView = document.getElementById('gallery-view');
                if (galleryView && galleryView.classList.contains('active') && typeof SIMULATIONS !== 'undefined') {
                    const idx = parseInt(e.key, 10) - 1;
                    if (SIMULATIONS[idx] && window.gallery) {
                        window.gallery.openSimulation(SIMULATIONS[idx].id);
                        this.showFeedbackToast(`Launched: ${SIMULATIONS[idx].title}`);
                    }
                }
            }
        });
    }
    
    isInInput(element) {
        return element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable);
    }
    
    toggleHelp() {
        if (this.isModalOpen) {
            this.closeHelp();
        } else {
            this.openHelp();
        }
    }

    openHelp() {
        const existing = document.querySelector('.keyboard-shortcuts-modal-overlay');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'keyboard-shortcuts-modal-overlay active';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Keyboard Shortcuts Guide');
        
        modal.innerHTML = `
            <div class="keyboard-shortcuts-modal">
                <div class="modal-header">
                    <div class="modal-title-row">
                        <span class="modal-title-icon">⌨️</span>
                        <div>
                            <h2>Keyboard Shortcuts</h2>
                            <p class="modal-subtitle">Navigate VISIQ seamlessly at full speed</p>
                        </div>
                    </div>
                    <button class="modal-close-btn" title="Close (Esc)" aria-label="Close modal">✕</button>
                </div>
                
                <div class="shortcuts-grid">
                    <div class="shortcuts-category">
                        <div class="category-title">🧭 Navigation & Discovery</div>
                        <div class="shortcut-row">
                            <span class="shortcut-desc">Instant search focus</span>
                            <kbd class="key-badge">/</kbd>
                        </div>
                        <div class="shortcut-row">
                            <span class="shortcut-desc">Back to Gallery / Close modal</span>
                            <kbd class="key-badge">Esc</kbd>
                        </div>
                        <div class="shortcut-row">
                            <span class="shortcut-desc">Quick launch simulation 1–5</span>
                            <div class="kbd-group"><kbd class="key-badge">1</kbd>–<kbd class="key-badge">5</kbd></div>
                        </div>
                        <div class="shortcut-row">
                            <span class="shortcut-desc">Toggle Favorites view</span>
                            <kbd class="key-badge">F</kbd>
                        </div>
                    </div>

                    <div class="shortcuts-category">
                        <div class="category-title">⚛️ Simulation Controls</div>
                        <div class="shortcut-row">
                            <span class="shortcut-desc">Reset active simulation</span>
                            <kbd class="key-badge">R</kbd>
                        </div>
                        <div class="shortcut-row">
                            <span class="shortcut-desc">Toggle vectors / Reset orbit</span>
                            <kbd class="key-badge">Space</kbd>
                        </div>
                        <div class="shortcut-row">
                            <span class="shortcut-desc">Drag objects / sliders</span>
                            <span class="key-note">Mouse / Touch</span>
                        </div>
                    </div>

                    <div class="shortcuts-category">
                        <div class="category-title">⚡ Environment & Analytics</div>
                        <div class="shortcut-row">
                            <span class="shortcut-desc">Toggle Dark / High-Clarity mode</span>
                            <kbd class="key-badge">T</kbd>
                        </div>
                        <div class="shortcut-row">
                            <span class="shortcut-desc">Toggle Session Analytics drawer</span>
                            <kbd class="key-badge">S</kbd>
                        </div>
                        <div class="shortcut-row">
                            <span class="shortcut-desc">Show / hide this shortcuts guide</span>
                            <kbd class="key-badge">?</kbd>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <div class="modal-tip">💡 Pro-tip: Press <kbd class="key-badge-sm">Esc</kbd> anytime to return to the library.</div>
                    <button class="btn-got-it">Got it</button>
                </div>
            </div>
        `;

        modal.onclick = (e) => {
            if (e.target === modal) this.closeHelp();
        };

        modal.querySelector('.modal-close-btn').onclick = () => this.closeHelp();
        modal.querySelector('.btn-got-it').onclick = () => this.closeHelp();

        document.body.appendChild(modal);
        this.isModalOpen = true;

        if (window.statsTracker && typeof window.statsTracker.trackInteraction === 'function') {
            window.statsTracker.trackInteraction('shortcuts_open');
        }
    }

    closeHelp() {
        const modal = document.querySelector('.keyboard-shortcuts-modal-overlay');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 200);
        }
        this.isModalOpen = false;
    }

    showFeedbackToast(message) {
        let toast = document.querySelector('.key-feedback-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'key-feedback-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('visible');

        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('visible');
        }, 1800);
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