// ===== HURRICANE FORMATION SIMULATION v1.0 =====
// Photorealistic tropical cyclone dynamics

let hurricaneSketch = function(p) {
    let canvasWidth = 800;
    let canvasHeight = 600;
    
    let time = 0;
    let formationStage = 0;
    let stageProgress = 0;
    let autoPlay = true;
    let speed = 1;
    
    let oceanTemperature = 28;
    let windShear = 0.3;
    let coriolisLatitude = 15;
    let relativeHumidity = 0.75;
    
    let vortexCenter = { x: 0, y: 0 };
    let vortexStrength = 0;
    let eyeRadius = 0;
    let stormRadius = 0;
    let minimumPressure = 1013;
    
    let rainBands = [];
    let cloudParticles = [];
    let windField = [];
    let convectiveUpdrafts = [];
    let eyewallVortices = [];
    let oceanSurfaceWaves = [];
    
    p.setup = function() {
        const container = document.getElementById('simulation-canvas');
        canvasWidth = container.clientWidth;
        canvasHeight = container.clientHeight;
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent('simulation-canvas');
        p.pixelDensity(1);
        
        initializeStorm();
        setupControls();
        initSketch(this);
        
        soundManager.startAmbientLoop('geography', 'hurricane');
    };
    
    p.draw = function() {
        drawAtmosphericBackground();
        drawOceanSurface();
        
        p.background('#050507');
        
        if (autoPlay) {
            stageProgress += 0.003 * speed;
            if (stageProgress >= 1) {
                stageProgress = 0;
                formationStage = (formationStage + 1) % 6;
                soundManager.playFluidWhoosh(300 + formationStage * 50, 200, 0.4);
            }
        }
        
        updateHurricanePhysics();
        updateRainBands();
        updateCloudDynamics();
        updateWindField();
        updateConvection();
        updateEyeStructure();
        
        drawPressureField();
        drawOceanWarmthMap();
        drawRainfallRate();
        drawOuterRainBands();
        drawRainBandSpirals();
        drawMiddleCloudBands();
        drawEyewall();
        drawClearEye();
        drawConvectiveCloudTops();
        drawLightningFlashes();
        
        drawWindBarbs();
        drawPressureContours();
        drawVelocityVectors();
        
        drawHurricaneInfo();
        
        time += 0.016;
    };
    
    function initializeStorm() {
        vortexCenter = { x: canvasWidth / 2, y: canvasHeight / 2 };
        
        rainBands = [];
        for (let band = 0; band < 5; band++) {
            rainBands.push({
                radius: 80 + band * 60,
                spiralTightness: 0.05 + band * 0.02,
                particles: [],
                intensity: 1 - band * 0.15,
                rainRate: 0
            });
        }
        
        cloudParticles = [];
        const cloudParticleCount = window.performanceSettings.getScaledParticleCount(400);
        for (let i = 0; i < cloudParticleCount; i++) {
            const angle = p.random(p.TWO_PI);
            const radius = p.random(20, 300);
            
            cloudParticles.push({
                angle: angle,
                radius: radius,
                radiusVel: 0,
                angularVel: 0,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                size: p.random(2, 8),
                opacity: p.random(0.3, 0.9),
                elevation: p.random(1000, 15000),
                temperature: 0,
                brightness: 0
            });
        }
        
        windField = [];
        const spacing = 40;
        for (let x = vortexCenter.x - 200; x < vortexCenter.x + 200; x += spacing) {
            for (let y = vortexCenter.y - 200; y < vortexCenter.y + 200; y += spacing) {
                windField.push({
                    x: x,
                    y: y,
                    u: 0,
                    v: 0,
                    speed: 0,
                    direction: 0
                });
            }
        }
        
        convectiveUpdrafts = [];
        const updraftCount = window.performanceSettings.getScaledParticleCount(30);
        for (let i = 0; i < updraftCount; i++) {
            const angle = p.random(p.TWO_PI);
            const radius = p.random(30, 150);
            
            convectiveUpdrafts.push({
                x: vortexCenter.x + p.cos(angle) * radius,
                y: vortexCenter.y + p.sin(angle) * radius,
                strength: 0,
                phase: p.random(p.TWO_PI),
                cloudTopHeight: 0,
                iceParticles: []
            });
        }
        
        eyewallVortices = [];
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * p.TWO_PI;
            eyewallVortices.push({
                angle: angle,
                strength: 0,
                wobblePhase: 0
            });
        }
        
        oceanSurfaceWaves = [];
        for (let i = 0; i < 100; i++) {
            oceanSurfaceWaves.push({
                x: p.random(canvasWidth),
                y: canvasHeight - 50 + p.random(-20, 20),
                waveHeight: 0,
                phase: p.random(p.TWO_PI),
                wavelength: p.random(10, 30)
            });
        }
    }
    
    function updateHurricanePhysics() {
        const intensityFactor = oceanTemperature / 30;
        const shearFactor = 1 - windShear;
        const humidityFactor = relativeHumidity;
        
        const stageTransition = formationStage + stageProgress;
        
        vortexStrength = p.map(stageTransition, 0, 6, 0.1, 2);
        eyeRadius = p.map(stageTransition, 0, 6, 0, 25);
        stormRadius = p.map(stageTransition, 0, 6, 100, 250);
        minimumPressure = p.map(stageTransition, 0, 6, 1000, 880);
        
        vortexStrength *= intensityFactor * shearFactor;
        minimumPressure = 1013 - (1013 - minimumPressure) * intensityFactor * shearFactor * humidityFactor;
        
        const betaDrift = 2 + stageTransition * 0.5;
        vortexCenter.x += betaDrift * 0.5;
        if (vortexCenter.x > canvasWidth + 100) {
            vortexCenter.x = -100;
        }
    }
    
    function updateRainBands() {
        rainBands.forEach((band, bandIndex) => {
            band.intensity = p.map(formationStage + stageProgress, 0, 6, 0.3, 1 - bandIndex * 0.2);
            band.rainRate = band.intensity * 50 * p.random(0.8, 1.2);
            
            if (p.random() < band.intensity * 0.3) {
                const angle = p.random(p.TWO_PI);
                const radius = band.radius + p.random(-20, 20);
                
                band.particles.push({
                    angle: angle,
                    radius: radius,
                    x: vortexCenter.x + p.cos(angle) * radius,
                    y: vortexCenter.y + p.sin(angle) * radius,
                    vx: -p.sin(angle) * 2,
                    vy: p.cos(angle) * 2 + p.random(-0.5, 0.5),
                    age: 0,
                    brightness: p.random(0.4, 0.8)
                });
            }
            
            band.particles = band.particles.filter(drop => {
                drop.x += drop.vx;
                drop.y += drop.vy + 0.1;
                drop.vy *= 0.99;
                drop.age++;
                
                return drop.age < 100;
            });
        });
    }
    
    function updateCloudDynamics() {
        cloudParticles.forEach(cloud => {
            const distToCenter = p.dist(0, 0, cloud.x, cloud.y);
            
            const tangentialSpeed = vortexStrength * 150 / (distToCenter + 50);
            const inwardSpeed = (stormRadius - distToCenter) * 0.005;
            
            cloud.angularVel = tangentialSpeed / (cloud.radius + 10) * vortexStrength;
            cloud.angle += cloud.angularVel * 0.02;
            
            cloud.radius -= inwardSpeed * vortexStrength;
            cloud.radius = p.constrain(cloud.radius, 10, 300);
            
            cloud.x = vortexCenter.x + p.cos(cloud.angle) * cloud.radius;
            cloud.y = vortexCenter.y + p.sin(cloud.angle) * cloud.radius;
            
            cloud.elevation = p.map(cloud.radius, 0, 300, 15000, 2000);
            
            const referenceTemp = oceanTemperature - (cloud.elevation / 100) * 0.65;
            cloud.temperature = referenceTemp;
            
            cloud.brightness = p.map(cloud.elevation, 2000, 15000, 0.3, 1);
            
            if (cloud.radius < eyeRadius * 2) {
                cloud.opacity = p.lerp(cloud.opacity, 0.95, 0.02);
            } else {
                cloud.opacity = p.lerp(cloud.opacity, 0.5, 0.01);
            }
        });
    }
    
    function updateWindField() {
        windField.forEach(point => {
            const dx = point.x - vortexCenter.x;
            const dy = point.y - vortexCenter.y;
            const r = p.sqrt(dx * dx + dy * dy);
            
            if (r > 5) {
                const cyclostrophicWind = vortexStrength * 100 / (r + 20);
                
                const angle = p.atan2(dy, dx);
                point.u = -p.sin(angle) * cyclostrophicWind * 0.9;
                point.v = p.cos(angle) * cyclostrophicWind * 0.9;
                
                point.u += (dx / r) * vortexStrength * 5;
                point.v += (dy / r) * vortexStrength * 5;
                
                const coriolisParam = 2 * 7.2921e-5 * Math.sin(coriolisLatitude * p.PI / 180);
                point.u += point.v * coriolisParam * 0.01;
                point.v -= point.u * coriolisParam * 0.01;
            } else {
                point.u = 0;
                point.v = 0;
            }
            
            point.speed = p.sqrt(point.u * point.u + point.v * point.v);
            point.direction = p.atan2(point.v, point.u);
        });
    }
    
    function updateConvection() {
        convectiveUpdrafts.forEach(updraft => {
            const distToCenter = p.dist(updraft.x, updraft.y, vortexCenter.x, vortexCenter.y);
            const heatFlux = (oceanTemperature / 30) * (1 - distToCenter / 300) * vortexStrength;
            
            updraft.strength = p.lerp(updraft.strength, heatFlux, 0.05);
            updraft.phase += 0.05;
            
            updraft.cloudTopHeight = 2000 + updraft.strength * 13000;
            
            if (updraft.strength > 0.2 && p.random() < updraft.strength * 0.5) {
                updraft.iceParticles.push({
                    x: updraft.x + p.random(-30, 30),
                    y: updraft.y - updraft.cloudTopHeight / 100,
                    vx: p.random(-2, 2),
                    vy: p.random(-3, -0.5),
                    age: 0,
                    size: p.random(1, 3)
                });
            }
            
            updraft.iceParticles = updraft.iceParticles.filter(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy - 0.05;
                particle.age++;
                return particle.age < 200;
            });
        });
    }
    
    function updateEyeStructure() {
        eyeRadius = p.map(formationStage + stageProgress, 2, 6, 5, 35);
        
        eyewallVortices.forEach(vortex => {
            vortex.strength = vortexStrength;
            vortex.wobblePhase += 0.02;
            vortex.angle += (vortexStrength * 50) / stormRadius;
        });
    }
    
    function drawAtmosphericBackground() {
        const grad = p.drawingContext.createLinearGradient(0, 0, 0, canvasHeight);
        grad.addColorStop(0, 'rgba(50, 80, 150, 0.3)');
        grad.addColorStop(0.3, 'rgba(100, 120, 180, 0.2)');
        grad.addColorStop(0.7, 'rgba(150, 140, 180, 0.1)');
        grad.addColorStop(1, 'rgba(200, 180, 150, 0.05)');
        
        p.drawingContext.fillStyle = grad;
        p.drawingContext.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    function drawOceanSurface() {
        p.push();
        p.stroke('rgba(0, 150, 200, 0.2)');
        p.strokeWeight(1);
        
        oceanSurfaceWaves.forEach(wave => {
            wave.phase += 0.02;
            const waveHeight = Math.sin(wave.phase) * (5 + vortexStrength * 15);
            p.line(
                wave.x, canvasHeight - 40 + waveHeight,
                wave.x + 10, canvasHeight - 40 + Math.sin(wave.phase + wave.wavelength * 0.1) * (5 + vortexStrength * 15)
            );
        });
        
        p.pop();
    }
    
    function drawPressureField() {
        p.push();
        
        for (let i = 0; i < 8; i++) {
            const radius = (i + 1) * 30;
            const pressure = minimumPressure + (i + 1) * (1013 - minimumPressure) / 8;
            const colorIntensity = p.map(i, 0, 8, 0.2, 0);
            
            p.stroke('rgba(100, 100, 150, ' + colorIntensity + ')');
            p.strokeWeight(0.5);
            p.noFill();
            p.ellipse(vortexCenter.x, vortexCenter.y, radius * 2);
        }
        
        p.pop();
    }
    
    function drawOceanWarmthMap() {
        p.push();
        
        const warmthGrad = p.drawingContext.createRadialGradient(
            vortexCenter.x, vortexCenter.y, 0,
            vortexCenter.x, vortexCenter.y, 400
        );
        warmthGrad.addColorStop(0, 'rgba(255, 100, 50, ' + (oceanTemperature / 35 * 0.15) + ')');
        warmthGrad.addColorStop(1, 'rgba(100, 50, 200, ' + (oceanTemperature / 35 * 0.05) + ')');
        
        p.drawingContext.fillStyle = warmthGrad;
        p.drawingContext.beginPath();
        p.drawingContext.arc(vortexCenter.x, vortexCenter.y, 400, 0, p.TWO_PI);
        p.drawingContext.fill();
        
        p.pop();
    }
    
    function drawRainfallRate() {
        p.push();
        
        rainBands.forEach((band, index) => {
            const rainColor = p.map(band.rainRate, 0, 100, 50, 255);
            p.stroke('rgba(100, 150, ' + rainColor + ', 0.1)');
            p.strokeWeight(3 + index);
            p.noFill();
            p.ellipse(vortexCenter.x, vortexCenter.y, band.radius * 2, band.radius * 2);
        });
        
        p.pop();
    }
    
    function drawOuterRainBands() {
        p.push();
        
        rainBands.forEach((band, bandIndex) => {
            if (bandIndex > 2) return;
            
            p.stroke('rgba(0, 200, 255, ' + (0.2 * band.intensity) + ')');
            p.strokeWeight(2 + band.intensity);
            p.noFill();
            
            p.beginShape();
            for (let angle = 0; angle < p.TWO_PI; angle += 0.05) {
                const spiralRadius = band.radius + Math.sin(angle * 3 + time * 0.02) * 15;
                const x = vortexCenter.x + Math.cos(angle) * spiralRadius;
                const y = vortexCenter.y + Math.sin(angle) * spiralRadius;
                p.vertex(x, y);
            }
            p.endShape(p.CLOSE);
        });
        
        p.pop();
    }
    
    function drawRainBandSpirals() {
        p.push();
        
        rainBands.forEach((band, bandIndex) => {
            if (bandIndex < 1) return;
            
            band.particles.forEach(drop => {
                const colorIntensity = p.map(drop.age, 0, 100, 0.8, 0);
                p.fill('rgba(100, 200, 255, ' + (colorIntensity * 0.6) + ')');
                p.noStroke();
                p.ellipse(drop.x, drop.y, 2);
            });
        });
        
        p.pop();
    }
    
    function drawMiddleCloudBands() {
        p.push();
        
        cloudParticles.forEach(cloud => {
            if (cloud.radius < eyeRadius * 3 || cloud.radius > 200) return;
            
            const glowGrad = p.drawingContext.createRadialGradient(
                cloud.x, cloud.y, 0,
                cloud.x, cloud.y, cloud.size * 3
            );
            glowGrad.addColorStop(0, 'rgba(200, 200, 255, ' + (cloud.opacity * cloud.brightness * 0.4) + ')');
            glowGrad.addColorStop(1, 'rgba(200, 200, 255, 0)');
            
            p.drawingContext.fillStyle = glowGrad;
            p.drawingContext.beginPath();
            p.drawingContext.arc(cloud.x, cloud.y, cloud.size * 3, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            p.fill('rgba(200, 220, 255, ' + (cloud.opacity * cloud.brightness) + ')');
            p.noStroke();
            p.ellipse(cloud.x, cloud.y, cloud.size);
        });
        
        p.pop();
    }
    
    function drawEyewall() {
        p.push();
        
        cloudParticles.forEach(cloud => {
            if (cloud.radius > eyeRadius * 2.5 || cloud.radius < eyeRadius * 0.8) return;
            
            const wallIntensity = p.map(cloud.radius, eyeRadius * 0.8, eyeRadius * 2.5, 1, 0.3);
            
            const eyewallGlow = p.drawingContext.createRadialGradient(
                cloud.x, cloud.y, 0,
                cloud.x, cloud.y, cloud.size * 4
            );
            eyewallGlow.addColorStop(0, 'rgba(255, 255, 200, ' + (wallIntensity * 0.6) + ')');
            eyewallGlow.addColorStop(1, 'rgba(255, 255, 200, 0)');
            
            p.drawingContext.fillStyle = eyewallGlow;
            p.drawingContext.beginPath();
            p.drawingContext.arc(cloud.x, cloud.y, cloud.size * 4, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            p.fill('rgba(250, 250, 220, ' + (cloud.opacity * wallIntensity) + ')');
            p.noStroke();
            p.ellipse(cloud.x, cloud.y, cloud.size * 1.3);
        });
        
        p.pop();
    }
    
    function drawClearEye() {
        if (eyeRadius < 5) return;
        
        p.push();
        
        const eyeGrad = p.drawingContext.createRadialGradient(
            vortexCenter.x, vortexCenter.y, 0,
            vortexCenter.x, vortexCenter.y, eyeRadius + 20
        );
        eyeGrad.addColorStop(0, 'rgba(50, 100, 150, 0.4)');
        eyeGrad.addColorStop(1, 'rgba(50, 100, 150, 0)');
        
        p.drawingContext.fillStyle = eyeGrad;
        p.drawingContext.beginPath();
        p.drawingContext.arc(vortexCenter.x, vortexCenter.y, eyeRadius + 20, 0, p.TWO_PI);
        p.drawingContext.fill();
        
        p.stroke('rgba(255, 200, 100, 0.5)');
        p.strokeWeight(2);
        p.noFill();
        p.ellipse(vortexCenter.x, vortexCenter.y, eyeRadius * 2);
        
        p.pop();
    }
    
    function drawConvectiveCloudTops() {
        p.push();
        
        convectiveUpdrafts.forEach(updraft => {
            if (updraft.strength < 0.1) return;
            
            updraft.iceParticles.forEach(particle => {
                const opacity = p.map(particle.age, 0, 200, 0.8, 0);
                p.fill('rgba(255, 255, 255, ' + opacity + ')');
                p.noStroke();
                p.ellipse(particle.x, particle.y, particle.size);
            });
            
            const columnHeight = updraft.cloudTopHeight / 100;
            const columnGrad = p.drawingContext.createLinearGradient(
                updraft.x, updraft.y,
                updraft.x, updraft.y - columnHeight
            );
            columnGrad.addColorStop(0, 'rgba(200, 200, 220, ' + (updraft.strength * 0.3) + ')');
            columnGrad.addColorStop(1, 'rgba(255, 255, 255, ' + (updraft.strength * 0.5) + ')');
            
            p.drawingContext.fillStyle = columnGrad;
            p.drawingContext.fillRect(updraft.x - 10, updraft.y - columnHeight, 20, columnHeight);
        });
        
        p.pop();
    }
    
    function drawLightningFlashes() {
        p.push();
        
        convectiveUpdrafts.forEach(updraft => {
            if (updraft.strength > 0.7 && p.random() < 0.01) {
                p.stroke('rgba(255, 255, 100, 0.8)');
                p.strokeWeight(2);
                
                let lightningX = updraft.x;
                let lightningY = updraft.y - updraft.cloudTopHeight / 100;
                
                for (let i = 0; i < 20; i++) {
                    const nextX = lightningX + p.random(-10, 10);
                    const nextY = lightningY + p.random(20, 40);
                    p.line(lightningX, lightningY, nextX, nextY);
                    lightningX = nextX;
                    lightningY = nextY;
                }
            }
        });
        
        p.pop();
    }
    
    function drawWindBarbs() {
        p.push();
        
        windField.forEach(point => {
            if (p.random() > 0.3) return;
            
            const windSpeed = point.speed * 2;
            if (windSpeed < 0.5) return;
            
            p.push();
            p.translate(point.x, point.y);
            p.rotate(point.direction);
            
            p.stroke('rgba(255, 100, 50, ' + (0.3 + Math.min(windSpeed / 50, 0.7)) + ')');
            p.strokeWeight(1.5);
            p.line(0, 0, windSpeed, 0);
            
            const barbCount = Math.floor(windSpeed / 5);
            for (let i = 0; i < barbCount; i++) {
                p.line(windSpeed, 0, windSpeed - 4, -3 - i * 3);
            }
            
            p.pop();
        });
        
        p.pop();
    }
    
    function drawPressureContours() {
        p.push();
        p.stroke('rgba(200, 100, 50, 0.2)');
        p.strokeWeight(0.5);
        p.textSize(9);
        p.textFont('Space Grotesk');
        p.fill('rgba(200, 100, 50, 0.4)');
        
        for (let i = 0; i < 5; i++) {
            const radius = (i + 1) * 50;
            const pressure = minimumPressure + (i + 1) * (1013 - minimumPressure) / 5;
            
            p.ellipse(vortexCenter.x, vortexCenter.y, radius * 2);
            p.text(pressure.toFixed(0) + 'mb', vortexCenter.x + radius + 5, vortexCenter.y);
        }
        
        p.pop();
    }
    
    function drawVelocityVectors() {
        p.push();
        
        p.stroke('rgba(100, 200, 255, 0.3)');
        p.strokeWeight(1);
        p.noFill();
        
        const velocityRadii = [50, 100, 150, 200];
        velocityRadii.forEach(radius => {
            const velocity = vortexStrength * 100 / (radius + 20);
            const displayRadius = radius + Math.sin(time * 0.01) * velocity * 2;
            
            p.ellipse(vortexCenter.x, vortexCenter.y, displayRadius * 2);
        });
        
        p.pop();
    }
    
    function drawHurricaneInfo() {
        p.push();
        p.fill('rgba(245, 245, 247, 0.95)');
        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        p.textFont('Syne');
        p.textSize(18);
        p.text('Hurricane Formation', 20, 15);
        
        p.textFont('Space Grotesk');
        p.textSize(12);
        p.fill('rgba(160, 160, 168, 0.95)');
        
        const stageNames = ['Tropical Wave', 'Tropical Depression', 'Tropical Storm', 'Cat 1 Hurricane', 'Cat 3 Hurricane', 'Major Hurricane'];
        const stageSpeeds = [39, 39, 63, 96, 130, 157];
        
        const currentStage = stageNames[formationStage];
        const maxSustainedWind = Math.round(stageSpeeds[formationStage] * (0.7 + stageProgress * 0.3));
        
        p.text('Stage: ' + currentStage, 20, 40);
        p.text('Max Sustained Wind: ' + maxSustainedWind + ' mph', 20, 58);
        p.text('Min Pressure: ' + minimumPressure.toFixed(0) + ' mb', 20, 76);
        p.text('Eye Diameter: ' + Math.round(eyeRadius * 2 * 0.6) + ' km', 20, 94);
        p.text('Ocean Temp: ' + oceanTemperature.toFixed(1) + 'C | Wind Shear: ' + (windShear * 100).toFixed(0) + '% | Humidity: ' + (relativeHumidity * 100).toFixed(0) + '%', 20, 112);
        
        p.textSize(10);
        p.fill('rgba(100, 200, 255, 0.7)');
        p.text('Stage Progress: ' + (stageProgress * 100).toFixed(0) + '%', 20, canvasHeight - 25);
        
        p.pop();
    }
    
    function setupControls() {
        const controlsSection = document.getElementById('controls-section');
        controlsSection.innerHTML = '';
        
        let tempGroup = createControlGroup('Ocean Temp (C)', 20, 32, oceanTemperature, (val) => {
            oceanTemperature = val;
        });
        controlsSection.appendChild(tempGroup);
        
        let shearGroup = createControlGroup('Wind Shear', 0, 1, windShear, (val) => {
            windShear = val;
        });
        controlsSection.appendChild(shearGroup);
        
        let humidityGroup = createControlGroup('Humidity', 0.3, 1, relativeHumidity, (val) => {
            relativeHumidity = val;
        });
        controlsSection.appendChild(humidityGroup);
        
        let playBtn = createButton(autoPlay ? '⏸ Pause' : '▶ Play', () => {
            autoPlay = !autoPlay;
            playBtn.textContent = autoPlay ? '⏸ Pause' : '▶ Play';
        });
        controlsSection.appendChild(playBtn);
    }
    
    this.resetSketch = function() {
        initializeStorm();
        formationStage = 0;
        stageProgress = 0;
        oceanTemperature = 28;
        windShear = 0.3;
        relativeHumidity = 0.75;
        time = 0;
        soundManager.playSuccess();
    };
};

new p5(hurricaneSketch);