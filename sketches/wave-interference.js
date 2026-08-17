// ===== WAVE INTERFERENCE =====
// Interactive wave superposition visualizer

let wavelength = 40;
let amplitude = 30;
let speed = 2;
let source1X, source2X, sourceY;
let time = 0;

function initSketch(config) {
    const container = document.getElementById(config.containerId);
    if (!container) return;
    
    const sketch = (p) => {
        p.setup = function() {
            const w = container.clientWidth;
            const h = container.clientHeight;
            const canvas = p.createCanvas(w, h);
            canvas.parent(container);
            
            source1X = w * 0.3;
            source2X = w * 0.7;
            sourceY = h / 2;
            
            setupControls();
        };
        
        p.draw = function() {
            p.background(26, 26, 26);
            
            time += speed * 0.05;
            
            // Draw grid of points showing wave interference
            const step = 15;
            p.noStroke();
            
            for (let x = 0; x < p.width; x += step) {
                for (let y = 0; y < p.height; y += step) {
                    // Distance to each source
                    const d1 = p.sqrt((x - source1X) ** 2 + (y - sourceY) ** 2);
                    const d2 = p.sqrt((x - source2X) ** 2 + (y - sourceY) ** 2);
                    
                    // Wave height from each source
                    const wave1 = p.sin((d1 / wavelength) * p.TWO_PI - time);
                    const wave2 = p.sin((d2 / wavelength) * p.TWO_PI - time);
                    
                    // Superposition
                    const combined = (wave1 + wave2) / 2;
                    
                    // Color based on amplitude
                    const brightness = p.map(combined, -1, 1, 50, 255);
                    p.fill(brightness);
                    p.circle(x, y, 4);
                }
            }
            
            // Draw wave sources
            p.fill(255, 100, 100);
            p.circle(source1X, sourceY, 12);
            p.fill(100, 150, 255);
            p.circle(source2X, sourceY, 12);
            
            // Info
            p.fill(200);
            p.textSize(12);
            p.textAlign(p.LEFT);
            p.text('Red = Source 1 | Blue = Source 2 | Bright = Constructive', 10, 20);
            p.text('Wavelength: ' + wavelength.toFixed(0), 10, 40);
        };
    };
    
    new p5(sketch);
}

function setupControls() {
    const controlsHtml = `
        <div class="control-group">
            <label>Wavelength</label>
            <input type="range" min="15" max="100" step="5" value="40" 
                onchange="wavelength = parseFloat(this.value)">
        </div>
        <div class="control-group">
            <label>Speed</label>
            <input type="range" min="0.5" max="4" step="0.5" value="2" 
                onchange="speed = parseFloat(this.value)">
        </div>
        <div class="info-box" style="margin-top: 12px; padding: 12px; background: #222; border-radius: 4px;">
            <div style="font-size: 11px; color: #888;">Watch bright regions appear where waves reinforce (constructive) and dark where they cancel (destructive).</div>
        </div>
    `;
    
    const controlsContainer = document.querySelector('.controls-wrapper');
    if (controlsContainer) {
        controlsContainer.innerHTML = controlsHtml;
    }
}