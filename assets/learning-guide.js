// ===== LEARNING GUIDE SYSTEM =====
// Interactive prompts and learning guidance

class LearningGuide {
    constructor() {
        this.currentSimulation = null;
        this.prompts = this.definePrompts();
        this.initialize();
    }
    
    initialize() {
        this.setupGuideSystem();
        console.log('[LEARNING-GUIDE] Initialized');
    }
    
    definePrompts() {
        return {
            'newton': {
                title: 'Explore Newton\'s Second Law',
                prompts: [
                    { text: 'What happens when you double the mass?', hint: 'Acceleration becomes half' },
                    { text: 'How does force affect acceleration?', hint: 'F = ma' },
                    { text: 'What\'s the effect of friction?', hint: 'Reduces net force' }
                ]
            },
            'dna-replication': {
                title: 'Understand DNA Copying',
                prompts: [
                    { text: 'Why does the helix unwind?', hint: 'DNA polymerase needs access' },
                    { text: 'What\'s the purpose of primers?', hint: 'Starting points for replication' },
                    { text: 'Why is there a leading and lagging strand?', hint: 'DNA synthesizes 5\' to 3\'' }
                ]
            },
            'black-hole-orbit': {
                title: 'Experience Spacetime Curvature',
                prompts: [
                    { text: 'What\'s the event horizon?', hint: 'Point of no return' },
                    { text: 'Why do orbits curve?', hint: 'Spacetime geometry' },
                    { text: 'What happens at the singularity?', hint: 'Infinite density' }
                ]
            }
        };
    }
    
    setupGuideSystem() {
        // Monitor simulation view changes
        const simView = document.getElementById('simulation-view');
        if (simView) {
            const observer = new MutationObserver(() => {
                const title = document.getElementById('sim-title');
                if (title) {
                    this.currentSimulation = title.textContent;
                    this.showGuidancePanel();
                }
            });
            
            observer.observe(simView, { childList: true, subtree: true });
        }
    }
    
    showGuidancePanel() {
        const simId = this.getSimulationId(this.currentSimulation);
        const guide = this.prompts[simId];
        
        if (!guide) return;
        
        // Remove existing panel
        const existing = document.querySelector('.learning-guide-panel');
        if (existing) existing.remove();
        
        // Create new panel
        const panel = document.createElement('div');
        panel.className = 'learning-guide-panel';
        panel.innerHTML = `
            <div class="guide-header">
                <h3>💡 ${guide.title}</h3>
                <button class="guide-close">×</button>
            </div>
            <div class="guide-prompts">
                ${guide.prompts.map((prompt, i) => `
                    <div class="guide-prompt">
                        <div class="prompt-text">${prompt.text}</div>
                        <button class="btn-hint" data-hint="${prompt.hint}">Hint</button>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.getElementById('simulation-view').appendChild(panel);
        
        // Setup close
        panel.querySelector('.guide-close').addEventListener('click', () => {
            panel.remove();
        });
        
        // Setup hints
        panel.querySelectorAll('.btn-hint').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.UIPolish) {
                    window.UIPolish.showInfo(btn.dataset.hint, 3000);
                }
                if (window.haptic) window.haptic.tap();
            });
        });
    }
    
    getSimulationId(title) {
        // Convert title to ID
        return title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/^the-/, '');
    }
}

// Add CSS
const style = document.createElement('style');
style.textContent = `
    .learning-guide-panel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 320px;
        max-height: 400px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        padding: 16px;
        z-index: 999;
        animation: slideInUp 0.3s ease-out;
        overflow-y: auto;
    }
    
    .guide-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border-subtle);
    }
    
    .guide-header h3 {
        margin: 0;
        font-size: 14px;
        color: var(--text-primary);
    }
    
    .guide-close {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
    }
    
    .guide-prompts {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .guide-prompt {
        padding: 12px;
        background: rgba(0, 217, 255, 0.05);
        border: 1px solid rgba(0, 217, 255, 0.1);
        border-radius: 8px;
    }
    
    .prompt-text {
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 8px;
        line-height: 1.5;
    }
    
    .btn-hint {
        width: 100%;
        padding: 6px 12px;
        background: rgba(0, 217, 255, 0.1);
        border: 1px solid rgba(0, 217, 255, 0.3);
        color: var(--accent-primary);
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .btn-hint:hover {
        background: rgba(0, 217, 255, 0.2);
        border-color: var(--accent-primary);
    }
    
    @media (max-width: 768px) {
        .learning-guide-panel {
            width: 90%;
            right: 5%;
            left: 5%;
        }
    }
`;
document.head.appendChild(style);

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.learningGuide = new LearningGuide();
    });
} else {
    window.learningGuide = new LearningGuide();
}