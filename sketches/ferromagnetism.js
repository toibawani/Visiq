// ===== FERROMAGNETISM =====
// Author: toibawani
// Email: toibawani14@gmail.com
// Click to place magnetic poles, watch particles align

let ferromagnetismSketch = function(p) {
    let particles = [];
    let magnets = [];
    let canvasWidth = 800;
    let canvasHeight = 600;
    let particleCount = 400;
    let magnetStrength = 2;
    let damping = 0.95;
    
    p.setup = function() {
        const container = document.getElementById('simulation-canvas');
        canvasWidth = container.clientWidth;
        canvasHeight = container.clientHeight;
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent('simulation-canvas');
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: p.random(canvasWidth),
                y: p.random(canvasHeight),
                vx: 0,
                vy: 0,
                angle: p.random(p.TWO_PI),
                angularVel: 0,
                charge: p.random() > 0.5 ? 1 : -1
            });
        }
        
        setupControls();
        initSketch(this);
    };
    
    p.draw = function() {
        p.background('#050507');
        
        particles.forEach(particle => {
            let forceX = 0;
            let forceY = 0;
            let torque = 0;
            
            magnets.forEach(magnet => {
                let dx = magnet.x - particle.x;
                let dy = magnet.y - particle.y;
                let dist = p.sqrt(dx*dx + dy*dy);
                
                if (dist > 5 && dist < 300) {
                    let force = (magnetStrength * magnet.charge * particle.charge) / (dist * dist);
                    forceX += (dx / dist) * force;
                    forceY += (dy / dist) * force;
                    
                    let fieldAngle = p.atan2(dy, dx);
                    let angleDiff = fieldAngle - particle.angle;
                    while (angleDiff > p.PI) angleDiff -= p.TWO_PI;
                    while (angleDiff < -p.PI) angleDiff += p.TWO_PI;
                    torque += angleDiff * 0.1;
                }
            });
            
            particle.vx += forceX;
            particle.vy += forceY;
            particle.angularVel += torque;
            
            particle.vx *= damping;
            particle.vy *= damping;
            particle.angularVel *= 0.95;
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.angle += particle.angularVel;
            
            if (particle.x < 0) particle.x = canvasWidth;
            if (particle.x > canvasWidth) particle.x = 0;
            if (particle.y < 0) particle.y = canvasHeight;
            if (particle.y > canvasHeight) particle.y = 0;
        });
        
        drawFieldLines();
        
        particles.forEach(particle => {
            p.push();
            p.translate(particle.x, particle.y);
            p.rotate(particle.angle);
            
            p.fill(particle.charge > 0 ? 'rgba(232, 160, 76, 0.8)' : 'rgba(100, 200, 255, 0.8)');
            p.stroke('rgba(232, 160, 76, 0.5)');
            p.strokeWeight(1);
            p.triangle(6, 0, -3, -3, -3, 3);
            
            p.pop();
        });
        
        magnets.forEach(magnet => {
            p.push();
            p.fill(magnet.charge > 0 ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 100, 255, 0.5)');
            p.stroke(magnet.charge > 0 ? '#ff0000' : '#0064ff');
            p.strokeWeight(2);
            p.ellipse(magnet.x, magnet.y, 30);
            
            p.fill(magnet.charge > 0 ? '#ff0000' : '#0064ff');
            p.noStroke();
            p.textSize(12);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(magnet.charge > 0 ? 'N' : 'S', magnet.x, magnet.y);
            p.pop();
        });
        
        drawInfo();
    };
    
    function drawFieldLines() {
        if (magnets.length < 2) return;
        
        p.stroke('rgba(232, 160, 76, 0.1)');
        p.strokeWeight(1);
        p.noFill();
        
        for (let x = 0; x < canvasWidth; x += 30) {
            for (let y = 0; y < canvasHeight; y += 30) {
                let forceX = 0;
                let forceY = 0;
                
                magnets.forEach(magnet => {
                    let dx = x - magnet.x;
                    let dy = y - magnet.y;
                    let dist = p.sqrt(dx*dx + dy*dy);
                    
                    if (dist > 5) {
                        let force = magnet.charge / (dist * dist);
                        forceX += (dx / dist) * force;
                        forceY += (dy / dist) * force;
                    }
                });
                
                let len = p.sqrt(forceX*forceX + forceY*forceY);
                if (len > 0) {
                    forceX = (forceX / len) * 10;
                    forceY = (forceY / len) * 10;
                    p.line(x, y, x + forceX, y + forceY);
                }
            }
        }
    }
    
    function drawInfo() {
        p.push();
        p.fill('rgba(245, 245, 247, 0.8)');
        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(14);
        p.textFont('Inter');
        
        p.text(`Click to place magnets`, 20, 20);
        p.text(`Magnets: ${magnets.length}`, 20, 45);
        
        p.textSize(12);
        p.fill('rgba(160, 160, 168, 0.8)');
        p.text('Left click = North (N) | Right click = South (S)', 20, canvasHeight - 30);
        
        p.pop();
    }
    
    p.mousePressed = function() {
        if (p.mouseX > 0 && p.mouseX < canvasWidth && p.mouseY > 0 && p.mouseY < canvasHeight) {
            let charge = p.mouseButton === p.LEFT ? 1 : -1;
            magnets.push({
                x: p.mouseX,
                y: p.mouseY,
                charge: charge
            });
            return false;
        }
    };
    
    function setupControls() {
        const controlsSection = document.getElementById('controls-section');
        
        let strengthGroup = createControlGroup('Magnetic Strength', 0.5, 5, magnetStrength, (val) => {
            magnetStrength = val;
        });
        controlsSection.appendChild(strengthGroup);
        
        let clearBtn = createButton('Clear Magnets', () => {
            magnets = [];
        });
        controlsSection.appendChild(clearBtn);
    }
    
    this.resetSketch = function() {
        magnets = [];
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: p.random(canvasWidth),
                y: p.random(canvasHeight),
                vx: 0,
                vy: 0,
                angle: p.random(p.TWO_PI),
                angularVel: 0,
                charge: p.random() > 0.5 ? 1 : -1
            });
        }
    };
};

new p5(ferromagnetismSketch);