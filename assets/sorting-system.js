// ===== SORTING SYSTEM =====
// Sort simulations by different criteria

class SortingSystem {
    constructor() {
        this.currentSort = 'default';
        this.setupSorting();
        console.log('[SORTING] Initialized');
    }
    
    setupSorting() {
        const navRight = document.querySelector('.nav-right');
        if (navRight) {
            const btn = document.createElement('button');
            btn.className = 'btn-sort';
            btn.textContent = '📊';
            btn.title = 'Sort by most used';
            btn.onclick = () => this.toggleSort();
            
            navRight.appendChild(btn);
        }
    }
    
    toggleSort() {
        const btn = document.querySelector('.btn-sort');
        this.currentSort = this.currentSort === 'default' ? 'used' : 'default';
        
        if (this.currentSort === 'used') {
            btn.classList.add('active');
            this.sortByMostUsed();
        } else {
            btn.classList.remove('active');
            this.sortDefault();
        }
    }
    
    sortByMostUsed() {
        const container = document.querySelector('.simulations-container');
        if (!container) return;
        
        const cards = Array.from(document.querySelectorAll('.sim-card-featured'));
        const stats = window.statsTracker?.stats?.simulationsViewed || [];
        
        cards.sort((a, b) => {
            const aId = this.getCardId(a);
            const bId = this.getCardId(b);
            const aIndex = stats.indexOf(aId);
            const bIndex = stats.indexOf(bId);
            
            // Recently viewed first
            return bIndex - aIndex;
        });
        
        cards.forEach(card => container.appendChild(card));
    }
    
    sortDefault() {
        location.reload();
    }
    
    getCardId(card) {
        const onclick = card.getAttribute('onclick') || card.parentElement?.getAttribute('onclick') || '';
        const match = onclick.match(/'([^']+)'/);
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