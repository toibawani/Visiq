// ===== PARTICLE BACKGROUND SYSTEM =====
// Subtle animated particles for visual depth

class ParticleBackground {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: 0, y: 0 };
        this.initialize();
    }
    
    initialize() {
        this.resizeCanvas();
        this.createParticles();
        this.setupEventListeners();
        this.animate();
        console.log('[PARTICLES] Background initialized');
    }
    
    resizeCanvas() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
    }
    
    createParticles() {
        const count = Math.floor((this.canvas.width * this.canvas.height) / 15000);
        
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.5 + 0.2,
                color: Math.random() > 0.7 ? '#ff006e' : '#00d9ff'
            });
        }
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.particles = [];
            this.createParticles();
        });
        
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
    }
    
    animate() {
        // Clear canvas
        this.ctx.fillStyle = 'transparent';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and draw particles
        this.particles.forEach((particle, index) => {
            // Move particle
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Bounce off walls
            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;
            
            // Keep in bounds
            particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
            particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
            
            // Draw particle
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Reset alpha
            this.ctx.globalAlpha = 1;
            
            // Draw line to nearby particles
            this.particles.forEach((otherParticle, otherIndex) => {
                if (index >= otherIndex) return;
                
                const dx = otherParticle.x - particle.x;
                const dy = otherParticle.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 150) {
                    this.ctx.strokeStyle = particle.color;
                    this.ctx.globalAlpha = (1 - distance / 150) * 0.1;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(otherParticle.x, otherParticle.y);
                    this.ctx.stroke();
                    this.ctx.globalAlpha = 1;
                }
            });
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when hero canvas exists
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const heroCanvas = document.getElementById('hero-canvas');
        if (heroCanvas) {
            window.particleBg = new ParticleBackground('hero-canvas');
        }
    });
} else {
    const heroCanvas = document.getElementById('hero-canvas');
    if (heroCanvas) {
        window.particleBg = new ParticleBackground('hero-canvas');
    }
}