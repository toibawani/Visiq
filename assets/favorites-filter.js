// ===== FAVORITES FILTER =====
// Show only favorited simulations

class FavoritesFilter {
    constructor() {
        this.setupFilter();
        console.log('[FAVORITES-FILTER] Initialized');
    }
    
    setupFilter() {
        // Add favorites button to navbar
        const navRight = document.querySelector('.nav-right');
        if (navRight) {
            const btn = document.createElement('button');
            btn.className = 'btn-favorites-toggle';
            btn.textContent = '❤️';
            btn.title = 'Show favorites only';
            btn.onclick = () => this.toggleFavoritesOnly();
            
            // Insert before stats button
            const statsBtn = navRight.querySelector('.btn-stats');
            if (statsBtn) {
                navRight.insertBefore(btn, statsBtn);
            } else {
                navRight.appendChild(btn);
            }
        }
    }
    
    toggleFavoritesOnly() {
        const container = document.querySelector('.simulations-container');
        if (!container) return;
        
        const cards = document.querySelectorAll('.sim-card-featured');
        const btn = document.querySelector('.btn-favorites-toggle');
        const isFavoritesMode = btn.classList.toggle('active');
        
        cards.forEach(card => {
            const favoriteBtn = card.querySelector('.btn-favorite');
            const isFav = favoriteBtn && favoriteBtn.textContent === '❤️';
            
            if (isFavoritesMode) {
                card.style.display = isFav ? 'flex' : 'none';
            } else {
                card.style.display = 'flex';
            }
        });
        
        // Show message if no favorites
        if (isFavoritesMode) {
            const visibleCards = Array.from(cards).filter(c => c.style.display !== 'none');
            if (visibleCards.length === 0) {
                const msg = document.createElement('div');
                msg.className = 'no-favorites-msg';
                msg.textContent = 'No favorites yet. Click ❤️ to save simulations!';
                container.appendChild(msg);
            }
        } else {
            const msg = document.querySelector('.no-favorites-msg');
            if (msg) msg.remove();
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