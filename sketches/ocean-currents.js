// ===== OCEAN CURRENTS SIMULATION =====
// Real fluid dynamics with Coriolis effect and thermohaline circulation
// Author: toibawani
// Physics: Fluid Dynamics, Coriolis Force, Heat Transport

let oceanSketch = function(p) {
    let canvasWidth = 800;
    let canvasHeight = 600;
    let particles = [];
    let temperature = 25; // Equator temperature
    let coriolisStrength = 1;
    let windStrength = 0.5;
    let showCurrentPaths = true;
    
    const gridSize = 20;
    let velocityField = [];
    
    p.setup = function() {
        const container = document.getElementById('simulation-canvas');
        canvasWidth = container.clientWidth;
        canvasHeight = container.clientHeight;
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent('simulation-canvas');
        
        initializeOcean();
        setupControls();
        initSketch(this);
    };
    
    p.draw = function() {
        p.background('#050507');
        
        // Draw ocean temperature gradient (equator to poles)
        drawTemperatureGradient();
        
        // Draw major ocean currents (reference lines)
        if (showCurrentPaths) {
            drawCurrentPaths();
        }
        
        // Update and draw particles
        particles.forEach((particle) => {
            updateParticle(particle);
            drawParticle(particle);
        });
        
        // Draw continental boundaries (simplified)
        drawContinents();
        
        // Draw info panel
        drawInfo();
    };
    
    function initializeOcean() {
        particles = [];
        const particleCount = 150;
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: p.random(canvasWidth * 0.05, canvasWidth * 0.95),
                y: p.random(canvasHeight * 0.05, canvasHeight * 0.95),
                vx: 0,
                vy: 0,
                age: 0,
                trail: [],
                color: p.random([
                    'rgba(0, 217, 255, 0.8)',
                    'rgba(100, 200, 255, 0.8)',
                    'rgba(0, 150, 200, 0.8)',
                    'rgba(200, 150, 100, 0.8)' // cold/warm water colors
                ]),
                temperature: p.random(5, 25)
            });
        }
    }
    
    function updateParticle(particle) {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Distance from equator (center)
        const latDistance = (particle.y - centerY) / (canvasHeight / 2);
        const lonDistance = (particle.x - centerX) / (canvasWidth / 2);
        
        // ===== FORCES =====
        
        // 1. CORIOLIS EFFECT (Deflects moving water)
        // Stronger at poles, zero at equator
        const coriolisLat = Math.abs(latDistance); // Stronger away from equator
        const coriolisForceX = latDistance * coriolisStrength * 0.4; // Deflects west/east
        const coriolisForceY = lonDistance * coriolisStrength * 0.2; // Deflects north/south
        
        // 2. WIND STRESS (Trade winds, westerlies)
        let windForceX = windStrength * 0.5;
        let windForceY = 0;
        
        // Trade winds (easterlies) near equator
        if (Math.abs(latDistance) < 0.3) {
            windForceX = -windStrength * 0.6; // Blow water west
        } else if (Math.abs(latDistance) > 0.3) {
            // Westerlies (mid-latitudes)
            windForceX = windStrength * 0.6; // Blow water east
        }
        
        // 3. PRESSURE GRADIENT (Temperature/density-driven)
        // Warm water (low density) at equator wants to spread poleward
        const tempDifference = (25 - particle.temperature) * 0.02;
        const pressureGradient = latDistance * tempDifference;
        
        // 4. FRICTION / DAMPING
        const damping = 0.96;
        
        // Apply all forces
        particle.vx += windForceX - coriolisForceX + pressureGradient;
        particle.vy += windForceY - coriolisForceY;
        
        // Apply damping
        particle.vx *= damping;
        particle.vy *= damping;
        
        // Limit max velocity (water doesn't move infinitely fast)
        const maxVel = 3;
        const vel = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
        if (vel > maxVel) {
            particle.vx = (particle.vx / vel) * maxVel;
            particle.vy = (particle.vy / vel) * maxVel;
        }
        
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Wrap around horizontally (east-west wrapping like Earth)
        if (particle.x < 0) particle.x = canvasWidth;
        if (particle.x > canvasWidth) particle.x = 0;
        
        // Reflect at poles (north-south boundaries)
        if (particle.y < 0) {
            particle.y = -particle.y;
            particle.vy *= -0.5;
        }
        if (particle.y > canvasHeight) {
            particle.y = 2 * canvasHeight - particle.y;
            particle.vy *= -0.5;
        }
        
        // Trail for visualization
        particle.trail.push({ x: particle.x, y: particle.y });
        if (particle.trail.length > 20) particle.trail.shift();
        
        particle.age++;
    }
    
    function drawTemperatureGradient() {
        const centerY = canvasHeight / 2;
        const stripHeight = 5;
        
        for (let y = 0; y < canvasHeight; y += stripHeight) {
            // Temperature decreases from equator to poles
            const distFromEquator = Math.abs(y - centerY) / (canvasHeight / 2);
            const temp = p.lerp(25, 5, distFromEquator);
            
            // Color: red (hot) to blue (cold)
            const hue = p.map(temp, 5, 25, 0, 100);
            const r = Math.floor(p.map(temp, 5, 25, 50, 200));
            const g = Math.floor(p.map(temp, 5, 25, 150, 100));
            const b = Math.floor(p.map(temp, 5, 25, 255, 100));
            
            p.stroke(`rgba(${r}, ${g}, ${b}, 0.08)`);
            p.strokeWeight(stripHeight);
            p.line(0, y, canvasWidth, y);
        }
    }
    
    function drawCurrentPaths() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Draw major ocean current paths
        
        // 1. Gulf Stream (warm current, North Atlantic)
        drawCurrent(
            centerX - 150,
            centerY - 80,
            100,
            0.3,
            'rgba(255, 100, 50, 0.6)',
            'Gulf Stream'
        );
        
        // 2. Kuroshio Current (warm current, North Pacific)
        drawCurrent(
            centerX + 120,
            centerY - 60,
            80,
            0.2,
            'rgba(255, 100, 50, 0.6)',
            'Kuroshio'
        );
        
        // 3. Antarctic Circumpolar (cold current)
        drawCurrent(
            centerX,
            centerY + 140,
            140,
            0,
            'rgba(100, 200, 255, 0.6)',
            'ACC'
        );
        
        // 4. Equatorial Current
        drawCurrent(
            centerX - 140,
            centerY + 30,
            100,
            0,
            'rgba(255, 200, 100, 0.6)',
            'N.Eq.Current'
        );
    }
    
    function drawCurrent(x, y, size, rotation, color, label) {
        p.push();
        p.translate(x, y);
        p.rotate(rotation);
        
        // Arrow line
        p.stroke(color);
        p.strokeWeight(3);
        p.line(0, 0, size, 0);
        
        // Arrow head
        p.line(size, 0, size - 12, -6);
        p.line(size, 0, size - 12, 6);
        
        // Label
        p.fill(color.replace('0.6', '1'));
        p.noStroke();
        p.textSize(10);
        p.textAlign(p.CENTER);
        p.text(label, size / 2, -12);
        
        p.pop();
    }
    
    function drawContinents() {
        p.stroke('rgba(100, 100, 100, 0.3)');
        p.strokeWeight(1);
        p.fill('rgba(50, 50, 50, 0.2)');
        
        // Simplified continent shapes
        // Americas (left side)
        p.ellipse(canvasWidth * 0.15, canvasHeight * 0.3, 40, 200);
        
        // Europe/Africa (middle)
        p.ellipse(canvasWidth * 0.5, canvasHeight * 0.4, 50, 150);
        
        // Asia (right side)
        p.ellipse(canvasWidth * 0.75, canvasHeight * 0.25, 60, 180);
    }
    
    function drawParticle(particle) {
        // Draw trail (path through ocean)
        p.stroke(particle.color.replace('0.8', '0.2'));
        p.strokeWeight(0.5);
        p.noFill();
        p.beginShape();
        particle.trail.forEach(t => p.vertex(t.x, t.y));
        p.endShape();
        
        // Draw particle
        p.fill(particle.color);
        p.noStroke();
        p.ellipse(particle.x, particle.y, 5);
        
        // Glow effect for moving water
        const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
        if (speed > 1) {
            p.fill(particle.color.replace('0.8', '0.3'));
            p.ellipse(particle.x, particle.y, 10);
        }
    }
    
    function drawInfo() {
        p.push();
        p.fill('rgba(245, 245, 247, 0.9)');
        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        p.textFont('Syne');
        p.textSize(18);
        p.text('Ocean Currents', 20, 20);
        
        p.textFont('Space Grotesk');
        p.textSize(12);
        p.fill('rgba(160, 160, 168, 0.9)');
        p.text('Water Particles: ' + particles.length, 20, 50);
        p.text('Equator Temperature: ' + temperature.toFixed(1) + '°C', 20, 70);
        p.text('Coriolis Strength: ' + (coriolisStrength * 100).toFixed(0) + '%', 20, 90);
        p.text('Wind Stress: ' + (windStrength * 100).toFixed(0) + '%', 20, 110);
        
        p.textSize(11);
        p.fill('rgba(100, 200, 255, 0.7)');
        p.text('🔴 Warm currents  🔵 Cold currents', 20, 135);
        
        p.textSize(11);
        p.fill('rgba(160, 160, 168, 0.6)');
        p.text('Adjust parameters to watch currents change', 20, canvasHeight - 25);
        
        p.pop();
    }
    
    function setupControls() {
        const controlsSection = document.getElementById('controls-section');
        controlsSection.innerHTML = ''; // Clear existing
        
        // Temperature control
        let tempGroup = createControlGroup('Equator Temp (°C)', 5, 30, temperature, (val) => {
            temperature = val;
        });
        controlsSection.appendChild(tempGroup);
        
        // Coriolis effect
        let coriolisGroup = createControlGroup('Coriolis Effect', 0.2, 2, coriolisStrength, (val) => {
            coriolisStrength = val;
        });
        controlsSection.appendChild(coriolisGroup);
        
        // Wind strength
        let windGroup = createControlGroup('Wind Stress', 0.1, 1, windStrength, (val) => {
            windStrength = val;
        });
        controlsSection.appendChild(windGroup);
        
        // Toggle current paths
        let pathsBtn = createButton(showCurrentPaths ? '👁 Hide Paths' : '👁 Show Paths', () => {
            showCurrentPaths = !showCurrentPaths;
            pathsBtn.textContent = showCurrentPaths ? '👁 Hide Paths' : '👁 Show Paths';
        });
        controlsSection.appendChild(pathsBtn);
    }
    
    this.resetSketch = function() {
        initializeOcean();
        temperature = 25;
        coriolisStrength = 1;
        windStrength = 0.5;
    };
};

new p5(oceanSketch);