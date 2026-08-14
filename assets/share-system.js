// ===== SHARE SYSTEM =====
// Share simulations and see trending

class ShareSystem {
    constructor() {
        this.shareData = this.loadShareData();
        this.initialize();
    }
    
    initialize() {
        this.setupShareButtons();
        console.log('[SHARE] System initialized');
    }
    
    loadShareData() {
        const saved = localStorage.getItem('visiq_shares');
        return saved ? JSON.parse(saved) : {};
    }
    
    saveShareData() {
        localStorage.setItem('visiq_shares', JSON.stringify(this.shareData));
    }
    
    setupShareButtons() {
        // Add share button to simulation header
        const checkInterval = setInterval(() => {
            const simHeader = document.querySelector('.sim-header');
            if (simHeader && !document.getElementById('share-button')) {
                clearInterval(checkInterval);
                this.addShareButton(simHeader);
            }
        }, 100);
    }
    
    addShareButton(simHeader) {
        const shareBtn = document.createElement('button');
        shareBtn.id = 'share-button';
        shareBtn.className = 'btn-share';
        shareBtn.innerHTML = '📤 Share';
        shareBtn.title = 'Share this simulation';
        shareBtn.onclick = () => this.showShareModal();
        
        const resetBtn = simHeader.querySelector('#reset-button');
        if (resetBtn) {
            resetBtn.parentNode.insertBefore(shareBtn, resetBtn.nextSibling);
        }
    }
    
    showShareModal() {
        const simName = document.querySelector('#sim-title').textContent;
        const shareLink = this.generateShareLink(simName);
        
        const modal = document.createElement('div');
        modal.className = 'stats-modal-overlay';
        modal.innerHTML = `
            <div class="stats-modal">
                <div class="modal-header">
                    <h2>Share Simulation</h2>
                    <button class="modal-close" onclick="this.closest('.stats-modal-overlay').remove()">×</button>
                </div>
                
                <div class="share-content">
                    <div class="share-preview">
                        <div class="share-icon">✨</div>
                        <div class="share-info">
                            <div class="share-sim-name">${simName}</div>
                            <div class="share-description">Check out this amazing simulation on VISIQ</div>
                        </div>
                    </div>
                    
                    <div class="share-methods">
                        <button class="share-method" onclick="window.shareSystem.copyLink('${simName}')">
                            <div class="share-method-icon">🔗</div>
                            <div class="share-method-text">
                                <div class="share-method-name">Copy Link</div>
                                <div class="share-method-desc">Share via any app</div>
                            </div>
                        </button>
                        
                        <button class="share-method" onclick="window.shareSystem.shareVia('twitter', '${simName}')">
                            <div class="share-method-icon">𝕏</div>
                            <div class="share-method-text">
                                <div class="share-method-name">Share on X</div>
                                <div class="share-method-desc">Post to Twitter</div>
                            </div>
                        </button>
                        
                        <button class="share-method" onclick="window.shareSystem.shareVia('reddit', '${simName}')">
                            <div class="share-method-icon">🔴</div>
                            <div class="share-method-text">
                                <div class="share-method-name">Share on Reddit</div>
                                <div class="share-method-desc">Post to Reddit</div>
                            </div>
                        </button>
                        
                        <button class="share-method" onclick="window.shareSystem.shareVia('email', '${simName}')">
                            <div class="share-method-icon">✉️</div>
                            <div class="share-method-text">
                                <div class="share-method-name">Email</div>
                                <div class="share-method-desc">Send to friends</div>
                            </div>
                        </button>
                    </div>
                    
                    <div class="share-stats">
                        <div class="stat-badge">
                            <span class="stat-icon">👥</span>
                            <span class="stat-text">${this.getShareCount(simName)} shares</span>
                        </div>
                        <div class="stat-badge">
                            <span class="stat-icon">❤️</span>
                            <span class="stat-text">${this.getLikeCount(simName)} likes</span>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.stats-modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    generateShareLink(simName) {
        const baseUrl = window.location.origin + window.location.pathname;
        const simSlug = simName.toLowerCase().replace(/\s+/g, '-');
        return `${baseUrl}?sim=${simSlug}`;
    }
    
    copyLink(simName) {
        const link = this.generateShareLink(simName);
        
        navigator.clipboard.writeText(link).then(() => {
            this.recordShare(simName);
            
            if (window.UIPolish) {
                window.UIPolish.showSuccess('Link copied! Ready to share');
            }
            
            if (window.haptic) {
                window.haptic.success();
            }
        });
    }
    
    shareVia(platform, simName) {
        const link = this.generateShareLink(simName);
        const message = `Check out this amazing ${simName} simulation on VISIQ!`;
        
        let shareUrl = '';
        
        switch(platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(link)}`;
                break;
            case 'reddit':
                shareUrl = `https://reddit.com/submit?url=${encodeURIComponent(link)}&title=${encodeURIComponent(simName)}`;
                break;
            case 'email':
                shareUrl = `mailto:?subject=${encodeURIComponent(simName + ' - VISIQ')}&body=${encodeURIComponent(message + '\n\n' + link)}`;
                break;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank');
            this.recordShare(simName);
        }
    }
    
    recordShare(simName) {
        if (!this.shareData[simName]) {
            this.shareData[simName] = {
                shares: 0,
                likes: 0,
                lastShared: null
            };
        }
        
        this.shareData[simName].shares += 1;
        this.shareData[simName].lastShared = new Date().toISOString();
        this.saveShareData();
    }
    
    getShareCount(simName) {
        return this.shareData[simName]?.shares || 0;
    }
    
    getLikeCount(simName) {
        return this.shareData[simName]?.likes || 0;
    }
    
    recordLike(simName) {
        if (!this.shareData[simName]) {
            this.shareData[simName] = {
                shares: 0,
                likes: 0,
                lastShared: null
            };
        }
        
        this.shareData[simName].likes += 1;
        this.saveShareData();
    }
    
    getTrendingSimulations() {
        return Object.entries(this.shareData)
            .map(([name, data]) => ({
                name,
                shares: data.shares,
                likes: data.likes,
                score: data.shares + (data.likes * 0.5)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.shareSystem = new ShareSystem();
    });
} else {
    window.shareSystem = new ShareSystem();
}