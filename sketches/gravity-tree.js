// ===== GRAVITY TREE - N-BODY SIMULATION =====
// Author: toibawani
// Email: toibawani14@gmail.com
// Particles fall under gravity and collide, forming emergent structures

let gravityTreeSketch = function(p) {
    let particles = [];
    let canvasWidth = 800;
    let canvasHeight = 600;
    let particleCount = 200;
    let gravity = 0.15;
    let damping = 0.99;
    let collisionDamping = 0.8;
    
    p.setup = function() {
        const container = document.getElementById('simulation-canvas');
        canvasWidth = container.clientWidth;
        canvasHeight = container.clientHeight;
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent('simulation-canvas');
        
        initializeParticles();
        setupControls();
        initSketch(this);
    };
    
    p.draw = function() {
        p.background('#050507');
        
        particles.forEach(p_i => {
            p_i.vy += gravity;
            
            particles.forEach(p_j => {
                if (p_i !== p_j) {
                    let dx = p_j.x - p_i.x;
                    let dy = p_j.y - p_i.y;
                    let distSq = dx*dx + dy*dy;
                    let dist = Math.sqrt(distSq);
                    
                    if (dist > 10) {
                        let force = (p_i.mass * p_j.mass) / (distSq + 100);
                        p_i.vx += (dx / dist) * force * 0.0001;
                        p_i.vy += (dy / dist) * force * 0.0001;
                    }
                }
            });
            
            p_i.vx *= damping;
            p_i.vy *= damping;
            
            p_i.x += p_i.vx;
            p_i.y += p_i.vy;
            
            if (p_i.x < 0) { p_i.x = 0; p_i.vx *= -collisionDamping; }
            if (p_i.x > canvasWidth) { p_i.x = canvasWidth; p_i.vx *= -collisionDamping; }
            if (p_i.y < 0) { p_i.y = 0; p_i.vy *= -collisionDamping; }
            if (p_i.y > canvasHeight) { p_i.y = canvasHeight; p_i.vy *= -collisionDamping; }
        });
        
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                let dx = particles[j].x - particles[i].x;
                let dy = particles[j].y - particles[i].y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                let minDist = particles[i].radius + particles[j].radius;
                
                if (dist < minDist) {
                    if (particles[i].mass >= particles[j].mass) {
                        particles[i].mass += particles[j].mass;
                        particles[i].radius = Math.cbrt(particles[i].mass) * 3;
                        particles.splice(j, 1);
                        j--;
                    } else {
                        particles[j].mass += particles[i].mass;
                        particles[j].radius = Math.cbrt(particles[j].mass) * 3;
                        particles.splice(i, 1);
                        i--;
                        break;
                    }
                }
            }
        }
        
        particles.forEach(p_i => {
            let brightness = Math.min(255, p_i.mass * 20);
            p.push();
            p.fill(`rgba(${brightness}, ${brightness * 0.6}, 50, 0.8)`);
            p.stroke(`rgba(232, 160, 76, ${Math.min(1, p_i.mass * 0.1)})`);
            p.strokeWeight(1);
            p.ellipse(p_i.x, p_i.y, p_i.radius * 2);
            p.pop();
        });
        
        drawInfo();
    };
    
    function initializeParticles() {
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight * 0.3,
                vx: (Math.random() - 0.5) * 2,
                vy: Math.random() * 1,
                mass: 1,
                radius: 3
            });
        }
    }
    
    function drawInfo() {
        p.push();
        p.fill('rgba(245, 245, 247, 0.8)');
        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(14);
        p.textFont('Inter');
        
        p.text(`Particles: ${particles.length}`, 20, 20);
        
        let totalMass = particles.reduce((sum, p) => sum + p.mass, 0);
        p.text(`Total Mass: ${totalMass.toFixed(0)}`, 20, 45);
        
        let largestMass = Math.max(...particles.map(p => p.mass));
        p.text(`Largest: ${largestMass.toFixed(1)}`, 20, 70);
        
        p.pop();
    }
    
    function setupControls() {
        const controlsSection = document.getElementById('controls-section');
        
        let gravityGroup = createControlGroup('Gravity', 0, 0.5, gravity, (val) => {
            gravity = val;
        });
        controlsSection.appendChild(gravityGroup);
        
        let addBtn = createButton('Add Particles', () => {
            for (let i = 0; i < 20; i++) {
                particles.push({
                    x: Math.random() * canvasWidth,
                    y: Math.random() * 100,
                    vx: (Math.random() - 0.5) * 2,
                    vy: 0,
                    mass: 1,
                    radius: 3
                });
            }
        });
        controlsSection.appendChild(addBtn);
    }
    
    this.resetSketch = function() {
        initializeParticles();
        gravity = 0.15;
    };
};

new p5(gravityTreeSketch);