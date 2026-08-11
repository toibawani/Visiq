// ===== BLACK HOLE SIMULATION v3.0 =====
// Ultra-photorealistic spacetime warping with advanced rendering

let blackHoleSketch = function(p) {
    let canvasWidth = 800;
    let canvasHeight = 600;
    let particles = [];
    let photons = [];
    let accretionDiskParticles = [];
    let time = 0;
    let blackHoleMass = 2;
    let particleSpeed = 1;
    let showFieldLines = true;
    let showLensing = true;
    
    const G = 6.674e-11 / 1e30;
    const c = 300;
    const schwarzschildRadius = 40;
    const eventHorizonGlowRadius = schwarzschildRadius * 1.8;
    
    let backStarfield = [];
    let nebulaClouds = [];
    let accretionDiskLayers = [];
    let magneticFieldLines = [];
    let quantumFluctuations = [];
    let hawkingRadiation = [];
    
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
        
        soundManager.startAmbientLoop('physics', 'blackhole');
    };
    
    p.draw = function() {
        drawBackgroundStarfield();
        drawNebulaClouds();
        drawDarkMatterHalo();
        
        p.background('#050507');
        
        if (showFieldLines) {
            drawAdvancedSpacetimeGrid();
        }
        
        updateParticles();
        updatePhotons();
        updateAccretionDisk();
        updateQuantumEffects();
        
        drawAccretionDisk();
        drawParticles();
        
        if (showLensing) {
            drawGravitationalLensing();
        }
        
        drawEventHorizon();
        drawBlackHole();
        drawHawkingRadiation();
        drawMagneticFieldLines();
        
        drawAdvancedInfo();
        
        time += 0.016;
    };
    
    function initializeScene() {
        backStarfield = [];
        for (let i = 0; i < 800; i++) {
            backStarfield.push({
                x: p.random(canvasWidth * 2),
                y: p.random(canvasHeight * 2),
                size: p.random(0.3, 3),
                brightness: p.random(0.2, 1),
                color: p.random(['rgba(255, 255, 200, ', 'rgba(200, 220, 255, ', 'rgba(255, 180, 100, ', 'rgba(255, 100, 150, ']),
                twinkleSpeed: p.random(0.01, 0.05),
                twinkePhase: p.random(p.TWO_PI)
            });
        }
        
        nebulaClouds = [];
        for (let i = 0; i < 25; i++) {
            nebulaClouds.push({
                x: p.random(canvasWidth),
                y: p.random(canvasHeight),
                size: p.random(80, 250),
                opacity: p.random(0.05, 0.2),
                color: p.random([
                    'rgba(150, 100, 200, ',
                    'rgba(200, 150, 100, ',
                    'rgba(100, 180, 220, '
                ]),
                vx: p.random(-0.08, 0.08),
                vy: p.random(-0.08, 0.08),
                rotation: p.random(p.TWO_PI)
            });
        }
        
        accretionDiskParticles = [];
        const diskParticleCount = window.performanceSettings.getScaledDiskParticleCount(400);
        for (let i = 0; i < diskParticleCount; i++) {
            const angle = p.random(p.TWO_PI);
            const radius = p.random(schwarzschildRadius * 1.5, schwarzschildRadius * 4);
            const speed = Math.sqrt(G * blackHoleMass / radius);
            
            accretionDiskParticles.push({
                angle: angle,
                radius: radius,
                speed: speed,
                temperature: p.map(radius, schwarzschildRadius * 1.5, schwarzschildRadius * 4, 1, 0.2),
                brightness: p.random(0.4, 1),
                trailAngle: [],
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                magneticTurbulence: p.random(0, 0.5)
            });
        }
        
        particles = [];
        const particleCount = window.performanceSettings.getScaledParticleCount(150);
        for (let i = 0; i < particleCount; i++) {
            const angle = p.random(p.TWO_PI);
            const dist = p.random(150, 400);
            
            particles.push({
                x: canvasWidth / 2 + p.cos(angle) * dist,
                y: canvasHeight / 2 + p.sin(angle) * dist,
                vx: -p.sin(angle) * particleSpeed * 0.8,
                vy: p.cos(angle) * particleSpeed * 0.8,
                trail: [],
                trailBrightness: [],
                color: p.random([
                    { r: 0, g: 217, b: 255 },
                    { r: 100, g: 150, b: 255 },
                    { r: 150, g: 200, b: 255 }
                ]),
                mass: p.random(0.05, 0.2),
                sounded: false,
                glowIntensity: p.random(0.5, 1),
                age: 0
            });
        }
        
        photons = [];
        const photonCount = window.performanceSettings.getScaledParticleCount(60);
        for (let i = 0; i < photonCount; i++) {
            const angle = p.random(p.TWO_PI);
            const dist = p.random(250, 450);
            
            photons.push({
                x: canvasWidth / 2 + p.cos(angle) * dist,
                y: canvasHeight / 2 + p.sin(angle) * dist,
                vx: -p.sin(angle) * c * 0.4,
                vy: p.cos(angle) * c * 0.4,
                angle: angle,
                brightness: p.random(0.2, 0.8),
                trail: [],
                age: 0
            });
        }
        
        magneticFieldLines = [];
        for (let i = 0; i < 12; i++) {
            magneticFieldLines.push({
                angle: (i / 12) * p.TWO_PI,
                points: []
            });
        }
        
        quantumFluctuations = [];
        hawkingRadiation = [];
    }
    
    function drawBackgroundStarfield() {
        p.push();
        backStarfield.forEach(star => {
            star.twinkePhase += star.twinkleSpeed;
            const twinkle = Math.sin(star.twinkePhase) * 0.5 + 0.5;
            
            const glowSize = star.size * 2;
            p.fill(star.color + (star.brightness * twinkle * 0.3) + ')');
            p.noStroke();
            p.ellipse(star.x, star.y, glowSize);
            
            p.fill(star.color + (star.brightness * twinkle) + ')');
            p.ellipse(star.x, star.y, star.size);
        });
        p.pop();
    }
    
    function drawNebulaClouds() {
        p.push();
        nebulaClouds.forEach(cloud => {
            cloud.x += cloud.vx;
            cloud.y += cloud.vy;
            cloud.rotation += 0.0001;
            
            if (cloud.x > canvasWidth + 200) cloud.x = -200;
            if (cloud.y > canvasHeight + 200) cloud.y = -200;
            
            const gradient = p.drawingContext.createRadialGradient(
                cloud.x, cloud.y, 0,
                cloud.x, cloud.y, cloud.size
            );
            gradient.addColorStop(0, cloud.color + cloud.opacity + ')');
            gradient.addColorStop(0.5, cloud.color + (cloud.opacity * 0.3) + ')');
            gradient.addColorStop(1, cloud.color + '0)');
            
            p.drawingContext.fillStyle = gradient;
            p.drawingContext.beginPath();
            p.drawingContext.arc(cloud.x, cloud.y, cloud.size, 0, p.TWO_PI);
            p.drawingContext.fill();
        });
        p.pop();
    }
    
    function drawDarkMatterHalo() {
        p.push();
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        const haloGrad = p.drawingContext.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, 500
        );
        haloGrad.addColorStop(0, 'rgba(100, 100, 200, 0.02)');
        haloGrad.addColorStop(1, 'rgba(50, 50, 150, 0)');
        
        p.drawingContext.fillStyle = haloGrad;
        p.drawingContext.beginPath();
        p.drawingContext.arc(centerX, centerY, 500, 0, p.TWO_PI);
        p.drawingContext.fill();
        
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
                
                const warpFactor = p.map(distToCenter, 0, 500, 0.15, 1, true);
                const warpX = x + dx * (1 - warpFactor) * 0.5;
                const warpY = y + dy * (1 - warpFactor) * 0.5;
                
                p.point(warpX, warpY);
            }
        }
        
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
            
            if (dist > schwarzschildRadius + 10) {
                const force = (G * blackHoleMass) / (distSq + 150);
                particle.vx += (dx / dist) * force * 1.8;
                particle.vy += (dy / dist) * force * 1.8;
            } else if (dist < schwarzschildRadius) {
                if (!particle.sounded) {
                    soundManager.playResonance(80 + Math.random() * 40, 1.2);
                    particle.sounded = true;
                }
                
                particle.x = canvasWidth * 0.5 + p.random(-300, 300);
                particle.y = canvasHeight * 0.5 + p.random(-300, 300);
                particle.sounded = false;
                particle.age = 0;
            }
            
            particle.vx *= 0.97;
            particle.vy *= 0.97;
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.x < -100) particle.x = canvasWidth + 100;
            if (particle.x > canvasWidth + 100) particle.x = -100;
            if (particle.y < -100) particle.y = canvasHeight + 100;
            if (particle.y > canvasHeight + 100) particle.y = -100;
            
            particle.trail.push({ x: particle.x, y: particle.y });
            if (particle.trail.length > 40) {
                particle.trail.shift();
            }
            
            particle.glowIntensity += p.random(-0.03, 0.03);
            particle.glowIntensity = p.constrain(particle.glowIntensity, 0.3, 1);
            particle.age++;
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
            
            if (dist > schwarzschildRadius + 20) {
                const lensForce = (G * blackHoleMass * 2.5) / (distSq + 200);
                photon.vx += (dx / dist) * lensForce * 2.5;
                photon.vy += (dy / dist) * lensForce * 2.5;
            }
            
            photon.vx *= 0.98;
            photon.vy *= 0.98;
            
            photon.x += photon.vx * 0.8;
            photon.y += photon.vy * 0.8;
            
            photon.trail.push({ x: photon.x, y: photon.y });
            if (photon.trail.length > 15) photon.trail.shift();
            
            if (p.dist(photon.x, photon.y, centerX, centerY) > 500) {
                const angle = p.random(p.TWO_PI);
                const dist = p.random(280, 450);
                photon.x = centerX + p.cos(angle) * dist;
                photon.y = centerY + p.sin(angle) * dist;
                photon.trail = [];
            }
        });
    }
    
    function updateAccretionDisk() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        accretionDiskParticles.forEach(disk => {
            const speed = Math.sqrt(G * blackHoleMass / disk.radius);
            disk.angle += speed / disk.radius * 0.04;
            
            disk.radius *= 0.9995;
            disk.temperature = p.map(disk.radius, schwarzschildRadius * 1.5, schwarzschildRadius * 4, 1, 0.2);
            
            disk.x = centerX + Math.cos(disk.angle) * disk.radius;
            disk.y = centerY + Math.sin(disk.angle) * disk.radius * 0.3;
            
            if (disk.radius < schwarzschildRadius * 1.2) {
                disk.radius = p.random(schwarzschildRadius * 1.5, schwarzschildRadius * 4);
                disk.angle = p.random(p.TWO_PI);
                disk.x = centerX + Math.cos(disk.angle) * disk.radius;
                disk.y = centerY + Math.sin(disk.angle) * disk.radius * 0.3;
            }
        });
    }
    
    function updateQuantumEffects() {
        if (p.random() < 0.1) {
            const angle = p.random(p.TWO_PI);
            const radius = schwarzschildRadius * 1.5;
            
            quantumFluctuations.push({
                x: canvasWidth / 2 + Math.cos(angle) * radius,
                y: canvasHeight / 2 + Math.sin(angle) * radius,
                age: 0,
                brightness: p.random(0.5, 1)
            });
        }
        
        quantumFluctuations = quantumFluctuations.filter(q => {
            q.age++;
            return q.age < 50;
        });
        
        if (blackHoleMass > 0.5 && p.random() < 0.05) {
            const angle = p.random(p.TWO_PI);
            
            hawkingRadiation.push({
                x: canvasWidth / 2 + Math.cos(angle) * schwarzschildRadius,
                y: canvasHeight / 2 + Math.sin(angle) * schwarzschildRadius,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                age: 0,
                brightness: 0.8
            });
        }
        
        hawkingRadiation = hawkingRadiation.filter(h => {
            h.x += h.vx;
            h.y += h.vy;
            h.brightness *= 0.98;
            h.age++;
            return h.age < 100 && h.brightness > 0.01;
        });
    }
    
    function drawAccretionDisk() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        p.push();
        
        for (let layer = 0; layer < 10; layer++) {
            const layerRadius = schwarzschildRadius * (1.5 + layer * 0.25);
            const diskParticlesInLayer = accretionDiskParticles.filter(
                d => d.radius > layerRadius - 20 && d.radius < layerRadius + 20
            );
            
            diskParticlesInLayer.forEach(disk => {
                const colorValue = p.map(disk.temperature, 0, 1, 100, 255);
                
                const glowGrad = p.drawingContext.createRadialGradient(disk.x, disk.y, 0, disk.x, disk.y, 15);
                glowGrad.addColorStop(0, 'rgba(' + colorValue + ', ' + (colorValue * 0.8) + ', 100, 0.4)');
                glowGrad.addColorStop(1, 'rgba(' + colorValue + ', ' + (colorValue * 0.8) + ', 100, 0)');
                
                p.drawingContext.fillStyle = glowGrad;
                p.drawingContext.beginPath();
                p.drawingContext.arc(disk.x, disk.y, 15, 0, p.TWO_PI);
                p.drawingContext.fill();
                
                p.fill('rgba(' + colorValue + ', ' + (colorValue * 0.6) + ', 50, ' + disk.brightness + ')');
                p.noStroke();
                p.ellipse(disk.x, disk.y, 4);
            });
        }
        
        p.noFill();
        p.strokeWeight(2);
        for (let i = 0; i < 8; i++) {
            const radius = schwarzschildRadius * (1.5 + i * 0.35);
            const colorVal = 255 - i * 30;
            p.stroke('rgba(' + colorVal + ', ' + (colorVal * 0.6) + ', 100, ' + (0.3 - i * 0.03) + ')');
            p.ellipse(centerX, centerY, radius * 2, radius * 0.5);
        }
        
        p.pop();
    }
    
    function drawParticles() {
        particles.forEach(particle => {
            p.push();
            
            for (let i = 0; i < particle.trail.length; i++) {
                const t = i / particle.trail.length;
                const opacity = t * 0.4;
                p.stroke('rgba(' + particle.color.r + ', ' + particle.color.g + ', ' + particle.color.b + ', ' + opacity + ')');
                p.strokeWeight(1);
                
                if (i < particle.trail.length - 1) {
                    p.line(
                        particle.trail[i].x, particle.trail[i].y,
                        particle.trail[i + 1].x, particle.trail[i + 1].y
                    );
                }
            }
            
            const glowSize = 12;
            const glowGradient = p.drawingContext.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, glowSize
            );
            glowGradient.addColorStop(0, 'rgba(' + particle.color.r + ', ' + particle.color.g + ', ' + particle.color.b + ', ' + (0.3 * particle.glowIntensity) + ')');
            glowGradient.addColorStop(1, 'rgba(' + particle.color.r + ', ' + particle.color.g + ', ' + particle.color.b + ', 0)');
            
            p.drawingContext.fillStyle = glowGradient;
            p.drawingContext.beginPath();
            p.drawingContext.arc(particle.x, particle.y, glowSize, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            p.fill('rgba(' + particle.color.r + ', ' + particle.color.g + ', ' + particle.color.b + ', 0.9)');
            p.stroke('rgba(' + (particle.color.r + 100) + ', ' + (particle.color.g + 50) + ', ' + (particle.color.b + 100) + ', 0.7)');
            p.strokeWeight(1.5);
            p.ellipse(particle.x, particle.y, 6);
            
            p.pop();
        });
    }
    
    function drawGravitationalLensing() {
        p.push();
        
        photons.forEach(photon => {
            for (let i = 0; i < photon.trail.length; i++) {
                const t = i / photon.trail.length;
                const opacity = t * 0.2;
                p.stroke('rgba(255, 200, 100, ' + opacity + ')');
                p.strokeWeight(0.5);
                
                if (i < photon.trail.length - 1) {
                    p.line(
                        photon.trail[i].x, photon.trail[i].y,
                        photon.trail[i + 1].x, photon.trail[i + 1].y
                    );
                }
            }
            
            const glowGradient = p.drawingContext.createRadialGradient(
                photon.x, photon.y, 0,
                photon.x, photon.y, 10
            );
            glowGradient.addColorStop(0, 'rgba(255, 200, 100, ' + (0.4 * photon.brightness) + ')');
            glowGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
            
            p.drawingContext.fillStyle = glowGradient;
            p.drawingContext.beginPath();
            p.drawingContext.arc(photon.x, photon.y, 10, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            p.fill('rgba(255, 200, 100, ' + photon.brightness + ')');
            p.noStroke();
            p.ellipse(photon.x, photon.y, 4);
        });
        
        p.pop();
    }
    
    function drawEventHorizon() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        p.push();
        
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
        
        p.fill('rgba(0, 0, 0, 1)');
        p.noStroke();
        p.ellipse(centerX, centerY, schwarzschildRadius * 0.8);
        
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
    
    function drawHawkingRadiation() {
        p.push();
        
        hawkingRadiation.forEach(particle => {
            const glowGrad = p.drawingContext.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, 5
            );
            glowGrad.addColorStop(0, 'rgba(100, 200, 255, ' + (particle.brightness * 0.5) + ')');
            glowGrad.addColorStop(1, 'rgba(100, 200, 255, 0)');
            
            p.drawingContext.fillStyle = glowGrad;
            p.drawingContext.beginPath();
            p.drawingContext.arc(particle.x, particle.y, 5, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            p.fill('rgba(100, 200, 255, ' + particle.brightness + ')');
            p.noStroke();
            p.ellipse(particle.x, particle.y, 2);
        });
        
        p.pop();
    }
    
    function drawMagneticFieldLines() {
        p.push();
        p.stroke('rgba(0, 217, 255, 0.15)');
        p.strokeWeight(1);
        
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * p.TWO_PI;
            
            p.beginShape();
            for (let r = schwarzschildRadius; r < 400; r += 30) {
                const waveAmount = Math.sin(r * 0.02 + time * 0.02) * 10;
                const x = centerX + Math.cos(angle) * (r + waveAmount);
                const y = centerY + Math.sin(angle) * (r + waveAmount);
                p.vertex(x, y);
            }
            p.endShape();
        }
        
        p.pop();
    }
    
    function drawAdvancedInfo() {
        p.push();
        p.fill('rgba(245, 245, 247, 0.95)');
        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(16);
        p.textFont('Syne');
        p.text('Black Hole', 20, 20);
        
        p.textSize(12);
        p.textFont('Space Grotesk');
        p.fill('rgba(160, 160, 168, 0.95)');
        p.text('Mass (Solar): ' + (blackHoleMass * 5).toFixed(1) + 'M☉', 20, 45);
        p.text('Event Horizon: ' + schwarzschildRadius.toFixed(1) + ' px', 20, 63);
        p.text('Particles: ' + particles.length + ' | Disk: ' + accretionDiskParticles.length, 20, 81);
        p.text('Warp Strength: ' + (blackHoleMass * 50).toFixed(0) + '%', 20, 99);
        
        p.textSize(11);
        p.fill('rgba(100, 200, 255, 0.7)');
        p.text('🔵 Orbiting matter  🔴 Event horizon  🟠 Accretion disk  💙 Hawking radiation', 20, canvasHeight - 45);
        
        p.textSize(10);
        p.fill('rgba(160, 160, 168, 0.5)');
        p.text('Spacetime curves. Matter spirals. Light bends. Quantum effects at the edge of physics.', 20, canvasHeight - 25);
        
        p.pop();
    }
    
    function setupControls() {
        const controlsSection = document.getElementById('controls-section');
        controlsSection.innerHTML = '';
        
        let massGroup = createControlGroup('Black Hole Mass', 0.5, 10, blackHoleMass, (val) => {
            blackHoleMass = val;
        });
        controlsSection.appendChild(massGroup);
        
        let speedGroup = createControlGroup('Particle Speed', 0.2, 3, particleSpeed, (val) => {
            particleSpeed = val;
        });
        controlsSection.appendChild(speedGroup);
        
        let gridBtn = createButton('🌐 Toggle Grid', () => {
            showFieldLines = !showFieldLines;
            soundManager.playChime(800, 0.15);
        });
        controlsSection.appendChild(gridBtn);
        
        let lensBtn = createButton('🔍 Toggle Lensing', () => {
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