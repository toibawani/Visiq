// ===== BLACK HOLE SIMULATION v2.0 =====
// Photorealistic spacetime warping with advanced rendering
// Physics: Schwarzschild metric, gravitational lensing, accretion disk dynamics
// Graphics: Multi-layered rendering, volumetric effects, realistic particle physics

let blackHoleSketch = function(p) {
    let canvasWidth = 800;
    let canvasHeight = 600;
    let particles = [];
    let photons = []; // Light rays for lensing
    let accretionDiskParticles = [];
    let time = 0;
    let blackHoleMass = 2;
    let particleSpeed = 1;
    let showFieldLines = true;
    let showLensing = true;
    let cameraZoom = 1;
    
    // Physics constants
    const G = 6.674e-11 / 1e30;
    const c = 300;
    const schwarzschildRadius = 40;
    const eventHorizonGlowRadius = schwarzschildRadius * 1.8;
    
    // Rendering layers
    let backStarfield = [];
    let nebulaClouds = [];
    let accretionDiskLayers = [];
    
    p.setup = function() {
        const container = document.getElementById('simulation-canvas');
        canvasWidth = container.clientWidth;
        canvasHeight = container.clientHeight;
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent('simulation-canvas');
        p.pixelDensity(1);
        
        initializeScene();
        setupControls();
        initSketch(this);
        
        // Play ambient background
        soundManager.startAmbientLoop('physics', 'blackhole');
    };
    
    p.draw = function() {
        // Multi-layer rendering for depth
        drawBackgroundStarfield();
        drawNebulaClouds();
        
        // Main physics simulation
        p.background('#050507');
        
        // Spacetime grid with warping
        if (showFieldLines) {
            drawAdvancedSpacetimeGrid();
        }
        
        // Update all physics
        updateParticles();
        updatePhotons();
        updateAccretionDisk();
        
        // Render layers front-to-back
        drawAccretionDisk();
        drawParticles();
        
        // Gravitational lensing effect
        if (showLensing) {
            drawGravitationalLensing();
        }
        
        // Event horizon and singularity
        drawEventHorizon();
        drawBlackHole();
        
        // Info and controls
        drawAdvancedInfo();
        
        time += 0.016;
    };
    
    function initializeScene() {
        // Initialize background starfield
        backStarfield = [];
        for (let i = 0; i < 500; i++) {
            backStarfield.push({
                x: p.random(canvasWidth * 2),
                y: p.random(canvasHeight * 2),
                size: p.random(0.5, 3),
                brightness: p.random(0.3, 1),
                color: p.random(['rgba(255, 255, 200, ', 'rgba(200, 220, 255, ', 'rgba(255, 150, 100, '])
            });
        }
        
        // Initialize nebula clouds
        nebulaClouds = [];
        for (let i = 0; i < 15; i++) {
            nebulaClouds.push({
                x: p.random(canvasWidth),
                y: p.random(canvasHeight),
                size: p.random(100, 300),
                opacity: p.random(0.05, 0.15),
                color: p.random([
                    'rgba(100, 50, 200, ',
                    'rgba(200, 100, 50, ',
                    'rgba(100, 150, 200, '
                ]),
                vx: p.random(-0.1, 0.1),
                vy: p.random(-0.1, 0.1)
            });
        }
        
        // Accretion disk particles
        accretionDiskParticles = [];
        const diskParticleCount = 300;
        for (let i = 0; i < diskParticleCount; i++) {
            const angle = p.random(p.TWO_PI);
            const radius = p.random(schwarzschildRadius * 1.5, schwarzschildRadius * 4);
            const speed = Math.sqrt(G * blackHoleMass / radius);
            
            accretionDiskParticles.push({
                angle: angle,
                radius: radius,
                speed: speed,
                temperature: p.map(radius, schwarzschildRadius * 1.5, schwarzschildRadius * 4, 1, 0.3),
                brightness: p.random(0.4, 1),
                trailAngle: []
            });
        }
        
        // Initialize regular particles
        particles = [];
        const particleCount = 100;
        for (let i = 0; i < particleCount; i++) {
            const angle = p.random(p.TWO_PI);
            const dist = p.random(200, 400);
            
            particles.push({
                x: canvasWidth / 2 + p.cos(angle) * dist,
                y: canvasHeight / 2 + p.sin(angle) * dist,
                vx: -p.sin(angle) * particleSpeed * 0.8,
                vy: p.cos(angle) * particleSpeed * 0.8,
                trail: [],
                trailBrightness: [],
                color: p.color(p.random([0, 217, 255]), p.random([100, 150, 200]), p.random([150, 200, 255])),
                mass: 0.1,
                sounded: false,
                glowIntensity: p.random(0.5, 1)
            });
        }
        
        // Photons for lensing
        photons = [];
        const photonCount = 40;
        for (let i = 0; i < photonCount; i++) {
            const angle = p.random(p.TWO_PI);
            const dist = p.random(250, 450);
            
            photons.push({
                x: canvasWidth / 2 + p.cos(angle) * dist,
                y: canvasHeight / 2 + p.sin(angle) * dist,
                vx: -p.sin(angle) * c * 0.5,
                vy: p.cos(angle) * c * 0.5,
                angle: angle,
                brightness: p.random(0.3, 0.8)
            });
        }
    }
    
    function drawBackgroundStarfield() {
        p.push();
        backStarfield.forEach(star => {
            p.fill(star.color + (star.brightness * 0.8) + ')');
            p.noStroke();
            
            // Star glow
            const glowSize = star.size * 3;
            p.fill(star.color + (star.brightness * 0.2) + ')');
            p.ellipse(star.x, star.y, glowSize);
            
            // Star core
            p.fill(star.color + (star.brightness) + ')');
            p.ellipse(star.x, star.y, star.size);
            
            // Twinkle
            star.brightness += p.random(-0.02, 0.02);
            star.brightness = p.constrain(star.brightness, 0.3, 1);
        });
        p.pop();
    }
    
    function drawNebulaClouds() {
        p.push();
        nebulaClouds.forEach(cloud => {
            // Move cloud slowly
            cloud.x += cloud.vx;
            cloud.y += cloud.vy;
            
            // Wrap around
            if (cloud.x > canvasWidth + 200) cloud.x = -200;
            if (cloud.y > canvasHeight + 200) cloud.y = -200;
            
            // Draw soft nebula
            const gradient = p.drawingContext.createRadialGradient(
                cloud.x, cloud.y, 0,
                cloud.x, cloud.y, cloud.size
            );
            gradient.addColorStop(0, cloud.color + cloud.opacity + ')');
            gradient.addColorStop(1, cloud.color + (cloud.opacity * 0.1) + ')');
            
            p.drawingContext.fillStyle = gradient;
            p.drawingContext.beginPath();
            p.drawingContext.arc(cloud.x, cloud.y, cloud.size, 0, p.TWO_PI);
            p.drawingContext.fill();
        });
        p.pop();
    }
    
    function drawAdvancedSpacetimeGrid() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const gridSize = 25;
        
        p.stroke('rgba(0, 217, 255, 0.06)');
        p.strokeWeight(0.8);
        
        for (let x = 0; x < canvasWidth; x += gridSize) {
            for (let y = 0; y < canvasHeight; y += gridSize) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distToCenter = p.sqrt(dx * dx + dy * dy);
                
                // Schwarzschild metric warping
                const warpFactor = p.map(distToCenter, 0, 500, 0.15, 1, true);
                const warpX = x + dx * (1 - warpFactor) * 0.5;
                const warpY = y + dy * (1 - warpFactor) * 0.5;
                
                p.point(warpX, warpY);
            }
        }
        
        // Draw radial grid lines
        p.stroke('rgba(0, 217, 255, 0.04)');
        p.strokeWeight(1);
        for (let angle = 0; angle < p.TWO_PI; angle += p.PI / 8) {
            const startX = centerX;
            const startY = centerY;
            const endX = centerX + p.cos(angle) * 400;
            const endY = centerY + p.sin(angle) * 400;
            
            p.line(startX, startY, endX, endY);
        }
    }
    
    function updateParticles() {
        particles.forEach((particle, index) => {
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            
            const dx = centerX - particle.x;
            const dy = centerY - particle.y;
            const distSq = dx * dx + dy * dy;
            const dist = p.sqrt(distSq);
            
            // Gravitational force
            if (dist > schwarzschildRadius + 10) {
                const force = (G * blackHoleMass) / (distSq + 150);
                particle.vx += (dx / dist) * force * 1.8;
                particle.vy += (dy / dist) * force * 1.8;
            } else if (dist < schwarzschildRadius) {
                // Particle consumed
                if (!particle.sounded) {
                    soundManager.playResonance(80 + Math.random() * 40, 1.5);
                    particle.sounded = true;
                }
                
                // Respawn
                particle.x = canvasWidth * 0.5 + p.random(-300, 300);
                particle.y = canvasHeight * 0.5 + p.random(-300, 300);
                particle.sounded = false;
            }
            
            // Damping
            particle.vx *= 0.97;
            particle.vy *= 0.97;
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Boundary wrapping
            if (particle.x < -100) particle.x = canvasWidth + 100;
            if (particle.x > canvasWidth + 100) particle.x = -100;
            if (particle.y < -100) particle.y = canvasHeight + 100;
            if (particle.y > canvasHeight + 100) particle.y = -100;
            
            // Trail
            particle.trail.push({ x: particle.x, y: particle.y });
            if (particle.trail.length > 30) {
                particle.trail.shift();
            }
            
            // Glow intensity pulsing
            particle.glowIntensity += p.random(-0.02, 0.02);
            particle.glowIntensity = p.constrain(particle.glowIntensity, 0.3, 1);
        });
    }
    
    function updatePhotons() {
        photons.forEach(photon => {
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            
            const dx = centerX - photon.x;
            const dy = centerY - photon.y;
            const distSq = dx * dx + dy * dy;
            const dist = p.sqrt(distSq);
            
            // Gravitational lensing (photons bend near event horizon)
            if (dist > schwarzschildRadius + 20) {
                const lensForce = (G * blackHoleMass * 2) / (distSq + 200);
                photon.vx += (dx / dist) * lensForce * 2.5;
                photon.vy += (dy / dist) * lensForce * 2.5;
            }
            
            // Light damping (less than matter)
            photon.vx *= 0.98;
            photon.vy *= 0.98;
            
            photon.x += photon.vx * 0.8;
            photon.y += photon.vy * 0.8;
            
            // Respawn if too far
            if (p.dist(photon.x, photon.y, centerX, centerY) > 500) {
                const angle = p.random(p.TWO_PI);
                const dist = p.random(280, 450);
                photon.x = centerX + p.cos(angle) * dist;
                photon.y = centerY + p.sin(angle) * dist;
            }
        });
    }
    
    function updateAccretionDisk() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        accretionDiskParticles.forEach(disk => {
            // Orbital velocity
            const speed = Math.sqrt(G * blackHoleMass / disk.radius);
            disk.angle += speed / disk.radius * 0.04;
            
            // Slight spiral inward (accretion)
            disk.radius *= 0.9995;
            
            // Temperature increases as it spirals in
            disk.temperature = p.map(disk.radius, schwarzschildRadius * 1.5, schwarzschildRadius * 4, 1, 0.2);
            
            // Respawn if too close
            if (disk.radius < schwarzschildRadius * 1.2) {
                disk.radius = p.random(schwarzschildRadius * 1.5, schwarzschildRadius * 4);
                disk.angle = p.random(p.TWO_PI);
            }
        });
    }
    
    function drawAccretionDisk() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        p.push();
        
        // Draw accretion disk layers (back to front)
        for (let layer = 0; layer < 8; layer++) {
            const layerRadius = schwarzschildRadius * (1.5 + layer * 0.35);
            const diskParticlesInLayer = accretionDiskParticles.filter(
                d => d.radius > layerRadius - 20 && d.radius < layerRadius + 20
            );
            
            // Draw disk as glowing particles
            diskParticlesInLayer.forEach(disk => {
                const x = centerX + p.cos(disk.angle) * disk.radius;
                const y = centerY + p.sin(disk.angle) * disk.radius * 0.3;
                
                // Temperature-based color
                const colorValue = p.map(disk.temperature, 0, 1, 100, 255);
                
                // Particle glow
                const glowGradient = p.drawingContext.createRadialGradient(x, y, 0, x, y, 15);
                glowGradient.addColorStop(0, `rgba(${colorValue}, ${colorValue * 0.8}, 100, 0.4)`);
                glowGradient.addColorStop(1, `rgba(${colorValue}, ${colorValue * 0.8}, 100, 0)`);
                
                p.drawingContext.fillStyle = glowGradient;
                p.drawingContext.beginPath();
                p.drawingContext.arc(x, y, 15, 0, p.TWO_PI);
                p.drawingContext.fill();
                
                // Bright core
                p.fill(`rgba(${colorValue}, ${colorValue * 0.6}, 50, ${disk.brightness})`);
                p.noStroke();
                p.ellipse(x, y, 4);
            });
        }
        
        // Draw disk rings
        p.noFill();
        p.strokeWeight(2);
        for (let i = 0; i < 6; i++) {
            const radius = schwarzschildRadius * (1.5 + i * 0.4);
            const colorVal = 255 - i * 30;
            p.stroke(`rgba(${colorVal}, ${colorVal * 0.6}, 100, ${0.3 - i * 0.04})`);
            p.ellipse(centerX, centerY, radius * 2, radius * 0.5);
        }
        
        p.pop();
    }
    
    function drawParticles() {
        particles.forEach(particle => {
            p.push();
            
            // Trail with gradient
            p.noFill();
            p.strokeWeight(1);
            
            for (let i = 0; i < particle.trail.length; i++) {
                const t = i / particle.trail.length;
                const opacity = t * 0.4;
                p.stroke(`rgba(0, 217, 255, ${opacity})`);
                
                if (i < particle.trail.length - 1) {
                    p.line(
                        particle.trail[i].x, particle.trail[i].y,
                        particle.trail[i + 1].x, particle.trail[i + 1].y
                    );
                }
            }
            
            // Particle glow
            const glowSize = 12;
            const glowGradient = p.drawingContext.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, glowSize
            );
            glowGradient.addColorStop(0, `rgba(0, 217, 255, ${0.3 * particle.glowIntensity})`);
            glowGradient.addColorStop(1, 'rgba(0, 217, 255, 0)');
            
            p.drawingContext.fillStyle = glowGradient;
            p.drawingContext.beginPath();
            p.drawingContext.arc(particle.x, particle.y, glowSize, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            // Particle core
            p.fill('rgba(0, 217, 255, 0.9)');
            p.stroke('rgba(100, 200, 255, 0.7)');
            p.strokeWeight(1.5);
            p.ellipse(particle.x, particle.y, 6);
            
            p.pop();
        });
    }
    
    function drawGravitationalLensing() {
        p.push();
        
        photons.forEach(photon => {
            const size = 4;
            
            // Photon glow
            const glowGradient = p.drawingContext.createRadialGradient(
                photon.x, photon.y, 0,
                photon.x, photon.y, 10
            );
            glowGradient.addColorStop(0, `rgba(255, 200, 100, ${0.4 * photon.brightness})`);
            glowGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
            
            p.drawingContext.fillStyle = glowGradient;
            p.drawingContext.beginPath();
            p.drawingContext.arc(photon.x, photon.y, 10, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            // Photon core
            p.fill(`rgba(255, 200, 100, ${photon.brightness})`);
            p.noStroke();
            p.ellipse(photon.x, photon.y, size);
        });
        
        p.pop();
    }
    
    function drawEventHorizon() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        p.push();
        
        // Event horizon ring (Schwarzschild radius)
        const ringGradient = p.drawingContext.createRadialGradient(
            centerX, centerY, schwarzschildRadius * 0.8,
            centerX, centerY, schwarzschildRadius * 1.2
        );
        ringGradient.addColorStop(0, 'rgba(255, 0, 110, 0.6)');
        ringGradient.addColorStop(0.5, 'rgba(255, 0, 110, 0.3)');
        ringGradient.addColorStop(1, 'rgba(255, 0, 110, 0)');
        
        p.drawingContext.fillStyle = ringGradient;
        p.drawingContext.beginPath();
        p.drawingContext.arc(centerX, centerY, schwarzschildRadius * 1.2, 0, p.TWO_PI);
        p.drawingContext.fill();
        
        // Event horizon boundary
        p.stroke('rgba(255, 0, 110, 0.8)');
        p.strokeWeight(3);
        p.noFill();
        p.ellipse(centerX, centerY, schwarzschildRadius * 2);
        
        p.pop();
    }
    
    function drawBlackHole() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        p.push();
        
        // Singularity (pure black with subtle glow)
        p.fill('rgba(0, 0, 0, 1)');
        p.noStroke();
        p.ellipse(centerX, centerY, schwarzschildRadius * 0.8);
        
        // Singularity quantum glow
        const singularityGlow = p.drawingContext.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, schwarzschildRadius * 0.6
        );
        singularityGlow.addColorStop(0, 'rgba(255, 0, 110, 0.8)');
        singularityGlow.addColorStop(1, 'rgba(255, 0, 110, 0)');
        
        p.drawingContext.fillStyle = singularityGlow;
        p.drawingContext.beginPath();
        p.drawingContext.arc(centerX, centerY, schwarzschildRadius * 0.6, 0, p.TWO_PI);
        p.drawingContext.fill();
        
        p.pop();
    }
    
    function drawAdvancedInfo() {
        p.push();
        p.fill('rgba(245, 245, 247, 0.9)');
        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(13);
        p.textFont('Space Grotesk');
        
        // Title
        p.textSize(16);
        p.textFont('Syne');
        p.fill('rgba(245, 245, 247, 0.9)');
        p.text('Black Hole Simulation', 20, 20);
        
        // Info
        p.textSize(12);
        p.textFont('Space Grotesk');
        p.fill('rgba(160, 160, 168, 0.9)');
        p.text(`Mass (Solar): ${(blackHoleMass * 5).toFixed(1)}M☉`, 20, 45);
        p.text(`Event Horizon: ${schwarzschildRadius.toFixed(1)} px`, 20, 65);
        p.text(`Particles: ${particles.length} | Disk: ${accretionDiskParticles.length}`, 20, 85);
        p.text(`Warp Strength: ${(blackHoleMass * 50).toFixed(0)}%`, 20, 105);
        
        // Legend
        p.textSize(11);
        p.fill('rgba(100, 200, 255, 0.7)');
        p.text('🔵 Orbiting matter  🔴 Event horizon  🟠 Accretion disk', 20, canvasHeight - 45);
        
        p.textSize(10);
        p.fill('rgba(160, 160, 168, 0.5)');
        p.text('Watch spacetime curve. Matter spirals inward. Light bends around singularity.', 20, canvasHeight - 25);
        
        p.pop();
    }
    
    function setupControls() {
        const controlsSection = document.getElementById('controls-section');
        controlsSection.innerHTML = '';
        
        let massGroup = createControlGroup('Black Hole Mass', 1, 8, blackHoleMass, (val) => {
            blackHoleMass = val;
        });
        controlsSection.appendChild(massGroup);
        
        let speedGroup = createControlGroup('Particle Speed', 0.3, 2, particleSpeed, (val) => {
            particleSpeed = val;
        });
        controlsSection.appendChild(speedGroup);
        
        let gridBtn = createButton('Toggle Grid', () => {
            showFieldLines = !showFieldLines;
            soundManager.playChime(800, 0.15);
        });
        controlsSection.appendChild(gridBtn);
        
        let lensBtn = createButton('Toggle Lensing', () => {
            showLensing = !showLensing;
            soundManager.playChime(850, 0.15);
        });
        controlsSection.appendChild(lensBtn);
    }
    
    this.resetSketch = function() {
        initializeScene();
        blackHoleMass = 2;
        particleSpeed = 1;
        time = 0;
        soundManager.playSuccess();
    };
};

new p5(blackHoleSketch);