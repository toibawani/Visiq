// ===== STATE MANAGEMENT =====
// Beautiful loading, error, and empty states

class StateManager {
    constructor() {
        this.initialize();
    }
    
    initialize() {
        this.setupStateHandlers();
        console.log('[STATE] Manager initialized');
    }
    
    setupStateHandlers() {
        // Intercept errors
        window.addEventListener('error', (e) => {
            this.showErrorState(e.message);
        });
    }
    
    showLoadingState(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.className = 'state-overlay loading-state';
        overlay.innerHTML = `
            <div class="state-content">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
                <p class="state-message">${message}</p>
                <p class="state-subtitle">Preparing your experience...</p>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }
    
    showErrorState(title, message = 'Something went wrong') {
        const overlay = document.createElement('div');
        overlay.className = 'state-overlay error-state';
        overlay.innerHTML = `
            <div class="state-content">
                <div class="error-icon">⚠️</div>
                <h2 class="state-title">${title}</h2>
                <p class="state-message">${message}</p>
                <button class="btn-retry" onclick="location.reload()">
                    Try Again
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }
    
    showEmptyState(icon, title, message) {
        const container = document.createElement('div');
        container.className = 'empty-state';
        container.innerHTML = `
            <div class="empty-icon">${icon}</div>
            <h3 class="empty-title">${title}</h3>
            <p class="empty-message">${message}</p>
        `;
        return container;
    }
    
    showSuccessState(message) {
        const overlay = document.createElement('div');
        overlay.className = 'state-overlay success-state';
        overlay.innerHTML = `
            <div class="state-content">
                <div class="success-icon">✓</div>
                <p class="state-message">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => overlay.remove(), 300);
        }, 1500);
        
        return overlay;
    }
}

// Add CSS
const style = document.createElement('style');
style.textContent = `
    .state-overlay {
        position: fixed;
        inset: 0;
        background: rgba(5, 5, 7, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 5000;
        animation: fadeIn 0.3s ease-out;
    }
    
    .state-content {
        text-align: center;
        max-width: 400px;
    }
    
    .loading-spinner {
        width: 60px;
        height: 60px;
        margin: 0 auto 20px;
    }
    
    .spinner {
        width: 100%;
        height: 100%;
        border: 4px solid rgba(0, 217, 255, 0.2);
        border-top-color: var(--accent-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    .state-message {
        font-size: 16px;
        color: var(--text-primary);
        margin: 0;
    }
    
    .state-subtitle {
        font-size: 13px;
        color: var(--text-secondary);
        margin: 8px 0 0 0;
    }
    
    .error-icon, .success-icon {
        font-size: 64px;
        margin-bottom: 16px;
        animation: fadeInScale 0.4s ease-out;
    }
    
    .state-title {
        font-size: 20px;
        color: var(--text-primary);
        margin: 12px 0;
    }
    
    .btn-retry {
        padding: 12px 24px;
        margin-top: 16px;
        background: var(--accent-primary);
        color: var(--bg-primary);
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .btn-retry:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 217, 255, 0.3);
    }
    
    .empty-state {
        padding: 40px;
        text-align: center;
        color: var(--text-secondary);
    }
    
    .empty-icon {
        font-size: 64px;
        margin-bottom: 16px;
    }
    
    .empty-title {
        font-size: 18px;
        color: var(--text-primary);
        margin: 12px 0;
    }
    
    .empty-message {
        font-size: 14px;
        margin: 0;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes fadeInScale {
        from {
            opacity: 0;
            transform: scale(0.8);
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
        window.stateManager = new StateManager();
    });
} else {
    window.stateManager = new StateManager();
}