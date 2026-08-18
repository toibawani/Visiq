// ===== SEARCH SYSTEM =====
// Find simulations quickly

class SearchSystem {
    constructor() {
        this.setupSearch();
    }
    
    setupSearch() {
        const searchBox = document.getElementById('search-input');
        if (!searchBox) return;
        
        searchBox.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }
    
    handleSearch(query) {
        if (!query.trim()) {
            this.showAllCards();
            return;
        }
        
        const q = query.toLowerCase();
        const cards = document.querySelectorAll('.sim-card-featured');
        
        cards.forEach(card => {
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            const desc = card.querySelector('.card-body p').textContent.toLowerCase();
            const tags = Array.from(card.querySelectorAll('.tag')).map(t => t.textContent.toLowerCase());
            
            const matches = title.includes(q) || 
                          desc.includes(q) || 
                          tags.some(tag => tag.includes(q));
            
            card.style.display = matches ? 'flex' : 'none';
        });
        
        // Show no results message if needed
        this.showNoResults();
    }
    
    showAllCards() {
        document.querySelectorAll('.sim-card-featured').forEach(card => {
            card.style.display = 'flex';
        });
        this.hideNoResults();
    }
    
    showNoResults() {
        const container = document.querySelector('.simulations-container');
        let noResults = document.querySelector('.no-results');
        
        const hasVisibleCards = Array.from(document.querySelectorAll('.sim-card-featured'))
            .some(card => card.style.display !== 'none');
        
        if (!hasVisibleCards && !noResults) {
            noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.innerHTML = '<p>No simulations found. Try different keywords.</p>';
            container.appendChild(noResults);
        }
    }
    
    hideNoResults() {
        const noResults = document.querySelector('.no-results');
        if (noResults) noResults.remove();
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.searchSystem = new SearchSystem();
    });
} else {
    window.searchSystem = new SearchSystem();
}