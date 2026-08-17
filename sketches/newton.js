// ===== NEWTON'S PLAYGROUND =====
// Interactive force and motion simulator

let objects = [];
let selectedObject = null;
let gravity = 0.5;
let friction = 0.95;
let showVectors = true;

function initSketch(config) {
    const container = document.getElementById(config.containerId);
    if (!container) return;
    
    const sketch = (p) => {
        p.setup = function() {
            const w = container.clientWidth;
            const h = container.clientHeight;
            const canvas = p.createCanvas(w, h);
            canvas.parent(container);
            
            // Create initial objects
            objects = [
                { x: w * 0.3, y: h * 0.5, vx: 0, vy: 0, mass: 5, radius: 20, color: '#2a9d8f' },
                { x: w * 0.7, y: h * 0.5, vx: 0, vy: 0, mass: 8, radius: 25, color: '#e76f51' }
            ];
            
            // Setup controls
            setupControls();
        };
        
        p.draw = function() {
            p.background(26, 26, 26);
            
            // Update objects
            objects.forEach(obj => {
                // Apply gravity
                obj.vy += gravity;
                
                // Apply friction
                obj.vx *= friction;
                obj.vy *= friction;
                
                // Update position
                obj.x += obj.vx;
                obj.y += obj.vy;
                
                // Bounce off walls
                if (obj.x - obj.radius < 0 || obj.x + obj.radius > p.width) {
                    obj.vx *= -0.8;
                    obj.x = p.constrain(obj.x, obj.radius, p.width - obj.radius);
                }
                if (obj.y - obj.radius < 0 || obj.y + obj.radius > p.height) {
                    obj.vy *= -0.8;
                    obj.y = p.constrain(obj.y, obj.radius, p.height - obj.radius);
                }
                
                // Draw object
                p.fill(obj.color);
                p.noStroke();
                p.circle(obj.x, obj.y, obj.radius * 2);
                
                // Draw mass label
                p.fill(255);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(12);
                p.text(obj.mass + 'kg', obj.x, obj.y);
                
                // Draw velocity vector
                if (showVectors) {
                    p.stroke(255);
                    p.strokeWeight(2);
                    p.line(obj.x, obj.y, obj.x + obj.vx * 2, obj.y + obj.vy * 2);
                }
            });
            
            // Draw info
            p.fill(200);
            p.textSize(12);
            p.textAlign(p.LEFT);
            p.text('Drag objects | Arrow keys for force | R to reset', 10, 20);
        };
        
        p.mouseDragged = function() {
            objects.forEach(obj => {
                const d = p.dist(p.mouseX, p.mouseY, obj.x, obj.y);
                if (d < obj.radius) {
                    selectedObject = obj;
                }
            });
            
            if (selectedObject) {
                selectedObject.x = p.mouseX;
                selectedObject.y = p.mouseY;
            }
            return false;
        };
        
        p.mouseReleased = function() {
            if (selectedObject) {
                selectedObject.vx = (p.mouseX - p.pmouseX) * 0.5;
                selectedObject.vy = (p.mouseY - p.pmouseY) * 0.5;
                selectedObject = null;
            }
        };
        
        p.keyPressed = function() {
            if (p.key === 'r' || p.key === 'R') {
                objects.forEach(obj => {
                    obj.vx = 0;
                    obj.vy = 0;
                });
            }
            if (p.key === ' ') {
                showVectors = !showVectors;
            }
        };
        
        p.windowResized = function() {
            if (p.windowWidth > 100) {
                p.resizeCanvas(container.clientWidth, container.clientHeight);
            }
        };
    };
    
    new p5(sketch);
}

function setupControls() {
    const controlsHtml = `
        <div class="control-group">
            <label>Gravity</label>
            <input type="range" min="0" max="2" step="0.1" value="0.5" 
                onchange="gravity = parseFloat(this.value)">
        </div>
        <div class="control-group">
            <label>Friction</label>
            <input type="range" min="0.8" max="1" step="0.01" value="0.95" 
                onchange="friction = parseFloat(this.value)">
        </div>
        <div class="control-group">
            <label>
                <input type="checkbox" checked onchange="showVectors = this.checked">
                Show Vectors
            </label>
        </div>
    `;
    
    const controlsContainer = document.querySelector('.controls-wrapper');
    if (controlsContainer) {
        controlsContainer.innerHTML = controlsHtml;
    }
}