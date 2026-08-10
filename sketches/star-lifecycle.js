// ===== STAR LIFECYCLE SIMULATION v1.0 =====
// Photorealistic stellar evolution
// Astronomy: Birth → main sequence → red giant → supernova → remnant
// Graphics: Nebula clouds, stellar fusion, mass loss, explosion, neutron star

let starLifecycleSketch = function(p) {
    let canvasWidth = 800;
    let canvasHeight = 600;
    
    // Simulation state
    let time = 0;
    let stage = 0; // 0: Nebula, 1: Protostar, 2: Main Sequence, 3: Red Giant, 4: Supernova, 5: Neutron Star
    let stageProgress = 0;
    let autoPlay = true;
    let speed = 1;
    let showFusionCore = true;
    let showParticles = true;
    
    // Star properties
    let star = {
        x: canvasWidth / 2,
        y: canvasHeight / 2,
        radius: 20,
        temperature: 5000,
        luminosity: 1,
        mass: 1,
        density: 1.41e3, // kg/m^3
        fuelBurned: 0,
        rotationSpeed: 0,
        jetVelocity: 0,
        explosionForce: 0,
        remnantRadius: 0
    };
    
    // Particle systems
    let nebulaClouds = [];
    let accretionDisk = [];
    let fusionParticles = [];
    let stellarWind = [];
    let supernova_Ejecta = [];
    let neutronStarCrust = [];
    let distantStars = [];
    
    // Visual effects
    let magneticField = [];
    let lightCurve = [];
    let coronalMass = [];
    
    p.setup = function() {
        const container = document.getElementById('simulation-canvas');
        canvasWidth = container.clientWidth;
        canvasHeight = container.clientHeight;
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent('simulation-canvas');
        p.pixelDensity(1);
        
        initializeStarSystem();
        setupControls();
        initSketch(this);
        
        soundManager.startAmbientLoop('astronomy', 'star');
    };
    
    p.draw = function() {
        // Deep space background
        drawCosmicBackground();
        drawDistantStars();
        
        p.background('#050507');
        
        // Update physics
        if (autoPlay) {
            stageProgress += 0.0015 * speed;
            if (stageProgress >= 1) {
                stageProgress = 0;
                stage = (stage + 1) % 6;
                soundManager.playCosmicHum(80 + stage * 50, 2);
            }
        }
        
        updateStellarEvolution();
        updateParticles();
        updateFusion();
        updateStellarWind();
        updateMagneticField();
        
        // Rendering (back to front)
        drawNebula();
        drawAccretionDisk();
        
        if (stage >= 2 && stage < 4) {
            drawFusionCore();
            drawRadiativeZone();
            drawConvectiveZone();
        }
        
        drawStar();
        drawCorona();
        drawStellarWind();
        drawLightEmission();
        
        if (stage >= 4) {
            drawSupernovaExplosion();
            drawExplosionRemnant();
        }
        
        if (stage === 5) {
            drawNeutronStar();
            drawPulsarBeam();
        }
        
        if (showFusionCore && stage >= 2) {
            drawFusionVisualization();
        }
        
        if (showParticles) {
            drawFusionParticles();
        }
        
        // Info
        drawStellarInfo();
        
        time += 0.016;
    };
    
    function initializeStarSystem() {
        // Distant background stars
        distantStars = [];
        for (let i = 0; i < 100; i++) {
            distantStars.push({
                x: p.random(canvasWidth),
                y: p.random(canvasHeight),
                size: p.random(0.5, 2),
                brightness: p.random(0.1, 0.5),
                twinklePeriod: p.random(2, 8),
                twinkePhase: p.random(p.TWO_PI)
            });
        }
        
        // Nebula clouds
        nebulaClouds = [];
        for (let i = 0; i < 30; i++) {
            nebulaClouds.push({
                x: star.x + p.random(-200, 200),
                y: star.y + p.random(-200, 200),
                size: p.random(40, 120),
                opacity: p.random(0.1, 0.3),
                color: p.random([
                    'rgba(100, 50, 200, ',
                    'rgba(200, 100, 50, ',
                    'rgba(100, 150, 200, '
                ]),
                vx: p.random(-0.5, 0.5),
                vy: p.random(-0.5, 0.5)
            });
        }
        
        // Accretion disk
        accretionDisk = [];
        for (let i = 0; i < 100; i++) {
            const angle = p.random(p.TWO_PI);
            const radius = p.random(60, 150);
            
            accretionDisk.push({
                angle: angle,
                radius: radius,
                x: star.x + Math.cos(angle) * radius,
                y: star.y + Math.sin(angle) * radius,
                vx: -Math.sin(angle) * 1.5,
                vy: Math.cos(angle) * 1.5,
                brightness: p.random(0.3, 0.8),
                temperature: p.map(radius, 60, 150, 3000, 1000)
            });
        }
        
        // Fusion particles
        fusionParticles = [];
        for (let i = 0; i < 50; i++) {
            fusionParticles.push({
                x: star.x + p.random(-10, 10),
                y: star.y + p.random(-10, 10),
                vx: p.random(-2, 2),
                vy: p.random(-2, 2),
                age: 0,
                brightness: p.random(0.5, 1),
                type: p.random(['photon', 'neutrino', 'energy']),
                size: p.random(1, 3)
            });
        }
        
        // Stellar wind
        stellarWind = [];
        
        // Magnetic field lines
        magneticField = [];
        for (let i = 0; i < 16; i++) {
            magneticField.push({
                angle: (i / 16) * p.TWO_PI,
                points: []
            });
        }
        
        // Light curve tracking
        lightCurve = [];
        
        // Coronal mass
        coronalMass = [];
    }
    
    function updateStellarEvolution() {
        const transition = stage + stageProgress;
        
        switch(stage) {
            case 0: // Nebula
                star.radius = p.lerp(star.radius, 80, 0.02);
                star.temperature = p.lerp(star.temperature, 1000, 0.02);
                star.luminosity = p.map(stageProgress, 0, 1, 0.01, 0.1);
                star.density = p.map(stageProgress, 0, 1, 100, 500);
                
                // Cloud contraction
                nebulaClouds.forEach(cloud => {
                    const dx = star.x - cloud.x;
                    const dy = star.y - cloud.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    cloud.x += (dx / dist) * 0.3;
                    cloud.y += (dy / dist) * 0.3;
                    cloud.size *= 0.98;
                });
                
                break;
                
            case 1: // Protostar
                star.radius = p.lerp(star.radius, 50, 0.02);
                star.temperature = p.lerp(star.temperature, 2000, 0.02);
                star.luminosity = p.map(stageProgress, 0, 1, 0.1, 0.5);
                star.density = p.map(stageProgress, 0, 1, 500, 1000);
                star.rotationSpeed = p.lerp(star.rotationSpeed, 1.2, 0.02);
                
                // Jets from poles
                if (p.random() < 0.3 * stageProgress) {
                    stellarWind.push({
                        x: star.x,
                        y: star.y - star.radius,
                        vx: p.random(-2, 2),
                        vy: -p.random(2, 4),
                        age: 0,
                        brightness: p.random(0.6, 0.9)
                    });
                    stellarWind.push({
                        x: star.x,
                        y: star.y + star.radius,
                        vx: p.random(-2, 2),
                        vy: p.random(2, 4),
                        age: 0,
                        brightness: p.random(0.6, 0.9)
                    });
                }
                
                break;
                
            case 2: // Main Sequence (stable)
                star.radius = p.lerp(star.radius, 25, 0.02);
                star.temperature = p.lerp(star.temperature, 5800, 0.02);
                star.luminosity = p.lerp(star.luminosity, 1, 0.02);
                star.density = p.map(stage, 2, 2, 1.4e3, 1.4e3);
                star.fuelBurned += 0.005 * speed;
                star.rotationSpeed = 0.8;
                
                // Steady fusion
                if (p.random() < 0.5) {
                    fusionParticles.push({
                        x: star.x + p.random(-15, 15),
                        y: star.y + p.random(-15, 15),
                        vx: p.random(-1, 1),
                        vy: p.random(-1, 1),
                        age: 0,
                        brightness: 0.8,
                        type: p.random(['photon', 'neutrino']),
                        size: p.random(0.5, 2)
                    });
                }
                
                break;
                
            case 3: // Red Giant
                star.radius = p.lerp(star.radius, 100, 0.02);
                star.temperature = p.lerp(star.temperature, 3500, 0.02);
                star.luminosity = p.map(stageProgress, 0, 1, 1, 100);
                star.density = p.map(stageProgress, 0, 1, 1e3, 100);
                
                // Mass loss via stellar wind
                if (p.random() < 0.3) {
                    stellarWind.push({
                        x: star.x + p.random(-star.radius, star.radius),
                        y: star.y + p.random(-star.radius, star.radius),
                        vx: p.random(-3, 3),
                        vy: p.random(-3, 3),
                        age: 0,
                        brightness: p.random(0.4, 0.7)
                    });
                }
                
                break;
                
            case 4: // Supernova
                star.explosionForce = p.map(stageProgress, 0, 1, 0, 10);
                
                // Create explosion ejecta
                if (stageProgress < 0.3) {
                    for (let i = 0; i < 10; i++) {
                        const angle = p.random(p.TWO_PI);
                        const speed = p.random(5, 15);
                        
                        supernova_Ejecta.push({
                            x: star.x,
                            y: star.y,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            age: 0,
                            brightness: p.random(0.6, 1),
                            size: p.random(2, 8),
                            color: p.random([
                                'rgba(255, 200, 100, ',
                                'rgba(255, 100, 50, ',
                                'rgba(200, 100, 255, '
                            ])
                        });
                    }
                }
                
                star.radius = p.lerp(star.radius, 5, 0.05);
                star.temperature = 10000;
                star.luminosity = p.map(stageProgress, 0, 1, 100, 10);
                
                break;
                
            case 5: // Neutron Star
                star.radius = p.lerp(star.radius, 5, 0.02);
                star.temperature = p.lerp(star.temperature, 1e6, 0.02);
                star.density = 5.9e17; // Nuclear density
                star.rotationSpeed = p.map(stageProgress, 0, 1, 0.5, 20);
                
                // Neutron star crust
                if (neutronStarCrust.length === 0) {
                    for (let i = 0; i < 40; i++) {
                        const angle = p.random(p.TWO_PI);
                        neutronStarCrust.push({
                            angle: angle,
                            radius: 5 + p.random(0, 2),
                            brightness: p.random(0.5, 1)
                        });
                    }
                }
                
                break;
        }
    }
    
    function updateParticles() {
        // Update fusion particles
        fusionParticles = fusionParticles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.age++;
            particle.brightness *= 0.98;
            
            return particle.age < 100 && particle.brightness > 0.01;
        });
        
        // Update stellar wind
        stellarWind = stellarWind.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.age++;
            
            const dist = Math.sqrt(
                (particle.x - star.x) * (particle.x - star.x) +
                (particle.y - star.y) * (particle.y - star.y)
            );
            
            return particle.age < 150 && dist < 400;
        });
        
        // Update supernova ejecta
        supernova_Ejecta = supernova_Ejecta.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.age++;
            particle.brightness = p.map(particle.age, 0, 200, 1, 0);
            
            return particle.age < 200 && particle.brightness > 0.01;
        });
        
        // Update accretion disk
        accretionDisk.forEach(particle => {
            particle.angle += 0.01 * (1 - stage / 6);
            particle.x = star.x + Math.cos(particle.angle) * particle.radius;
            particle.y = star.y + Math.sin(particle.angle) * particle.radius;
        });
    }
    
    function updateFusion() {
        if (stage >= 2 && stage < 4) {
            star.fuelBurned += 0.001 * speed;
        }
    }
    
    function updateStellarWind() {
        // Wind pressure increases with luminosity
        if (stage === 3) {
            if (p.random() < star.luminosity * 0.05) {
                stellarWind.push({
                    x: star.x + p.random(-star.radius, star.radius),
                    y: star.y + p.random(-star.radius, star.radius),
                    vx: p.random(-2, 2) * star.luminosity,
                    vy: p.random(-2, 2) * star.luminosity,
                    age: 0,
                    brightness: p.random(0.3, 0.6)
                });
            }
        }
    }
    
    function updateMagneticField() {
        magneticField.forEach(field => {
            field.points = [];
            for (let r = 0; r < 200; r += 20) {
                const x = star.x + Math.cos(field.angle) * r;
                const y = star.y + Math.sin(field.angle) * r;
                
                field.points.push({ x: x, y: y });
            }
        });
    }
    
    function drawCosmicBackground() {
        const grad = p.drawingContext.createRadialGradient(
            canvasWidth / 2, canvasHeight / 2, 0,
            canvasWidth / 2, canvasHeight / 2, 600
        );
        grad.addColorStop(0, 'rgba(40, 20, 60, 1)');
        grad.addColorStop(1, 'rgba(10, 5, 20, 1)');
        
        p.drawingContext.fillStyle = grad;
        p.drawingContext.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    function drawDistantStars() {
        p.push();
        
        distantStars.forEach(star => {
            star.twinkePhase += 0.02;
            const twinkle = Math.sin(star.twinkePhase) * 0.5 + 0.5;
            
            p.fill('rgba(255, 255, 200, ' + (star.brightness * twinkle) + ')');
            p.noStroke();
            p.ellipse(star.x, star.y, star.size);
        });
        
        p.pop();
    }
    
    function drawNebula() {
        if (stage > 1) return;
        
        p.push();
        
        nebulaClouds.forEach(cloud => {
            const grad = p.drawingContext.createRadialGradient(
                cloud.x, cloud.y, 0,
                cloud.x, cloud.y, cloud.size
            );
            grad.addColorStop(0, cloud.color + cloud.opacity + ')');
            grad.addColorStop(1, cloud.color + '0)');
            
            p.drawingContext.fillStyle = grad;
            p.drawingContext.beginPath();
            p.drawingContext.arc(cloud.x, cloud.y, cloud.size, 0, p.TWO_PI);
            p.drawingContext.fill();
        });
        
        p.pop();
    }
    
    function drawAccretionDisk() {
        if (stage > 2) return;
        
        p.push();
        
        accretionDisk.forEach(particle => {
            const colorIntensity = Math.floor(p.map(particle.temperature, 1000, 3000, 100, 255));
            
            const diskGlow = p.drawingContext.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, 4
            );
            diskGlow.addColorStop(0, 'rgba(' + colorIntensity + ', 100, 50, ' + (particle.brightness * 0.3) + ')');
            diskGlow.addColorStop(1, 'rgba(' + colorIntensity + ', 100, 50, 0)');
            
            p.drawingContext.fillStyle = diskGlow;
            p.drawingContext.beginPath();
            p.drawingContext.arc(particle.x, particle.y, 4, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            p.fill('rgba(' + colorIntensity + ', 80, 30, ' + particle.brightness + ')');
            p.noStroke();
            p.ellipse(particle.x, particle.y, 2);
        });
        
        p.pop();
    }
    
    function drawFusionCore() {
        p.push();
        
        const coreRadius = star.radius * 0.4;
        
        // Core glow
        const coreGlow = p.drawingContext.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, coreRadius * 1.5
        );
        coreGlow.addColorStop(0, 'rgba(255, 200, 100, 0.4)');
        coreGlow.addColorStop(1, 'rgba(255, 200, 100, 0)');
        
        p.drawingContext.fillStyle = coreGlow;
        p.drawingContext.beginPath();
        p.drawingContext.arc(star.x, star.y, coreRadius * 1.5, 0, p.TWO_PI);
        p.drawingContext.fill();
        
        // Core itself
        p.fill('rgba(255, 150, 50, 0.8)');
        p.stroke('rgba(255, 100, 0, 0.8)');
        p.strokeWeight(2);
        p.ellipse(star.x, star.y, coreRadius * 2);
        
        p.pop();
    }
    
    function drawRadiativeZone() {
        p.push();
        p.stroke('rgba(255, 200, 100, 0.2)');
        p.strokeWeight(1);
        p.noFill();
        
        for (let i = 0; i < 3; i++) {
            p.ellipse(star.x, star.y, (star.radius * 0.5 + i * 5) * 2);
        }
        
        p.pop();
    }
    
    function drawConvectiveZone() {
        p.push();
        
        // Draw convection cells
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * p.TWO_PI;
            const cellX = star.x + Math.cos(angle) * (star.radius * 0.6);
            const cellY = star.y + Math.sin(angle) * (star.radius * 0.6);
            
            p.stroke('rgba(255, 150, 50, 0.15)');
            p.strokeWeight(1);
            p.noFill();
            p.ellipse(cellX, cellY, 15);
        }
        
        p.pop();
    }
    
    function drawStar() {
        p.push();
        
        // Star glow
        const starGlowColor = getStarColor();
        const glowGrad = p.drawingContext.createRadialGradient(
            star.x, star.y, star.radius * 0.5,
            star.x, star.y, star.radius * 3
        );
        glowGrad.addColorStop(0, starGlowColor + '0.4)');
        glowGrad.addColorStop(1, starGlowColor + '0)');
        
        p.drawingContext.fillStyle = glowGrad;
        p.drawingContext.beginPath();
        p.drawingContext.arc(star.x, star.y, star.radius * 3, 0, p.TWO_PI);
        p.drawingContext.fill();
        
        // Star surface
        p.fill(starGlowColor + '0.95)');
        p.stroke(starGlowColor + '1)');
        p.strokeWeight(2);
        p.ellipse(star.x, star.y, star.radius * 2);
        
        // Star rotation spots (sunspots)
        for (let i = 0; i < 3; i++) {
            const spotAngle = time * star.rotationSpeed * 0.01 + (i / 3) * p.TWO_PI;
            const spotX = star.x + Math.cos(spotAngle) * (star.radius * 0.6);
            const spotY = star.y + Math.sin(spotAngle) * (star.radius * 0.6);
            
            p.fill(starGlowColor + '0.3)');
            p.noStroke();
            p.ellipse(spotX, spotY, 4);
        }
        
        p.pop();
    }
    
    function drawCorona() {
        if (stage < 2 || stage > 3) return;
        
        p.push();
        
        // Corona streamers
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * p.TWO_PI;
            
            p.stroke('rgba(200, 200, 255, 0.3)');
            p.strokeWeight(1);
            p.noFill();
            
            p.beginShape();
            for (let r = star.radius; r < star.radius * 2.5; r += 10) {
                const streamerWiggle = Math.sin(angle * 3 + time * 0.02) * 5;
                const x = star.x + Math.cos(angle) * (r + streamerWiggle);
                const y = star.y + Math.sin(angle) * (r + streamerWiggle);
                p.vertex(x, y);
            }
            p.endShape();
        }
        
        p.pop();
    }
    
    function drawStellarWind() {
        p.push();
        
        stellarWind.forEach(particle => {
            const windGlow = p.drawingContext.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, 5
            );
            windGlow.addColorStop(0, 'rgba(255, 200, 100, ' + (particle.brightness * 0.3) + ')');
            windGlow.addColorStop(1, 'rgba(255, 200, 100, 0)');
            
            p.drawingContext.fillStyle = windGlow;
            p.drawingContext.beginPath();
            p.drawingContext.arc(particle.x, particle.y, 5, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            p.fill('rgba(255, 150, 50, ' + particle.brightness + ')');
            p.noStroke();
            p.ellipse(particle.x, particle.y, 2);
        });
        
        p.pop();
    }
    
    function drawLightEmission() {
        // Brightness halo based on luminosity
        p.push();
        p.noFill();
        p.stroke('rgba(255, 255, 200, ' + (star.luminosity * 0.1) + ')');
        p.strokeWeight(p.map(star.luminosity, 0.01, 100, 1, 10));
        p.ellipse(star.x, star.y, star.radius * 4 + star.luminosity * 20);
        p.pop();
    }
    
    function drawSupernovaExplosion() {
        if (stage !== 4) return;
        
        p.push();
        
        // Explosion sphere
        const explosionRadius = star.explosionForce * 50;
        p.stroke('rgba(255, 100, 50, ' + (1 - stageProgress) + ')');
        p.strokeWeight(3);
        p.noFill();
        p.ellipse(star.x, star.y, explosionRadius * 2);
        
        // Explosion glow
        const explosionGlow = p.drawingContext.createRadialGradient(
            star.x, star.y, star.explosionForce * 30,
            star.x, star.y, star.explosionForce * 100
        );
        explosionGlow.addColorStop(0, 'rgba(255, 100, 50, ' + ((1 - stageProgress) * 0.3) + ')');
        explosionGlow.addColorStop(1, 'rgba(255, 100, 50, 0)');
        
        p.drawingContext.fillStyle = explosionGlow;
        p.drawingContext.beginPath();
        p.drawingContext.arc(star.x, star.y, star.explosionForce * 100, 0, p.TWO_PI);
        p.drawingContext.fill();
        
        p.pop();
    }
    
    function drawExplosionRemnant() {
        if (stage < 4) return;
        
        p.push();
        
        // Nebular remnant
        const remnantSize = 50 + stageProgress * 100;
        const remnantGrad = p.drawingContext.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, remnantSize
        );
        remnantGrad.addColorStop(0, 'rgba(255, 150, 100, 0.2)');
        remnantGrad.addColorStop(1, 'rgba(255, 150, 100, 0)');
        
        p.drawingContext.fillStyle = remnantGrad;
        p.drawingContext.beginPath();
        p.drawingContext.arc(star.x, star.y, remnantSize, 0, p.TWO_PI);
        p.drawingContext.fill();
        
        p.pop();
    }
    
    function drawNeutronStar() {
        if (stage !== 5) return;
        
        p.push();
        
        // Neutron star surface
        p.fill('rgba(200, 200, 220, 0.9)');
        p.stroke('rgba(150, 150, 200, 0.9)');
        p.strokeWeight(1);
        p.ellipse(star.x, star.y, star.radius * 2);
        
        // Crust details
        neutronStarCrust.forEach(crust => {
            const px = star.x + Math.cos(crust.angle) * crust.radius;
            const py = star.y + Math.sin(crust.angle) * crust.radius;
            
            p.fill('rgba(100, 100, 150, ' + crust.brightness + ')');
            p.noStroke();
            p.ellipse(px, py, 1);
        });
        
        // Magnetic field lines
        p.stroke('rgba(100, 200, 255, 0.3)');
        p.strokeWeight(1);
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * p.TWO_PI;
            p.line(
                star.x, star.y,
                star.x + Math.cos(angle) * 150, 
                star.y + Math.sin(angle) * 150
            );
        }
        
        p.pop();
    }
    
    function drawPulsarBeam() {
        if (stage !== 5) return;
        
        p.push();
        
        const beamAngle = time * star.rotationSpeed * 0.1;
        const beamLength = 200;
        
        // Pulsar light cone
        const beamGrad = p.drawingContext.createLinearGradient(
            star.x, star.y,
            star.x + Math.cos(beamAngle) * beamLength,
            star.y + Math.sin(beamAngle) * beamLength
        );
        beamGrad.addColorStop(0, 'rgba(0, 217, 255, 0.8)');
        beamGrad.addColorStop(1, 'rgba(0, 217, 255, 0)');
        
        p.drawingContext.fillStyle = beamGrad;
        p.drawingContext.beginPath();
        p.drawingContext.moveTo(star.x, star.y);
        p.drawingContext.lineTo(
            star.x + Math.cos(beamAngle - 0.3) * beamLength,
            star.y + Math.sin(beamAngle - 0.3) * beamLength
        );
        p.drawingContext.lineTo(
            star.x + Math.cos(beamAngle + 0.3) * beamLength,
            star.y + Math.sin(beamAngle + 0.3) * beamLength
        );
        p.drawingContext.closePath();
        p.drawingContext.fill();
        
        p.pop();
    }
    
    function drawFusionVisualization() {
        if (!showFusionCore) return;
        
        p.push();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(10);
        p.textFont('Space Grotesk');
        p.fill('rgba(255, 150, 50, 0.7)');
        p.text('H → He', star.x, star.y);
        p.pop();
    }
    
    function drawFusionParticles() {
        if (!showParticles) return;
        
        p.push();
        
        fusionParticles.forEach(particle => {
            const partGlow = p.drawingContext.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size * 2
            );
            partGlow.addColorStop(0, 'rgba(255, 200, 100, ' + (particle.brightness * 0.4) + ')');
            partGlow.addColorStop(1, 'rgba(255, 200, 100, 0)');
            
            p.drawingContext.fillStyle = partGlow;
            p.drawingContext.beginPath();
            p.drawingContext.arc(particle.x, particle.y, particle.size * 2, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            p.fill('rgba(255, 180, 50, ' + particle.brightness + ')');
            p.noStroke();
            p.ellipse(particle.x, particle.y, particle.size);
        });
        
        p.pop();
    }
    
    function drawStellarInfo() {
        p.push();
        p.fill('rgba(245, 245, 247, 0.95)');
        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        p.textFont('Syne');
        p.textSize(18);
        p.text('Star Lifecycle', 20, 15);
        
        p.textFont('Space Grotesk');
        p.textSize(12);
        p.fill('rgba(160, 160, 168, 0.95)');
        
        const stages = ['Nebula', 'Protostar', 'Main Sequence', 'Red Giant', 'Supernova', 'Neutron Star'];
        p.text('Stage: ' + stages[stage] + ' (' + (stageProgress * 100).toFixed(0) + '%)', 20, 40);
        p.text('Radius: ' + star.radius.toFixed(1) + ' R☉ | Temperature: ' + Math.round(star.temperature) + ' K', 20, 58);
        p.text('Luminosity: ' + star.luminosity.toFixed(2) + ' L☉ | Fuel Burned: ' + (star.fuelBurned * 100).toFixed(0) + '%', 20, 76);
        
        if (stage >= 2 && stage < 4) {
            p.text('Rotation: ' + (star.rotationSpeed * 10).toFixed(1) + ' day⁻¹ | Fusion: Active', 20, 94);
        } else if (stage === 5) {
            p.text('Pulsar Period: ' + (1 / (star.rotationSpeed * 0.1)).toFixed(2) + ' ms | Magnetic Field: ' + ((1e12).toExponential(1)) + ' G', 20, 94);
        }
        
        p.textSize(10);
        p.fill('rgba(160, 160, 168, 0.5)');
        p.text('A star is born, burns for billions of years, then dies. Its fate depends on mass.', 20, canvasHeight - 25);
        
        p.pop();
    }
    
    function getStarColor() {
        if (star.temperature < 2000) {
            return 'rgba(255, 100, 50, '; // Red
        } else if (star.temperature < 3500) {
            return 'rgba(255, 150, 100, '; // Orange
        } else if (star.temperature < 5500) {
            return 'rgba(255, 200, 100, '; // Yellow
        } else if (star.temperature < 7500) {
            return 'rgba(255, 255, 200, '; // White
        } else {
            return 'rgba(200, 200, 255, '; // Blue
        }
    }
    
    function setupControls() {
        const controlsSection = document.getElementById('controls-section');
        controlsSection.innerHTML = '';
        
        let speedGroup = createControlGroup('Speed', 0.2, 3, speed, (val) => {
            speed = val;
        });
        controlsSection.appendChild(speedGroup);
        
        let playBtn = createButton(autoPlay ? '⏸ Pause' : '▶ Play', () => {
            autoPlay = !autoPlay;
            playBtn.textContent = autoPlay ? '⏸ Pause' : '▶ Play';
        });
        controlsSection.appendChild(playBtn);
        
        let coreBtn = createButton(showFusionCore ? '👁 Hide Core' : '👁 Show Core', () => {
            showFusionCore = !showFusionCore;
            coreBtn.textContent = showFusionCore ? '👁 Hide Core' : '👁 Show Core';
        });
        controlsSection.appendChild(coreBtn);
    }
    
    this.resetSketch = function() {
        initializeStarSystem();
        stage = 0;
        stageProgress = 0;
        time = 0;
        soundManager.playSuccess();
    };
};

new p5(starLifecycleSketch);