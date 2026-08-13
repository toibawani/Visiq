// ===== STATUS INDICATOR SYSTEM =====
// Shows connection status and loading progress

class StatusIndicator {
    constructor() {
        this.loadingBar = null;
        this.statusIndicator = null;
        this.isOnline = navigator.onLine;
        this.initialize();
    }
    
    initialize() {
        this.createElements();
        this.setupListeners();
        console.log('[STATUS] Indicator initialized');
    }
    
    createElements() {
        // Create loading bar
        this.loadingBar = document.createElement('div');
        this.loadingBar.className = 'page-loading-bar';
        document.body.appendChild(this.loadingBar);
        
        // Create status indicator
        this.statusIndicator = document.createElement('div');
        this.statusIndicator.className = 'connection-status';
        document.body.appendChild(this.statusIndicator);
    }
    
    setupListeners() {
        // Monitor online/offline status
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Show loading bar on navigation
        window.addEventListener('beforeunload', () => this.showLoading());
        window.addEventListener('load', () => this.hideLoading());
    }
    
    handleOnline() {
        this.isOnline = true;
        this.showStatus('Connected', 'success');
        console.log('[STATUS] Online');
    }
    
    handleOffline() {
        this.isOnline = false;
        this.showStatus('No Connection', 'error');
        console.log('[STATUS] Offline');
    }
    
    showLoading() {
        if (this.loadingBar) {
            this.loadingBar.classList.remove('active');
            this.loadingBar.style.width = '0%';
        }
    }
    
    hideLoading() {
        if (this.loadingBar) {
            this.loadingBar.classList.add('active');
            setTimeout(() => {
                this.loadingBar.style.width = '0%';
                this.loadingBar.classList.remove('active');
            }, 500);
        }
    }
    
    showStatus(message, type = 'info') {
        if (!this.statusIndicator) return;
        
        this.statusIndicator.textContent = message;
        this.statusIndicator.className = `connection-status show ${type}`;
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            this.statusIndicator.classList.remove('show');
        }, 4000);
    }
    
    // Public methods for other systems to use
    startLoading() {
        this.showLoading();
    }
    
    stopLoading() {
        this.hideLoading();
    }
    
    showNotification(message, type = 'info') {
        this.showStatus(message, type);
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.statusIndicator = new StatusIndicator();
    });
} else {
    window.statusIndicator = new StatusIndicator();
}