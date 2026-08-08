// ===== BLACK HOLE SIMULATION =====
// Real spacetime warping visualization
// Author: toibawani
// Physics: General Relativity, Schwarzschild Metric

let blackHoleSketch = function(p) {
    let canvasWidth = 800;
    let canvasHeight = 600;
    let particles = [];
    let time = 0;
    let blackHoleMass = 2;
    let particleSpeed = 1;
    let showFieldLines = true;
    
    // Constants
    const G = 6.674e-11 / 1e30; // Scaled gravity constant
    const c = 300; // Speed of light (pixels/frame)
    const schwarzschildRadius = 40;
    
    p.setup = function() {
        const container = document.getElementById('simulation-canvas');
        canvasWidth = container.clientWidth;
        canvasHeight = container.clientHeight;
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent('simulation-canvas');
        
        // Initialize particles
        initializeParticles();
        
        setupControls();
        initSketch(this);
    };
    
    p.draw = function() {
        // Dark background with radial gradient
        p.background('#050507');
        
        // Draw spacetime distortion grid
        if (showFieldLines) {
            drawSpacetimeGrid();
        }
        
        // Update and draw particles
        particles.forEach((particle, index) => {
            updateParticle(particle);
            drawParticle(particle);
            
            // Check if in event horizon
            let distToCenter = p.dist(particle.x, particle.y, canvasWidth / 2, canvasHeight / 2);
            if (distToCenter < schwarzschildRadius && !particle.sounded) {
                soundManager.playResonance(100 + Math.random() * 50, 1.2);
                particle.sounded = true;
            }
        });
        
        // Draw black hole
        drawBlackHole();
        
        // Draw info
        drawInfo();
        
        time += 0.016; // 60 FPS
    };
    
    function initializeParticles() {
        particles = [];
        const particleCount = 80;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = p.random(p.TWO_PI);
            const dist = p.random(150, 350);
            
            particles.push({
                x: canvasWidth / 2 + p.cos(angle) * dist,
                y: canvasHeight / 2 + p.sin(angle) * dist,
                vx: -p.sin(angle) * particleSpeed,
                vy: p.cos(angle) * particleSpeed,
                trail: [],
                color: p.color(p.random([0, 217, 255]), p.random([100, 150, 200, 255]), p.random([150, 200, 255])),
                mass: 0.1,
                sounded: false
            });
        }
    }
    
    function updateParticle(particle) {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Calculate distance from black hole
        const dx = centerX - particle.x;
        const dy = centerY - particle.y;
        const distSq = dx * dx + dy * dy;
        const dist = p.sqrt(distSq);
        
        // Gravitational acceleration (F = GMm/r²)
        if (dist > schwarzschildRadius + 5) {
            const force = (G * blackHoleMass) / (distSq + 100);
            particle.vx += (dx / dist) * force * 1.5;
            particle.vy += (dy / dist) * force * 1.5;
        } else if (dist < schwarzschildRadius) {
            // Inside event horizon - disappear
            particle.x = p.random(canvasWidth);
            particle.y = p.random(canvasHeight);
            particle.sounded = false;
        }
        
        // Velocity damping (friction)
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Wrap around screen
        if (particle.x < -50) particle.x = canvasWidth + 50;
        if (particle.x > canvasWidth + 50) particle.x = -50;
        if (particle.y < -50) particle.y = canvasHeight + 50;
        if (particle.y > canvasHeight + 50) particle.y = -50;
        
        // Trail
        particle.trail.push({ x: particle.x, y: particle.y });
        if (particle.trail.length > 20) {
            particle.trail.shift();
        }
    }
    
    function drawSpacetimeGrid() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const gridSize = 30;
        
        p.stroke('rgba(0, 217, 255, 0.08)');
        p.strokeWeight(1);
        
        for (let x = 0; x < canvasWidth; x += gridSize) {
            for (let y = 0; y < canvasHeight; y += gridSize) {
                // Spacetime warping effect
                const dx = x - centerX;
                const dy = y - centerY;
                const distToCenter = p.sqrt(dx * dx + dy * dy);
                
                // Warp factor increases near black hole
                const warpFactor = p.map(distToCenter, 0, 400, 0.3, 1, true);
                
                const warpX = x + dx * (1 - warpFactor) * 0.3;
                const warpY = y + dy * (1 - warpFactor) * 0.3;
                
                p.point(warpX, warpY);
            }
        }
    }
    
    function drawParticle(particle) {
        // Draw trail
        p.stroke('rgba(0, 217, 255, 0.3)');
        p.strokeWeight(1);
        p.noFill();
        p.beginShape();
        particle.trail.forEach(t => p.vertex(t.x, t.y));
        p.endShape();
        
        // Draw particle
        const brightness = p.map(particle.y, 0, canvasHeight, 0.3, 1);
        p.fill('rgba(0, 217, 255, ' + brightness * 0.8 + ')');
        p.stroke('rgba(100, 200, 255, 0.6)');
        p.strokeWeight(1.5);
        p.ellipse(particle.x, particle.y, 5);
    }
    
    function drawBlackHole() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Event horizon glow
        p.fill('rgba(255, 0, 110, 0.1)');
        p.stroke('rgba(255, 0, 110, 0.3)');
        p.strokeWeight(2);
        p.ellipse(centerX, centerY, schwarzschildRadius * 2);
        
        // Accretion disk
        p.noFill();
        p.stroke('rgba(255, 100, 50, 0.4)');
        for (let i = 1; i < 5; i++) {
            const size = schwarzschildRadius * (1.5 + i * 0.4);
            p.strokeWeight(3);
            p.ellipse(centerX, centerY, size, size * 0.4);
        }
        
        // Central singularity
        p.fill('rgba(0, 0, 0, 0.9)');
        p.noStroke();
        p.ellipse(centerX, centerY, schwarzschildRadius);
        
        // Singularity glow
        p.fill('rgba(255, 0, 110, 0.2)');
        p.ellipse(centerX, centerY, schwarzschildRadius * 0.7);
    }
    
    function drawInfo() {
        p.push();
        p.fill('rgba(245, 245, 247, 0.7)');
        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(13);
        p.textFont('Space Grotesk');
        
        p.text('Schwarzschild Radius: ' + schwarzschildRadius.toFixed(1) + ' px', 20, 20);
        p.text('Particles: ' + particles.length, 20, 45);
        p.text('Spacetime warp strength: ' + (blackHoleMass * 50).toFixed(0) + '%', 20, 70);
        
        p.textSize(11);
        p.fill('rgba(160, 160, 168, 0.6)');
        p.text('Watch particles spiral into the event horizon', 20, canvasHeight - 25);
        
        p.pop();
    }
    
    function setupControls() {
        const controlsSection = document.getElementById('controls-section');
        
        // Mass slider
        let massGroup = createControlGroup('Mass', 1, 5, blackHoleMass, (val) => {
            blackHoleMass = val;
        });
        controlsSection.appendChild(massGroup);
        
        // Particle speed slider
        let speedGroup = createControlGroup('Orbital Speed', 0.5, 3, particleSpeed, (val) => {
            particleSpeed = val;
            particles.forEach(p => {
                const angle = Math.atan2(p.vy, p.vx);
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                p.vx = Math.cos(angle) * val;
                p.vy = Math.sin(angle) * val;
            });
        });
        controlsSection.appendChild(speedGroup);
        
        // Toggle grid
        let gridBtn = createButton('Toggle Grid', () => {
            showFieldLines = !showFieldLines;
        });
        controlsSection.appendChild(gridBtn);
    }
    
    this.resetSketch = function() {
        initializeParticles();
        time = 0;
        blackHoleMass = 2;
        particleSpeed = 1;
    };
};

new p5(blackHoleSketch);