// ===== NAVBAR SCROLL BEHAVIOR SYSTEM =====
// Handles navbar auto-hide on scroll

class NavbarManager {
    constructor() {
        this.navbar = document.querySelector('.navbar');
        this.lastScrollY = 0;
        this.isHidden = false;
        
        if (!this.navbar) {
            console.warn('Navbar not found');
            return;
        }
        
        this.initialize();
    }
    
    initialize() {
        // Only enable on mobile devices
        if (window.innerWidth > 768) {
            return;
        }
        
        this.setupScrollListener();
        console.log('[VISIQ] Navbar manager initialized for mobile');
    }
    
    setupScrollListener() {
        window.addEventListener('scroll', () => this.handleScroll(), { 
            passive: true 
        });
    }
    
    handleScroll() {
        const currentScrollY = window.scrollY;
        
        // Scrolling down = hide navbar
        if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
            if (!this.isHidden) {
                this.hide();
            }
        } 
        // Scrolling up = show navbar
        else if (currentScrollY < this.lastScrollY) {
            if (this.isHidden) {
                this.show();
            }
        }
        
        // At top of page = always show
        if (currentScrollY < 50) {
            if (this.isHidden) {
                this.show();
            }
        }
        
        this.lastScrollY = currentScrollY;
    }
    
    hide() {
        if (!this.navbar || this.isHidden) return;
        document.body.classList.add('navbar-hidden');
        this.isHidden = true;
    }
    
    show() {
        if (!this.navbar || !this.isHidden) return;
        document.body.classList.remove('navbar-hidden');
        this.isHidden = false;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.navbarManager = new NavbarManager();
    });
} else {
    window.navbarManager = new NavbarManager();
}