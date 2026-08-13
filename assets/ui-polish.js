// ===== UI POLISH SYSTEM =====
// Adds visual feedback, toasts, loading states, and smooth animations

class UIPolish {
    static showLoading(message = 'Loading simulation...') {
        const loading = document.getElementById('loading-screen');
        if (loading) {
            loading.style.display = 'flex';
            const text = loading.querySelector('p');
            if (text) text.textContent = message;
        }
    }
    
    static hideLoading() {
        const loading = document.getElementById('loading-screen');
        if (loading) {
            loading.style.display = 'none';
        }
    }
    
    static showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            toast.style.animation = 'slideInLeft 0.3s ease-out reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
    
    static addButtonFeedback(button) {
        if (!button) return;
        
        button.addEventListener('click', function() {
            // Visual scale feedback
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 100);
            
            // Play sound if available
            if (window.soundManager && typeof window.soundManager.playChime === 'function') {
                window.soundManager.playChime(700, 0.1);
            }
        });
    }
    
    static addTooltip(element, text, position = 'top') {
        if (!element) return;
        
        element.addEventListener('mouseenter', () => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = text;
            
            // Position tooltip
            if (position === 'top') {
                tooltip.style.bottom = '100%';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translateX(-50%) translateY(-5px)';
            } else if (position === 'bottom') {
                tooltip.style.top = '100%';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translateX(-50%) translateY(5px)';
            }
            
            element.style.position = 'relative';
            element.appendChild(tooltip);
        });
        
        element.addEventListener('mouseleave', () => {
            const tooltip = element.querySelector('.tooltip');
            if (tooltip) tooltip.remove();
        });
    }
    
    static enhanceForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        // Add feedback to form submission
        form.addEventListener('submit', (e) => {
            const button = form.querySelector('button[type="submit"]');
            if (button) {
                button.disabled = true;
                button.textContent = 'Processing...';
                
                // Re-enable after 1 second
                setTimeout(() => {
                    button.disabled = false;
                    button.textContent = button.getAttribute('data-original-text') || 'Submit';
                }, 1000);
            }
        });
        
        // Add focus animations to inputs
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.style.transform = 'scale(1.02)';
            });
            
            input.addEventListener('blur', () => {
                input.parentElement.style.transform = 'scale(1)';
            });
        });
    }
    
    static smoothViewTransition(fromView, toView) {
        if (fromView) {
            fromView.classList.remove('active');
        }
        
        if (toView) {
            toView.classList.add('active');
        }
    }
    
    static showSuccess(message = 'Success!') {
        this.showToast(message, 'success', 2000);
        
        // Play sound if available
        if (window.soundManager && typeof window.soundManager.playSuccess === 'function') {
            window.soundManager.playSuccess();
        }
    }
    
    static showError(message = 'An error occurred') {
        this.showToast(message, 'error', 3000);
    }
    
    static showInfo(message = 'Info') {
        this.showToast(message, 'info', 2000);
    }
    
    static initializeAllButtons() {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            this.addButtonFeedback(button);
        });
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.UIPolish = UIPolish;
        UIPolish.initializeAllButtons();
        
        // Enhance forms
        UIPolish.enhanceForm('login-form');
        UIPolish.enhanceForm('signup-form');
        
        console.log('[VISIQ] UI Polish initialized');
    });
} else {
    window.UIPolish = UIPolish;
    UIPolish.initializeAllButtons();
    UIPolish.enhanceForm('login-form');
    UIPolish.enhanceForm('signup-form');
}