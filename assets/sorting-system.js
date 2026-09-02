// ===== SORTING SYSTEM =====
// In-place sorting of simulations by most viewed, title, or default curriculum order

class SortingSystem {
    constructor() {
        this.currentSort = 'default';
        this.originalCards = [];
        this.setupSorting();
        console.log('[SORTING] Initialized in-place sorting');
    }
    
    setupSorting() {
        // Find existing button or attach listener
        const btn = document.querySelector('.btn-sort');
        if (btn) {
            btn.onclick = (e) => {
                e.preventDefault();
                this.toggleSort();
            };
            btn.setAttribute('data-tooltip', 'Sort: Curriculum / Most Used / A-Z');
            btn.setAttribute('title', 'Sort simulations');
        }

        // Cache original order
        const container = document.querySelector('.simulations-container');
        if (container) {
            this.originalCards = Array.from(container.querySelectorAll('.sim-card-featured'));
        }
    }
    
    toggleSort() {
        const btn = document.querySelector('.btn-sort');
        const modes = ['default', 'used', 'alpha'];
        const currentIdx = modes.indexOf(this.currentSort);
        this.currentSort = modes[(currentIdx + 1) % modes.length];
        
        if (this.currentSort === 'used') {
            if (btn) {
                btn.classList.add('active');
                btn.textContent = '🔥';
                btn.setAttribute('data-tooltip', 'Sorted: Most Used (click for A-Z)');
            }
            this.sortByMostUsed();
        } else if (this.currentSort === 'alpha') {
            if (btn) {
                btn.classList.add('active');
                btn.textContent = '🔤';
                btn.setAttribute('data-tooltip', 'Sorted: Alphabetical (click for Default)');
            }
            this.sortByAlpha();
        } else {
            if (btn) {
                btn.classList.remove('active');
                btn.textContent = '📊';
                btn.setAttribute('data-tooltip', 'Sorted: Curriculum Default (click to Sort)');
            }
            this.sortDefault();
        }

        if (window.statsTracker && typeof window.statsTracker.trackInteraction === 'function') {
            window.statsTracker.trackInteraction('sort_toggle');
        }
    }
    
    sortByMostUsed() {
        const container = document.querySelector('.simulations-container');
        if (!container) return;
        
        const cards = Array.from(container.querySelectorAll('.sim-card-featured'));
        const stats = window.statsTracker?.stats?.simulationsViewed || [];
        
        cards.sort((a, b) => {
            const aId = this.getCardId(a);
            const bId = this.getCardId(b);
            const aIndex = stats.indexOf(aId);
            const bIndex = stats.indexOf(bId);
            
            // Viewed items first, most recently viewed higher
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return bIndex - aIndex;
        });
        
        cards.forEach(card => container.appendChild(card));
    }

    sortByAlpha() {
        const container = document.querySelector('.simulations-container');
        if (!container) return;

        const cards = Array.from(container.querySelectorAll('.sim-card-featured'));
        cards.sort((a, b) => {
            const aTitle = a.querySelector('.card-title')?.textContent.trim() || '';
            const bTitle = b.querySelector('.card-title')?.textContent.trim() || '';
            return aTitle.localeCompare(bTitle);
        });

        cards.forEach(card => container.appendChild(card));
    }
    
    sortDefault() {
        const container = document.querySelector('.simulations-container');
        if (!container || this.originalCards.length === 0) return;
        
        // Restore original order in-place without page reload!
        this.originalCards.forEach(card => container.appendChild(card));
    }
    
    getCardId(card) {
        const body = card.querySelector('.card-body');
        if (!body) return '';
        const oc = body.getAttribute('onclick') || '';
        const match = oc.match(/'([^']+)'/);
        return match ? match[1] : '';
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.sortingSystem = new SortingSystem();
    });
} else {
    window.sortingSystem = new SortingSystem();
}