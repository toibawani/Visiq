// ===== ANIMATIONS ENGINE =====
// Premium micro-animations and transitions

class AnimationsEngine {
    constructor() {
        this.initialize();
    }
    
    initialize() {
        this.setupPageTransitions();
        this.setupCardAnimations();
        this.setupButtonAnimations();
        this.setupScrollAnimations();
        console.log('[ANIMATIONS] Engine initialized');
    }
    
    setupPageTransitions() {
        // Smooth fade between views
        const views = document.querySelectorAll('.view');
        views.forEach(view => {
            view.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        });
    }
    
    setupCardAnimations() {
        // Stagger card animations on load
        const cards = document.querySelectorAll('.sim-card');
        cards.forEach((card, index) => {
            card.style.animation = `slideInUp 0.5s ease-out ${index * 0.05}s both`;
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-8px) scale(1.02)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }
    
    setupButtonAnimations() {
        // Ripple effect on button click
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.createRipple(e, btn);
            });
        });
    }
    
    setupScrollAnimations() {
        // Fade in sections on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.category-section').forEach(section => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            section.style.transition = 'all 0.6s ease-out';
            observer.observe(section);
        });
    }
    
    createRipple(event, button) {
        const ripple = document.createElement('span');
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.pointerEvents = 'none';
        ripple.style.opacity = '0.6';
        ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.animation = 'ripple 0.6s ease-out';
        
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    }
    
    // Animate favorite button
    animateFavorite(button) {
        button.style.animation = 'heartBeat 0.6s ease-out';
        if (window.haptic) window.haptic.medium();
    }
    
    // Animate achievement unlock
    animateAchievement(popup) {
        popup.style.animation = 'slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }
    
    // Animate streak update
    animateStreak(indicator) {
        indicator.style.animation = 'pulse 0.6s ease-out';
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(40px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes ripple {
        from {
            transform: scale(0);
            opacity: 0.8;
        }
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes heartBeat {
        0% { transform: scale(1); }
        14% { transform: scale(1.3); }
        28% { transform: scale(1); }
        42% { transform: scale(1.3); }
        70% { transform: scale(1); }
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    @keyframes fadeInScale {
        from {
            opacity: 0;
            transform: scale(0.9);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
`;
document.head.appendChild(style);

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.animationsEngine = new AnimationsEngine();
    });
} else {
    window.animationsEngine = new AnimationsEngine();
}