// ===== GALAXY COLLISION =====
// N-body gravity simulator with two galaxies

let stars = [];
let time = 0;
let colliding = false;

function initSketch(config) {
    const container = document.getElementById(config.containerId);
    if (!container) return;
    
    const sketch = (p) => {
        p.setup = function() {
            const w = container.clientWidth;
            const h = container.clientHeight;
            const canvas = p.createCanvas(w, h);
            canvas.parent(container);
            
            createGalaxies(w, h, p);
            setupControls();
        };
        
        p.draw = function() {
            p.background(26, 26, 26);
            
            time += 0.016;
            
            // Update gravity
            for (let i = 0; i < stars.length; i++) {
                stars[i].ax = 0;
                stars[i].ay = 0;
                
                for (let j = 0; j < stars.length; j++) {
                    if (i !== j) {
                        const dx = stars[j].x - stars[i].x;
                        const dy = stars[j].y - stars[i].y;
                        const d = p.sqrt(dx * dx + dy * dy);
                        const force = 0.5 / (d * d + 100);
                        
                        stars[i].ax += force * (dx / d);
                        stars[i].ay += force * (dy / d);
                    }
                }
            }
            
            // Update positions
            stars.forEach(star => {
                star.vx += star.ax;
                star.vy += star.ay;
                star.vx *= 0.995;
                star.vy *= 0.995;
                
                star.x += star.vx;
                star.y += star.vy;
                
                // Wrap around
                if (star.x < 0) star.x = p.width;
                if (star.x > p.width) star.x = 0;
                if (star.y < 0) star.y = p.height;
                if (star.y > p.height) star.y = 0;
            });
            
            // Draw stars
            stars.forEach(star => {
                p.fill(star.color);
                p.noStroke();
                p.circle(star.x, star.y, star.size);
            });
            
            // Info
            p.fill(200);
            p.textSize(12);
            p.text('Stars: ' + stars.length + ' | Space to reset', 10, 20);
        };
        
        p.keyPressed = function() {
            if (p.key === ' ') {
                stars = [];
                createGalaxies(p.width, p.height, p);
            }
        };
    };
    
    new p5(sketch);
}

function createGalaxies(w, h, p) {
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#ffb3ba', '#bae1ff'];
    
    // Galaxy 1 (left)
    for (let i = 0; i < 80; i++) {
        const angle = p.random(p.TWO_PI);
        const radius = p.random(0, 100);
        const x = w * 0.25 + p.cos(angle) * radius;
        const y = h * 0.5 + p.sin(angle) * radius;
        
        stars.push({
            x: x,
            y: y,
            vx: -p.sin(angle) * p.random(0.5, 2),
            vy: p.cos(angle) * p.random(0.5, 2) + 1,
            ax: 0,
            ay: 0,
            size: p.random(1, 3),
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
    
    // Galaxy 2 (right)
    for (let i = 0; i < 80; i++) {
        const angle = p.random(p.TWO_PI);
        const radius = p.random(0, 100);
        const x = w * 0.75 + p.cos(angle) * radius;
        const y = h * 0.5 + p.sin(angle) * radius;
        
        stars.push({
            x: x,
            y: y,
            vx: -p.sin(angle) * p.random(0.5, 2) - 1,
            vy: p.cos(angle) * p.random(0.5, 2),
            ax: 0,
            ay: 0,
            size: p.random(1, 3),
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
}

function setupControls() {
    const controlsHtml = `
        <div class="info-box" style="padding: 12px; background: #222; border-radius: 4px;">
            <div style="font-size: 11px; color: #888;">Watch the galaxies slowly spiral toward each other and merge. Eventually they form a single elliptical galaxy.</div>
        </div>
    `;
    
    const controlsContainer = document.querySelector('.controls-wrapper');
    if (controlsContainer) {
        controlsContainer.innerHTML = controlsHtml;
    }
}