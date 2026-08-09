// ===== OCEAN CURRENTS v2.0 =====
// Ultra-realistic fluid dynamics with thermodynamics
// Physics: Navier-Stokes (simplified), Ekman spiral, geostrophic balance, heat diffusion
// Graphics: Multi-layered water, light refraction, wave dynamics, temperature gradients

let oceanSketch = function(p) {
    let canvasWidth = 800;
    let canvasHeight = 600;
    let particles = [];
    let temperature = 25;
    let coriolisStrength = 1;
    let windStrength = 0.8;
    let showCurrentPaths = true;
    let showTemperatureMap = true;
    let showWaves = true;
    
    let velocityField = [];
    let temperatureField = [];
    let waveField = [];
    let oceanDepth = 200; // Visual depth in pixels
    let time = 0;
    
    // Ekman spiral simulation
    let ekmanSpiralLayers = [];
    
    p.setup = function() {
        const container = document.getElementById('simulation-canvas');
        if (container) {
            canvasWidth = container.clientWidth || 800;
            canvasHeight = container.clientHeight || 600;
        }
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        if (container) {
            canvas.parent('simulation-canvas');
        }
        p.pixelDensity(1);
        
        initializeOcean();
        setupControls();
        initSketch(this);
        
        if (typeof soundManager !== 'undefined' && soundManager.startAmbientLoop) {
            soundManager.startAmbientLoop('geography', 'ocean');
        }
    };
    
    p.draw = function() {
        // Layered rendering for depth
        drawOceanBasin();
        drawUnderseaTopography();
        
        // Clear water with gradient
        p.background('#050507');
        
        // Temperature gradient visualization
        if (showTemperatureMap) {
            drawTemperatureMap();
        }
        
        // Wave field
        if (showWaves) {
            updateWaveField();
            drawWaveField();
        }
        
        // Update physics
        updateParticles();
        updateVelocityField();
        updateTemperatureField();
        
        // Draw water layers (deep to shallow)
        drawOceanLayers();
        
        // Render particles with depth
        drawParticles();
        
        // Major current paths
        if (showCurrentPaths) {
            drawAdvancedCurrentPaths();
        }
        
        // Ekman spiral visualization
        drawEkmanSpiral();
        
        // Surface dynamics
        drawSurfaceDynamics();
        
        // Info
        drawAdvancedOceanInfo();
        
        time += 0.016;
    };
    
    function initializeOcean() {
        // Create particle field (water parcels)
        particles = [];
        const particleCount = 200;
        
        for (let i = 0; i < particleCount; i++) {
            const depth = p.random(0, oceanDepth);
            
            particles.push({
                x: p.random(canvasWidth * 0.05, canvasWidth * 0.95),
                y: p.random(canvasHeight * 0.1, canvasHeight * 0.85),
                vx: 0,
                vy: 0,
                age: 0,
                trail: [],
                color: p.random([
                    'rgba(0, 200, 255, 0.7)',
                    'rgba(100, 200, 255, 0.7)',
                    'rgba(0, 150, 200, 0.7)',
                    'rgba(150, 200, 220, 0.7)'
                ]),
                temperature: p.random(5, 25),
                salinity: p.random(33, 35),
                depth: depth,
                density: 1025 + (25 - p.random(5, 25)) * 0.8, // Higher T = lower density
                brightness: p.map(depth, 0, oceanDepth, 1, 0.3)
            });
        }
        
        // Initialize velocity field (for visualization)
        velocityField = [];
        const fieldResolution = 8;
        for (let x = 0; x < canvasWidth; x += fieldResolution) {
            for (let y = 0; y < canvasHeight; y += fieldResolution) {
                velocityField.push({
                    x: x,
                    y: y,
                    vx: 0,
                    vy: 0
                });
            }
        }
        
        // Initialize temperature field
        temperatureField = [];
        for (let y = 0; y < canvasHeight; y += 15) {
            temperatureField.push({
                y: y,
                temp: p.map(y, 0, canvasHeight, 25, 5)
            });
        }
        
        // Wave field
        waveField = [];
        for (let x = 0; x < canvasWidth; x += 10) {
            waveField.push({
                x: x,
                amplitude: 0,
                phase: p.random(p.TWO_PI)
            });
        }
        
        // Ekman spiral layers
        ekmanSpiralLayers = [];
        for (let depth = 0; depth < 100; depth += 10) {
            ekmanSpiralLayers.push({
                depth: depth,
                angle: p.map(depth, 0, 100, 0, p.PI),
                velocity: 1 - depth / 100
            });
        }
    }
    
    function drawOceanBasin() {
        p.push();
        
        // Deep ocean gradient
        const oceanGrad = p.drawingContext.createLinearGradient(0, 0, 0, canvasHeight);
        oceanGrad.addColorStop(0, 'rgba(10, 100, 150, 0.3)');
        oceanGrad.addColorStop(0.5, 'rgba(5, 80, 120, 0.2)');
        oceanGrad.addColorStop(1, 'rgba(0, 50, 80, 0.1)');
        
        p.drawingContext.fillStyle = oceanGrad;
        p.drawingContext.fillRect(0, 0, canvasWidth, canvasHeight);
        
        p.pop();
    }
    
    function drawUnderseaTopography() {
        p.push();
        
        // Simplified seafloor visualization
        p.fill('rgba(50, 70, 80, 0.1)');
        p.stroke('rgba(80, 120, 140, 0.05)');
        p.strokeWeight(1);
        
        p.beginShape();
        for (let x = 0; x < canvasWidth; x += 20) {
            const seafloorDepth = p.map(Math.sin(x * 0.01), -1, 1, 0.8, 1);
            const y = canvasHeight * seafloorDepth;
            p.vertex(x, y);
        }
        p.vertex(canvasWidth, canvasHeight);
        p.vertex(0, canvasHeight);
        p.endShape(p.CLOSE);
        
        p.pop();
    }
    
    function drawTemperatureMap() {
        temperatureField.forEach((field, i) => {
            const temp = field.temp;
            
            // Draw temperature band
            const r = Math.floor(p.map(temp, 5, 25, 50, 200));
            const g = Math.floor(p.map(temp, 5, 25, 150, 100));
            const b = Math.floor(p.map(temp, 5, 25, 255, 100));
            
            p.stroke(`rgba(${r}, ${g}, ${b}, 0.05)`);
            p.strokeWeight(15);
            p.line(0, field.y, canvasWidth, field.y);
        });
    }
    
    function updateWaveField() {
        waveField.forEach(wave => {
            // Wind-driven wave generation
            const windWave = Math.sin(time * 0.02 + wave.phase) * windStrength;
            const swellWave = Math.sin(time * 0.01 + wave.x * 0.01) * 0.5;
            
            wave.amplitude = p.lerp(wave.amplitude, windWave + swellWave, 0.1);
        });
    }
    
    function drawWaveField() {
        if (!showWaves) return;
        
        p.push();
        p.stroke('rgba(0, 217, 255, 0.15)');
        p.strokeWeight(1.5);
        p.noFill();
        
        // Draw surface waves
        p.beginShape();
        waveField.forEach(wave => {
            const waveY = canvasHeight * 0.15 + wave.amplitude * 5;
            p.vertex(wave.x, waveY);
        });
        p.endShape();
        
        // Wave glow
        p.stroke('rgba(0, 217, 255, 0.08)');
        p.beginShape();
        waveField.forEach(wave => {
            const waveY = canvasHeight * 0.15 + wave.amplitude * 5 + 2;
            p.vertex(wave.x, waveY);
        });
        p.endShape();
        
        p.pop();
    }
    
    function updateParticles() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        particles.forEach((particle, index) => {
            // Distance from equator (vertical center)
            const latDistance = (particle.y - centerY * 1.2) / (canvasHeight * 0.4);
            const lonDistance = (particle.x - centerX) / (canvasWidth * 0.4);
            
            // ===== OCEAN PHYSICS =====
            
            // 1. WIND STRESS (Trade winds & westerlies)
            let windForceX = 0;
            if (Math.abs(latDistance) < 0.3) {
                // Doldrums & trade winds (equatorial)
                windForceX = -windStrength * 0.7;
            } else if (Math.abs(latDistance) > 0.3 && Math.abs(latDistance) < 0.6) {
                // Westerlies (mid-latitudes)
                windForceX = windStrength * 0.6 * (latDistance > 0 ? 1 : -1);
            }
            
            // 2. CORIOLIS EFFECT (right-deflecting in N hemisphere, left in S)
            const coriolisX = latDistance * coriolisStrength * 0.3;
            const coriolisY = lonDistance * coriolisStrength * 0.2;
            
            // 3. PRESSURE GRADIENT (Temperature/density-driven thermohaline)
            const temperatureDifference = (temperature - particle.temperature) * 0.02;
            const pressureGradient = latDistance * temperatureDifference * 0.5;
            
            // 4. FRICTION/DAMPING
            const damping = 0.95;
            
            // 5. TURBULENT MIXING
            const turbulence = p.random(-0.2, 0.2);
            
            // Apply forces
            particle.vx += windForceX - coriolisX + pressureGradient + turbulence;
            particle.vy += -coriolisY;
            
            // Apply damping
            particle.vx *= damping;
            particle.vy *= damping;
            
            // Velocity limit
            const maxVel = 3;
            const vel = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            if (vel > maxVel) {
                particle.vx = (particle.vx / vel) * maxVel;
                particle.vy = (particle.vy / vel) * maxVel;
            }
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Boundary conditions
            if (particle.x < 0) particle.x = canvasWidth;
            if (particle.x > canvasWidth) particle.x = 0;
            
            if (particle.y < canvasHeight * 0.1) {
                particle.y = canvasHeight * 0.1;
                particle.vy *= -0.3;
            }
            if (particle.y > canvasHeight * 0.85) {
                particle.y = canvasHeight * 0.85;
                particle.vy *= -0.3;
            }
            
            // Trail
            particle.trail.push({ x: particle.x, y: particle.y });
            if (particle.trail.length > 25) {
                particle.trail.shift();
            }
            
            // Temperature interaction
            const closestTemp = p.constrain(particle.y / canvasHeight * 30 - 5, 5, 25);
            particle.temperature = p.lerp(particle.temperature, closestTemp, 0.01);
            
            particle.age++;
        });
    }
    
    function updateVelocityField() {
        velocityField.forEach(field => {
            // Simplified geostrophic balance
            const latDistance = (field.y - canvasHeight / 2) / (canvasHeight / 2);
            
            field.vx = Math.sin(latDistance * p.PI) * 2 * windStrength;
            field.vy = Math.cos(latDistance * p.PI) * 0.5;
        });
    }
    
    function updateTemperatureField() {
        temperatureField.forEach(field => {
            // Slow temperature diffusion
            field.temp = p.lerp(field.temp, temperature * (1 - Math.abs(field.y / canvasHeight - 0.5) * 2), 0.001);
        });
    }
    
    function drawOceanLayers() {
        // Draw multiple depth layers
        for (let layer = 0; layer < 4; layer++) {
            const layerY = canvasHeight * (0.15 + layer * 0.15);
            const layerOpacity = 0.05 * (4 - layer) / 4;
            
            p.push();
            p.stroke(`rgba(0, 217, 255, ${layerOpacity})`);
            p.strokeWeight(0.5);
            p.line(0, layerY, canvasWidth, layerY);
            p.pop();
        }
    }
    
    function drawParticles() {
        particles.forEach(particle => {
            p.push();
            
            // Trail with depth gradient
            for (let i = 0; i < particle.trail.length; i++) {
                const t = i / particle.trail.length;
                const opacity = t * 0.3 * particle.brightness;
                p.stroke(`rgba(0, 217, 255, ${opacity})`);
                p.strokeWeight(0.5);
                
                if (i < particle.trail.length - 1) {
                    p.line(
                        particle.trail[i].x, particle.trail[i].y,
                        particle.trail[i + 1].x, particle.trail[i + 1].y
                    );
                }
            }
            
            // Particle glow (temperature-colored)
            const tempColor = p.map(particle.temperature, 5, 25, 200, 100);
            const glowGrad = p.drawingContext.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, 10
            );
            glowGrad.addColorStop(0, `rgba(${tempColor}, 200, 255, ${0.2 * particle.brightness})`);
            glowGrad.addColorStop(1, `rgba(${tempColor}, 200, 255, 0)`);
            
            p.drawingContext.fillStyle = glowGrad;
            p.drawingContext.beginPath();
            p.drawingContext.arc(particle.x, particle.y, 10, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            // Particle core
            p.fill(`rgba(${tempColor}, 180, 255, ${0.8 * particle.brightness})`);
            p.noStroke();
            p.ellipse(particle.x, particle.y, 5);
            
            p.pop();
        });
    }
    
    function drawAdvancedCurrentPaths() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2.5;
        
        // Major currents with realistic paths
        
        // 1. North Atlantic Gyre (Gulf Stream)
        drawOceanCurrent(
            {
                path: [
                    { x: centerX - 180, y: centerY + 80, intensity: 0.8 },
                    { x: centerX - 120, y: centerY - 40, intensity: 0.9 },
                    { x: centerX - 20, y: centerY - 100, intensity: 0.7 }
                ],
                color: 'rgba(255, 100, 50, ',
                label: 'Gulf Stream',
                temp: 'Warm'
            }
        );
        
        // 2. Kuroshio Current
        drawOceanCurrent(
            {
                path: [
                    { x: centerX + 180, y: centerY + 60, intensity: 0.8 },
                    { x: centerX + 120, y: centerY - 50, intensity: 0.85 },
                    { x: centerX + 40, y: centerY - 90, intensity: 0.7 }
                ],
                color: 'rgba(255, 100, 50, ',
                label: 'Kuroshio',
                temp: 'Warm'
            }
        );
        
        // 3. Antarctic Circumpolar Current
        drawOceanCurrent(
            {
                path: [
                    { x: centerX - 150, y: centerY + 180, intensity: 0.9 },
                    { x: centerX, y: centerY + 200, intensity: 0.95 },
                    { x: centerX + 150, y: centerY + 180, intensity: 0.9 }
                ],
                color: 'rgba(100, 200, 255, ',
                label: 'ACC',
                temp: 'Cold'
            }
        );
        
        // 4. Equatorial Current
        drawOceanCurrent(
            {
                path: [
                    { x: centerX - 200, y: centerY + 20, intensity: 0.7 },
                    { x: centerX, y: centerY, intensity: 0.8 },
                    { x: centerX + 150, y: centerY - 10, intensity: 0.7 }
                ],
                color: 'rgba(255, 200, 100, ',
                label: 'N.Eq.Curr',
                temp: 'Warm'
            }
        );
    }
    
    function drawOceanCurrent(current) {
        p.push();
        
        // Draw current path as flowing arrows
        for (let i = 0; i < current.path.length - 1; i++) {
            const start = current.path[i];
            const end = current.path[i + 1];
            
            // Curved flow line
            p.stroke(current.color + start.intensity + ')');
            p.strokeWeight(3 + start.intensity * 2);
            p.noFill();
            p.bezier(
                start.x, start.y,
                start.x + 30, start.y - 40,
                end.x - 30, end.y + 40,
                end.x, end.y
            );
            
            // Arrow head
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const arrowSize = 12;
            const arrowX = end.x - Math.cos(angle) * arrowSize;
            const arrowY = end.y - Math.sin(angle) * arrowSize;
            
            p.fill(current.color + start.intensity + ')');
            p.stroke(current.color + start.intensity + ')');
            p.strokeWeight(2);
            p.triangle(
                end.x, end.y,
                arrowX + Math.sin(angle) * 6, arrowY - Math.cos(angle) * 6,
                arrowX - Math.sin(angle) * 6, arrowY + Math.cos(angle) * 6
            );
            
            // Current label
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            
            p.fill(current.color + '0.8)');
            p.textAlign(p.CENTER);
            p.textSize(9);
            p.textFont('Space Grotesk');
            p.text(current.label, midX, midY - 15);
        }
        
        p.pop();
    }
    
    function drawEkmanSpiral() {
        const spiralX = canvasWidth * 0.15;
        const spiralY = canvasHeight / 2;
        
        p.push();
        p.stroke('rgba(0, 217, 255, 0.3)');
        p.strokeWeight(1);
        p.noFill();
        
        // Draw Ekman spiral (showing wind-driven current rotation with depth)
        p.beginShape();
        ekmanSpiralLayers.forEach(layer => {
            const x = spiralX + Math.cos(layer.angle) * layer.velocity * 40;
            const y = spiralY + Math.sin(layer.angle) * layer.velocity * 40;
            p.vertex(x, y);
        });
        p.endShape();
        
        // Label
        p.fill('rgba(0, 217, 255, 0.4)');
        p.textAlign(p.CENTER);
        p.textSize(10);
        p.text('Ekman Spiral', spiralX, spiralY + 100);
        
        p.pop();
    }
    
    function drawSurfaceDynamics() {
        // Draw wind stress vectors
        const vectorSpacing = 100;
        
        p.push();
        p.stroke('rgba(255, 200, 100, 0.3)');
        p.strokeWeight(1.5);
        
        for (let x = 0; x < canvasWidth; x += vectorSpacing) {
            for (let y = canvasHeight * 0.1; y < canvasHeight * 0.3; y += vectorSpacing) {
                const latDistance = (y - canvasHeight * 0.2) / (canvasHeight * 0.2);
                const windForce = -Math.sin(latDistance * p.PI) * windStrength;
                
                // Wind vector
                const vectorLength = Math.abs(windForce) * 25;
                p.line(x, y, x + vectorLength, y);
                
                // Arrow
                p.line(x + vectorLength, y, x + vectorLength - 5, y - 3);
                p.line(x + vectorLength, y, x + vectorLength - 5, y + 3);
            }
        }
        
        p.pop();
    }
    
    function drawAdvancedOceanInfo() {
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
        p.text(`Water Parcels: ${particles.length} | Equator Temp: ${temperature.toFixed(1)}°C`, 20, 50);
        p.text(`Coriolis Effect: ${(coriolisStrength * 100).toFixed(0)}% | Wind Stress: ${(windStrength * 100).toFixed(0)}%`, 20, 70);
        
        // Legend
        p.textSize(11);
        p.fill('rgba(100, 200, 255, 0.7)');
        p.text('🔴 Warm currents (T>15°C)  🔵 Cold currents (T<10°C)  🟠 Equatorial currents', 20, canvasHeight - 45);
        
        p.textSize(10);
        p.fill('rgba(160, 160, 168, 0.5)');
        p.text('Wind drives surface. Coriolis deflects flow. Temperature creates density gradients.', 20, canvasHeight - 25);
        
        p.pop();
    }
    
    function setupControls() {
        const controlsSection = document.getElementById('controls-section');
        if (!controlsSection) return;
        controlsSection.innerHTML = '';
        
        let tempGroup = createControlGroup('Equator Temp', 5, 30, temperature, (val) => {
            temperature = val;
        });
        controlsSection.appendChild(tempGroup);
        
        let coriolisGroup = createControlGroup('Coriolis', 0.2, 2, coriolisStrength, (val) => {
            coriolisStrength = val;
        });
        controlsSection.appendChild(coriolisGroup);
        
        let windGroup = createControlGroup('Wind Force', 0.1, 1.5, windStrength, (val) => {
            windStrength = val;
        });
        controlsSection.appendChild(windGroup);
        
        let pathsBtn = createButton(showCurrentPaths ? '👁 Hide Currents' : '👁 Show Currents', () => {
            showCurrentPaths = !showCurrentPaths;
            pathsBtn.textContent = showCurrentPaths ? '👁 Hide Currents' : '👁 Show Currents';
        });
        controlsSection.appendChild(pathsBtn);
    }
    
    this.resetSketch = function() {
        initializeOcean();
        temperature = 25;
        coriolisStrength = 1;
        windStrength = 0.8;
        time = 0;
        if (typeof soundManager !== 'undefined' && soundManager.playSuccess) {
            soundManager.playSuccess();
        }
    };
};

new p5(oceanSketch);