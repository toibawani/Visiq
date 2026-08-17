// ===== PENDULUM CHAOS =====
// Chaotic double pendulum simulator

let p1 = { angle: 0.5, velocity: 0, length: 150, mass: 1 };
let p2 = { angle: 0, velocity: 0, length: 150, mass: 1 };
let gravity = 0.98;
let damping = 0.999;
let showTrail = true;
let trail = [];

function initSketch(config) {
    const container = document.getElementById(config.containerId);
    if (!container) return;
    
    const sketch = (p) => {
        p.setup = function() {
            const w = container.clientWidth;
            const h = container.clientHeight;
            const canvas = p.createCanvas(w, h);
            canvas.parent(container);
            
            setupControls();
        };
        
        p.draw = function() {
            p.background(26, 26, 26);
            
            const centerX = p.width / 2;
            const centerY = p.height / 3;
            
            // Physics update
            updatePendulum(p);
            
            // Calculate positions
            const x1 = centerX + p.sin(p1.angle) * p1.length;
            const y1 = centerY + p.cos(p1.angle) * p1.length;
            
            const x2 = x1 + p.sin(p2.angle) * p2.length;
            const y2 = y1 + p.cos(p2.angle) * p2.length;
            
            // Draw pivot
            p.fill(200);
            p.noStroke();
            p.circle(centerX, centerY, 8);
            
            // Draw first pendulum
            p.stroke(255);
            p.strokeWeight(2);
            p.line(centerX, centerY, x1, y1);
            p.fill(100, 150, 255);
            p.noStroke();
            p.circle(x1, y1, 12);
            
            // Draw second pendulum
            p.stroke(255);
            p.strokeWeight(2);
            p.line(x1, y1, x2, y2);
            p.fill(255, 100, 150);
            p.noStroke();
            p.circle(x2, y2, 12);
            
            // Draw trail
            if (showTrail) {
                trail.push({ x: x2, y: y2 });
                if (trail.length > 500) trail.shift();
                
                p.stroke(150, 150, 100);
                p.strokeWeight(1);
                for (let i = 0; i < trail.length - 1; i++) {
                    p.line(trail[i].x, trail[i].y, trail[i + 1].x, trail[i + 1].y);
                }
            }
            
            // Info
            p.fill(200);
            p.textSize(12);
            p.textAlign(p.LEFT);
            const energy = getEnergy();
            p.text('Angle: ' + p1.angle.toFixed(2) + ' rad', 10, 20);
            p.text('Energy: ' + energy.toFixed(1), 10, 40);
        };
        
        p.keyPressed = function() {
            if (p.key === ' ') {
                p1.angle = p.random(-0.5, 0.5);
                p1.velocity = 0;
                p2.angle = 0;
                p2.velocity = 0;
                trail = [];
            }
        };
    };
    
    new p5(sketch);
}

function updatePendulum(p) {
    const g = gravity;
    const L1 = p1.length;
    const L2 = p2.length;
    const m1 = p1.mass;
    const m2 = p2.mass;
    
    // Simplified double pendulum equations
    const num1 = -g * (2 * m1 + m2) * p.sin(p1.angle) - m2 * g * p.sin(p1.angle - 2 * p2.angle) - 2 * p.sin(p1.angle - p2.angle) * m2 * (p2.velocity * p2.velocity * L2 + p1.velocity * p1.velocity * L1 * p.cos(p1.angle - p2.angle));
    const den1 = L1 * (2 * m1 + m2 - m2 * p.cos(2 * p1.angle - 2 * p2.angle));
    const a1 = num1 / den1;
    
    const num2 = 2 * p.sin(p1.angle - p2.angle) * (p1.velocity * p1.velocity * L1 * (m1 + m2) + g * (m1 + m2) * p.cos(p1.angle) + p2.velocity * p2.velocity * L2 * m2 * p.cos(p1.angle - p2.angle));
    const den2 = L2 * (2 * m1 + m2 - m2 * p.cos(2 * p1.angle - 2 * p2.angle));
    const a2 = num2 / den2;
    
    p1.velocity += a1;
    p1.velocity *= damping;
    p1.angle += p1.velocity;
    
    p2.velocity += a2;
    p2.velocity *= damping;
    p2.angle += p2.velocity;
}

function getEnergy() {
    return p.abs(p1.velocity) + p.abs(p2.velocity);
}

function setupControls() {
    const controlsHtml = `
        <div class="control-group">
            <label>Gravity</label>
            <input type="range" min="0.5" max="2" step="0.1" value="0.98" 
                onchange="gravity = parseFloat(this.value)">
        </div>
        <div class="control-group">
            <label>Damping</label>
            <input type="range" min="0.99" max="1" step="0.001" value="0.999" 
                onchange="damping = parseFloat(this.value)">
        </div>
        <div class="control-group">
            <label>
                <input type="checkbox" checked onchange="showTrail = this.checked">
                Show Trail
            </label>
        </div>
        <div class="info-box" style="margin-top: 12px; padding: 12px; background: #222; border-radius: 4px;">
            <div style="font-size: 11px; color: #888;">Small changes in gravity can cause completely different chaotic patterns. This is the butterfly effect.</div>
        </div>
    `;
    
    const controlsContainer = document.querySelector('.controls-wrapper');
    if (controlsContainer) {
        controlsContainer.innerHTML = controlsHtml;
    }
}