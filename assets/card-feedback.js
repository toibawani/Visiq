// ===== CARD FEEDBACK & MICRO-INTERACTIONS =====
// Tactile visual feedback and sound effects for simulation cards and UI actions

class CardFeedback {
    constructor() {
        this.initialize();
    }

    initialize() {
        this.attachCardInteractions();
        console.log('[CARD-FEEDBACK] Initialized');
    }

    attachCardInteractions() {
        // Add subtle tactile press and hover sound/ripple
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.sim-card-featured');
            if (card && !e.target.closest('.btn-favorite')) {
                card.classList.add('card-pressed');
                setTimeout(() => card.classList.remove('card-pressed'), 180);
                
                // Track interaction
                if (window.statsTracker && typeof window.statsTracker.trackInteraction === 'function') {
                    window.statsTracker.trackInteraction('card_click');
                }
            }

            // Ripple feedback on buttons
            const btn = e.target.closest('button');
            if (btn) {
                this.triggerRipple(btn, e);
                if (window.statsTracker && typeof window.statsTracker.trackInteraction === 'function') {
                    window.statsTracker.trackInteraction('button_click');
                }
            }
        });
    }

    triggerRipple(button, event) {
        if (button.classList.contains('no-ripple')) return;
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'btn-ripple-effect';
        
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        button.style.position = button.style.position || 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        setTimeout(() => ripple.remove(), 500);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.cardFeedback = new CardFeedback();
    });
} else {
    window.cardFeedback = new CardFeedback();
}
