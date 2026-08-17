// ===== BLACK HOLE ORBIT =====
// Gravitational orbital simulator with lensing effect

let particles = [];
let blackHole = { x: 0, y: 0, mass: 100 };
let initialVelocity = 5;
let showTrails = true;

function initSketch(config) {
    const container = document.getElementById(config.containerId);
    if (!container) return;
    
    const sketch = (p) => {
        p.setup = function() {
            const w = container.clientWidth;
            const h = container.clientHeight;
            const canvas = p.createCanvas(w, h);
            canvas.parent(container);
            
            blackHole.x = w / 2;
            blackHole.y = h / 2;
            
            // Create orbital particles
            createOrbit(w, h, p);
            setupControls();
        };
        
        p.draw = function() {
            p.background(26, 26, 26);
            
            // Draw black hole
            p.fill(0);
            p.stroke(100);
            p.strokeWeight(3);
            p.circle(blackHole.x, blackHole.y, 40);
            
            // Draw event horizon
            p.noFill();
            p.stroke(80);
            p.strokeWeight(2);
            p.circle(blackHole.x, blackHole.y, 60);
            
            // Update and draw particles
            particles.forEach((particle, i) => {
                // Gravity
                const dx = blackHole.x - particle.x;
                const dy = blackHole.y - particle.y;
                const dist = p.sqrt(dx * dx + dy * dy);
                const force = blackHole.mass / (dist * dist + 100);
                
                particle.ax = (dx / dist) * force;
                particle.ay = (dy / dist) * force;
                
                particle.vx += particle.ax;
                particle.vy += particle.ay;
                
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                // Draw trail
                if (showTrails && particle.trail) {
                    p.stroke(particle.color);
                    p.strokeWeight(1);
                    p.opacity = 100;
                    for (let j = 0; j < particle.trail.length - 1; j++) {
                        p.line(particle.trail[j].x, particle.trail[j].y, 
                               particle.trail[j + 1].x, particle.trail[j + 1].y);
                    }
                }
                
                // Store trail
                if (!particle.trail) particle.trail = [];
                particle.trail.push({ x: particle.x, y: particle.y });
                if (particle.trail.length > 200) particle.trail.shift();
                
                // Draw particle
                p.fill(particle.color);
                p.noStroke();
                p.circle(particle.x, particle.y, 6);
                
                // Remove if spiraled in
                if (dist < 30) {
                    particles.splice(i, 1);
                }
            });
            
            // Info
            p.fill(200);
            p.textSize(12);
            p.text('Adjust velocity | Space to reset', 10, 20);
            p.text('Particles: ' + particles.length, 10, 40);
        };
        
        p.keyPressed = function() {
            if (p.key === ' ') {
                particles = [];
                createOrbit(p.width, p.height, p);
            }
        };
    };
    
    new p5(sketch);
}

function createOrbit(w, h, p) {
    const distance = 150;
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'];
    
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * p.TWO_PI;
        const x = blackHole.x + p.cos(angle) * distance;
        const y = blackHole.y + p.sin(angle) * distance;
        
        particles.push({
            x: x,
            y: y,
            vx: -p.sin(angle) * initialVelocity,
            vy: p.cos(angle) * initialVelocity,
            ax: 0,
            ay: 0,
            color: colors[i],
            trail: []
        });
    }
}

function setupControls() {
    const controlsHtml = `
        <div class="control-group">
            <label>Orbital Velocity</label>
            <input type="range" min="2" max="8" step="0.5" value="5" 
                onchange="initialVelocity = parseFloat(this.value); particles = [];">
        </div>
        <div class="control-group">
            <label>
                <input type="checkbox" checked onchange="showTrails = this.checked">
                Show Orbital Trails
            </label>
        </div>
        <div class="info-box" style="margin-top: 12px; padding: 12px; background: #222; border-radius: 4px;">
            <div style="font-size: 11px; color: #888;">Adjust velocity to find stable orbits. Too fast = escape. Too slow = spiral in.</div>
        </div>
    `;
    
    const controlsContainer = document.querySelector('.controls-wrapper');
    if (controlsContainer) {
        controlsContainer.innerHTML = controlsHtml;
    }
}