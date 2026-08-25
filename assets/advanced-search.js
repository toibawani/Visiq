class AdvancedSearch {
    constructor() {
        this.setupSearch();
        console.log('[ADVANCED-SEARCH] Initialized');
    }
    
    setupSearch() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => this.performSearch(e.target.value));
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                this.performSearch('');
            }
        });
    }
    
    performSearch(query) {
        const cards = document.querySelectorAll('.sim-card-featured');
        const q = query.toLowerCase().trim();
        
        if (!q) {
            cards.forEach(card => card.style.display = 'flex');
            this.hideNoResults();
            return;
        }
        
        let visibleCount = 0;
        
        cards.forEach(card => {
            const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
            const desc = card.querySelector('.card-body p')?.textContent.toLowerCase() || '';
            const category = card.querySelector('.card-category')?.textContent.toLowerCase() || '';
            const tags = Array.from(card.querySelectorAll('.tag')).map(t => t.textContent.toLowerCase());
            
            const matches = 
                title.includes(q) ||
                desc.includes(q) ||
                category.includes(q) ||
                tags.some(tag => tag.includes(q));
            
            if (matches) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        if (visibleCount === 0) {
            this.showNoResults();
        } else {
            this.hideNoResults();
        }
    }
    
    showNoResults() {
        let noResults = document.querySelector('.no-results-message');
        const container = document.querySelector('.simulations-container');
        
        if (!noResults && container) {
            noResults = document.createElement('div');
            noResults.className = 'no-results-message';
            noResults.innerHTML = `
                <div class="no-results-content">
                    <p>No simulations found for your search.</p>
                    <p style="font-size: 12px; color: #666; margin-top: 8px;">Try searching: forces, waves, chaos, gravity</p>
                </div>
            `;
            container.appendChild(noResults);
        }
    }
    
    hideNoResults() {
        const noResults = document.querySelector('.no-results-message');
        if (noResults) noResults.remove();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.advancedSearch = new AdvancedSearch();
    });
} else {
    window.advancedSearch = new AdvancedSearch();
}