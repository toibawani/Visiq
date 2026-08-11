// ===== SCREENSHOT CAPTURE SYSTEM =====
// Allows users to capture and download simulation screenshots
// Tested on Chrome, Firefox, Safari, mobile browsers

class ScreenshotSystem {
    constructor() {
        this.isCapturing = false;
        this.button = null;
        this.initialize();
    }
    
    initialize() {
        // Wait for simulation view to exist
        const checkInterval = setInterval(() => {
            if (document.querySelector('.sim-header')) {
                clearInterval(checkInterval);
                this.createButton();
            }
        }, 100);
        
        // Fallback: if element never found, still create after 5 seconds
        setTimeout(() => {
            if (!this.button) {
                this.createButton();
            }
        }, 5000);
    }
    
    createButton() {
        const simHeader = document.querySelector('.sim-header');
        if (!simHeader) return;
        
        // Check if button already exists
        if (document.getElementById('screenshot-button')) {
            this.button = document.getElementById('screenshot-button');
            this.attachListeners();
            return;
        }
        
        // Create button element
        this.button = document.createElement('button');
        this.button.id = 'screenshot-button';
        this.button.className = 'btn-screenshot';
        this.button.innerHTML = '📷 Screenshot';
        this.button.title = 'Download screenshot of current simulation';
        this.button.type = 'button';
        
        // Find reset button and insert after it
        const resetButton = simHeader.querySelector('#reset-button');
        if (resetButton) {
            resetButton.parentNode.insertBefore(this.button, resetButton.nextSibling);
        } else {
            simHeader.appendChild(this.button);
        }
        
        this.attachListeners();
        console.log('[VISIQ] Screenshot button created');
    }
    
    attachListeners() {
        if (!this.button) return;
        
        this.button.addEventListener('click', (e) => {
            e.preventDefault();
            this.captureScreenshot();
        });
    }
    
    captureScreenshot() {
        if (this.isCapturing) return;
        
        this.isCapturing = true;
        const originalText = this.button.textContent;
        const originalDisabled = this.button.disabled;
        
        // Show capturing state
        this.button.textContent = '⏳ Capturing...';
        this.button.disabled = true;
        
        try {
            // Get canvas element
            const canvas = document.querySelector('#simulation-canvas canvas');
            if (!canvas) {
                this.showError('Canvas not found');
                this.resetButton(originalText, originalDisabled);
                return;
            }
            
            // Get simulation name for filename
            const simTitle = document.querySelector('#sim-title');
            const simName = simTitle ? 
                simTitle.textContent.toLowerCase().replace(/\s+/g, '-') : 
                'visiq-simulation';
            
            const timestamp = this.getTimestamp();
            const filename = `${simName}_${timestamp}.png`;
            
            // Convert canvas to blob
            canvas.toBlob((blob) => {
                if (!blob) {
                    this.showError('Failed to capture screenshot');
                    this.resetButton(originalText, originalDisabled);
                    return;
                }
                
                this.downloadBlob(blob, filename);
                this.showSuccess();
                
                // Play success sound if available
                if (window.soundManager && typeof window.soundManager.playSuccess === 'function') {
                    window.soundManager.playSuccess();
                }
                
                this.resetButton(originalText, originalDisabled);
            }, 'image/png', 1.0);
            
        } catch (error) {
            console.error('Screenshot error:', error);
            this.showError('Failed to capture screenshot');
            this.resetButton(originalText, originalDisabled);
        }
    }
    
    downloadBlob(blob, filename) {
        // Create download URL
        const url = URL.createObjectURL(blob);
        
        // Create temporary link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        console.log(`[VISIQ] Screenshot saved: ${filename}`);
    }
    
    getTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        return `${year}${month}${day}_${hours}${minutes}${seconds}`;
    }
    
    showSuccess() {
        if (!this.button) return;
        
        this.button.textContent = '✓ Saved!';
        this.button.style.background = 'linear-gradient(135deg, #00d9ff 0%, #00a8cc 100%)';
        
        setTimeout(() => {
            this.button.style.background = '';
        }, 2000);
    }
    
    showError(message) {
        console.error('[VISIQ] Screenshot error:', message);
    }
    
    resetButton(text, disabled) {
        if (!this.button) return;
        
        this.button.textContent = text;
        this.button.disabled = disabled;
        this.isCapturing = false;
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.screenshotSystem = new ScreenshotSystem();
    });
} else {
    window.screenshotSystem = new ScreenshotSystem();
}