// ===== ADVANCED SEARCH SYSTEM =====
// Live search with tag filtering and empathetic suggestions

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
                searchInput.blur();
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
            this.showNoResults(query);
        } else {
            this.hideNoResults();
        }

        if (window.statsTracker && typeof window.statsTracker.trackInteraction === 'function') {
            window.statsTracker.trackInteraction('search');
        }
    }
    
    showNoResults(query) {
        let noResults = document.querySelector('.no-results-message');
        const container = document.querySelector('.simulations-container');
        
        if (!noResults && container) {
            noResults = document.createElement('div');
            noResults.className = 'no-results-message';
            container.appendChild(noResults);
        }
        
        if (noResults) {
            noResults.innerHTML = `
                <div class="empty-state-card">
                    <span class="empty-state-emoji">🔍</span>
                    <h3>No simulations matched "${this.escapeHtml(query)}"</h3>
                    <p>Try searching for core physics and science principles, or explore these popular topics:</p>
                    <div class="empty-tags-row">
                        <button class="pill-btn" onclick="window.advancedSearch.applyQuery('forces')">⚛️ Forces</button>
                        <button class="pill-btn" onclick="window.advancedSearch.applyQuery('waves')">〰️ Waves</button>
                        <button class="pill-btn" onclick="window.advancedSearch.applyQuery('chaos')">🎯 Chaos</button>
                        <button class="pill-btn" onclick="window.advancedSearch.applyQuery('gravity')">🌌 Gravity</button>
                    </div>
                    <button class="btn-clear-search" onclick="window.advancedSearch.clearSearch()">Clear Search</button>
                </div>
            `;
        }
    }
    
    hideNoResults() {
        const noResults = document.querySelector('.no-results-message');
        if (noResults) noResults.remove();
    }

    applyQuery(text) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = text;
            this.performSearch(text);
        }
    }

    clearSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
            this.performSearch('');
        }
    }

    escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.advancedSearch = new AdvancedSearch();
    });
} else {
    window.advancedSearch = new AdvancedSearch();
}