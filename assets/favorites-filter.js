// ===== FAVORITES FILTER =====
// Filter simulation library to favorited items with empathetic empty states

class FavoritesFilter {
    constructor() {
        this.isFavoritesMode = false;
        this.setupFilter();
        console.log('[FAVORITES-FILTER] Initialized');
    }
    
    setupFilter() {
        // Bind to existing button in navbar
        const btn = document.querySelector('.btn-favorites-toggle');
        if (btn) {
            btn.onclick = (e) => {
                e.preventDefault();
                this.toggleFavoritesOnly();
            };
            btn.setAttribute('data-tooltip', 'Filter Favorites Only (F)');
            btn.setAttribute('title', 'Show favorites only');
        }
    }
    
    toggleFavoritesOnly() {
        const container = document.querySelector('.simulations-container');
        if (!container) return;
        
        const cards = document.querySelectorAll('.sim-card-featured');
        const btn = document.querySelector('.btn-favorites-toggle');
        this.isFavoritesMode = !this.isFavoritesMode;

        if (btn) {
            btn.classList.toggle('active', this.isFavoritesMode);
            btn.setAttribute('data-tooltip', this.isFavoritesMode ? 'Show All Simulations (F)' : 'Filter Favorites Only (F)');
        }
        
        let visibleCount = 0;
        cards.forEach(card => {
            const favoriteBtn = card.querySelector('.btn-favorite');
            const isFav = favoriteBtn && favoriteBtn.textContent.includes('❤️');
            
            if (this.isFavoritesMode) {
                if (isFav) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            } else {
                card.style.display = 'flex';
                visibleCount++;
            }
        });
        
        // Empathetic empty state when no favorites exist
        const existingMsg = document.querySelector('.no-favorites-msg');
        if (existingMsg) existingMsg.remove();

        if (this.isFavoritesMode && visibleCount === 0) {
            const msg = document.createElement('div');
            msg.className = 'no-favorites-msg';
            msg.innerHTML = `
                <div class="empty-state-card">
                    <span class="empty-state-emoji">❤️</span>
                    <h3>Your Favorites Deck is Empty</h3>
                    <p>Tap the heart icon (🤍) on any simulation card to pin your favorite topics here for quick review.</p>
                    <button class="btn-clear-filter" onclick="window.favoritesFilter.toggleFavoritesOnly()">Show All Simulations</button>
                </div>
            `;
            container.appendChild(msg);
        }

        if (window.statsTracker && typeof window.statsTracker.trackInteraction === 'function') {
            window.statsTracker.trackInteraction('favorites_filter_toggle');
        }
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.favoritesFilter = new FavoritesFilter();
    });
} else {
    window.favoritesFilter = new FavoritesFilter();
}