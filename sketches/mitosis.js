// ===== MITOSIS SIMULATION v2.0 =====
// Photorealistic cell division with molecular detail
// Biology: Chromosome condensation, spindle checkpoint, cytokinesis
// Graphics: 3D-like depth, organic rendering, cellular dynamics

let mitosisSketch = function(p) {
    let canvasWidth = 800;
    let canvasHeight = 600;
    let stage = 0;
    let stageProgress = 0;
    let isAutoPlay = true;
    let speed = 1;
    let showLabels = true;
    let showCytoplasm = true;
    
    let chromosomes = [];
    let spindles = [];
    let centrosomes = [];
    let nucleusRadius = 120;
    let cytoplasmParticles = [];
    let cellMembraneWaves = [];
    
    // Animation timing
    const stageDurations = [1.5, 1.8, 1.5, 2, 2]; // seconds per stage
    
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
        
        initializeCell();
        setupControls();
        initSketch(this);
        
        if (typeof soundManager !== 'undefined' && soundManager.startAmbientLoop) {
            soundManager.startAmbientLoop('biology', 'mitosis');
        }
    };
    
    p.draw = function() {
        p.background('#050507');
        
        // Cytoplasm background
        if (showCytoplasm) {
            drawCytoplasm();
        }
        
        // Cell dynamics
        updateCellMembraneWaves();
        
        // Update stage
        if (isAutoPlay) {
            stageProgress += 0.005 * speed;
            if (stageProgress >= 1) {
                stageProgress = 0;
                stage = (stage + 1) % 5;
                if (typeof soundManager !== 'undefined' && soundManager.playOrganicPulse) {
                    soundManager.playOrganicPulse(180 + stage * 30, 0.4);
                }
            }
        }
        
        // Update physics
        updateChromosomes();
        updateSpindles();
        updateCytoplasmParticles();
        
        // Draw layers (back to front)
        drawCellMembrane();
        drawCytoplasmParticles();
        drawCentrosomes();
        drawSpindles();
        drawChromosomes();
        
        // Nuclear envelope
        if (stage < 1 || stage === 4) {
            drawNuclearEnvelope();
        }
        
        // Cleavage furrow
        if (stage === 4) {
            drawCleavageFurrow();
        }
        
        // Labels
        if (showLabels) {
            drawLabels();
        }
        
        // Info
        drawDetailedInfo();
    };
    
    function initializeCell() {
        // Chromosomes (2n=4, diploid)
        chromosomes = [];
        const colors = ['#00d9ff', '#ff006e', '#ffd60a', '#6366f1'];
        const pairing = [[0, 1], [2, 3]]; // Homologous pairs
        
        for (let pair = 0; pair < 4; pair++) {
            chromosomes.push({
                x: p.random(canvasWidth * 0.3, canvasWidth * 0.7),
                y: p.random(canvasHeight * 0.3, canvasHeight * 0.7),
                targetX: null,
                targetY: null,
                color: colors[pair],
                sister: null,
                isSister: false,
                angle: 0,
                centromere: { x: 0, y: 0 },
                condensation: 0, // 0 = loose chromatin, 1 = fully condensed
                kinetochore: { x: 0, y: 0 },
                tension: 0
            });
        }
        
        // Centrosomes (centriole pairs at poles)
        centrosomes = [
            { 
                x: canvasWidth * 0.25, 
                y: canvasHeight / 2, 
                asters: [],
                rotationAngle: 0
            },
            { 
                x: canvasWidth * 0.75, 
                y: canvasHeight / 2, 
                asters: [],
                rotationAngle: 0
            }
        ];
        
        // Cytoplasm particles (Brownian motion)
        cytoplasmParticles = [];
        for (let i = 0; i < 150; i++) {
            cytoplasmParticles.push({
                x: p.random(canvasWidth * 0.1, canvasWidth * 0.9),
                y: p.random(canvasHeight * 0.1, canvasHeight * 0.9),
                vx: p.random(-0.5, 0.5),
                vy: p.random(-0.5, 0.5),
                size: p.random(1, 3),
                opacity: p.random(0.2, 0.6)
            });
        }
        
        // Cell membrane wave generators
        cellMembraneWaves = [];
        for (let i = 0; i < 8; i++) {
            cellMembraneWaves.push({
                angle: (i / 8) * p.TWO_PI,
                phase: 0,
                amplitude: p.random(5, 15)
            });
        }
    }
    
    function drawCytoplasm() {
        // Gradient cytoplasm background
        const gradient = p.drawingContext.createRadialGradient(
            canvasWidth / 2, canvasHeight / 2, 0,
            canvasWidth / 2, canvasHeight / 2, 500
        );
        gradient.addColorStop(0, 'rgba(100, 120, 140, 0.05)');
        gradient.addColorStop(1, 'rgba(80, 90, 120, 0.02)');
        
        p.drawingContext.fillStyle = gradient;
        p.drawingContext.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    function drawCytoplasmParticles() {
        cytoplasmParticles.forEach(particle => {
            // Brownian motion
            particle.vx += p.random(-0.3, 0.3);
            particle.vy += p.random(-0.3, 0.3);
            particle.vx *= 0.95;
            particle.vy *= 0.95;
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Boundary bounce
            if (particle.x < 20 || particle.x > canvasWidth - 20) particle.vx *= -1;
            if (particle.y < 20 || particle.y > canvasHeight - 20) particle.vy *= -1;
            particle.x = p.constrain(particle.x, 20, canvasWidth - 20);
            particle.y = p.constrain(particle.y, 20, canvasHeight - 20);
            
            // Draw particle with glow
            p.push();
            const glowGrad = p.drawingContext.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size * 2
            );
            glowGrad.addColorStop(0, `rgba(100, 150, 200, ${particle.opacity * 0.3})`);
            glowGrad.addColorStop(1, 'rgba(100, 150, 200, 0)');
            
            p.drawingContext.fillStyle = glowGrad;
            p.drawingContext.beginPath();
            p.drawingContext.arc(particle.x, particle.y, particle.size * 2, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            p.fill(`rgba(100, 150, 200, ${particle.opacity})`);
            p.noStroke();
            p.ellipse(particle.x, particle.y, particle.size);
            
            p.pop();
        });
    }
    
    function updateCellMembraneWaves() {
        cellMembraneWaves.forEach(wave => {
            wave.phase += 0.02;
            wave.amplitude = p.lerp(wave.amplitude, p.random(3, 12), 0.05);
        });
    }
    
    function drawCellMembrane() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const baseRadius = canvasWidth * 0.4;
        
        p.push();
        p.noFill();
        p.stroke('rgba(0, 217, 255, 0.6)');
        p.strokeWeight(3);
        
        // Draw wavy cell membrane
        p.beginShape();
        for (let angle = 0; angle < p.TWO_PI; angle += 0.05) {
            let waveInfluence = 0;
            cellMembraneWaves.forEach((wave, i) => {
                waveInfluence += Math.sin(angle - wave.phase) * (wave.amplitude / 10);
            });
            
            const radius = baseRadius + waveInfluence;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            p.vertex(x, y);
        }
        p.endShape(p.CLOSE);
        
        // Membrane glow
        p.stroke('rgba(0, 217, 255, 0.2)');
        p.strokeWeight(8);
        p.beginShape();
        for (let angle = 0; angle < p.TWO_PI; angle += 0.05) {
            const radius = baseRadius;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            p.vertex(x, y);
        }
        p.endShape(p.CLOSE);
        
        p.pop();
    }
    
    function updateChromosomes() {
        const progress = stageProgress;
        
        switch(stage) {
            case 0: // Interphase
                chromosomes.forEach((chrom, i) => {
                    if (!chrom.targetX) {
                        chrom.targetX = p.random(canvasWidth * 0.3, canvasWidth * 0.7);
                        chrom.targetY = p.random(canvasHeight * 0.3, canvasHeight * 0.7);
                    }
                    chrom.x += (chrom.targetX - chrom.x) * 0.05;
                    chrom.y += (chrom.targetY - chrom.y) * 0.05;
                    chrom.condensation = p.lerp(chrom.condensation, 0, 0.02);
                    chrom.angle = p.random(p.TWO_PI);
                });
                nucleusRadius = 120;
                break;
                
            case 1: // Prophase
                if (progress < 0.5) {
                    chromosomes.forEach((chrom, i) => {
                        chrom.x = canvasWidth / 2 + p.cos(i / chromosomes.length * p.TWO_PI) * 70 * (1 - progress * 2);
                        chrom.y = canvasHeight / 2 + p.sin(i / chromosomes.length * p.TWO_PI) * 70 * (1 - progress * 2);
                        chrom.condensation = p.lerp(chrom.condensation, 0.8, 0.05);
                    });
                    nucleusRadius = p.lerp(120, 60, progress * 2);
                } else {
                    centrosomes[0].x = p.lerp(centrosomes[0].x, canvasWidth * 0.2, 0.05);
                    centrosomes[1].x = p.lerp(centrosomes[1].x, canvasWidth * 0.8, 0.05);
                    nucleusRadius = p.lerp(60, 0, (progress - 0.5) * 2);
                    chromosomes.forEach(chrom => {
                        chrom.x = canvasWidth / 2;
                        chrom.y = canvasHeight / 2;
                        chrom.condensation = 1;
                    });
                }
                break;
                
            case 2: // Metaphase
                chromosomes.forEach((chrom, i) => {
                    const angle = i / chromosomes.length * p.TWO_PI;
                    chrom.x = canvasWidth / 2 + Math.cos(angle) * 50;
                    chrom.y = canvasHeight / 2 + Math.sin(angle) * 50;
                    chrom.condensation = 1;
                    chrom.angle = angle;
                });
                nucleusRadius = 0;
                break;
                
            case 3: // Anaphase
                chromosomes.forEach((chrom, i) => {
                    const poleIndex = i % 2;
                    const targetX = centrosomes[poleIndex].x;
                    const targetY = centrosomes[poleIndex].y;
                    
                    chrom.x = p.lerp(canvasWidth / 2, targetX, progress);
                    chrom.y = p.lerp(canvasHeight / 2, targetY, progress);
                    chrom.condensation = p.lerp(chrom.condensation, 0.9, 0.02);
                });
                nucleusRadius = 0;
                break;
                
            case 4: // Telophase
                chromosomes.forEach((chrom, i) => {
                    const poleIndex = i % 2;
                    const poleX = centrosomes[poleIndex].x;
                    const poleY = centrosomes[poleIndex].y;
                    
                    chrom.x += (poleX - chrom.x) * 0.08;
                    chrom.y += (poleY - chrom.y) * 0.08;
                    chrom.condensation = p.lerp(chrom.condensation, 0.3, 0.03);
                });
                nucleusRadius = p.lerp(0, 70, progress);
                break;
        }
    }
    
    function updateSpindles() {
        spindles = [];
        
        if (stage >= 1) {
            chromosomes.forEach((chrom, i) => {
                const poleIndex = stage === 3 ? (i % 2) : stage >= 2 ? (i % 2) : 0;
                
                spindles.push({
                    x1: centrosomes[poleIndex].x,
                    y1: centrosomes[poleIndex].y,
                    x2: chrom.x,
                    y2: chrom.y,
                    opacity: Math.min(1, stage >= 1 && stage <= 3 ? 0.8 : 0.4),
                    width: p.map(stage, 1, 4, 1, 2)
                });
            });
        }
    }
    
    function updateCytoplasmParticles() {
        // Already updated in draw
    }
    
    function drawNuclearEnvelope() {
        if (nucleusRadius > 8) {
            const gradient = p.drawingContext.createRadialGradient(
                canvasWidth / 2, canvasHeight / 2, nucleusRadius - 10,
                canvasWidth / 2, canvasHeight / 2, nucleusRadius + 10
            );
            gradient.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
            gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
            
            p.drawingContext.fillStyle = gradient;
            p.drawingContext.beginPath();
            p.drawingContext.arc(canvasWidth / 2, canvasHeight / 2, nucleusRadius + 10, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            p.push();
            p.stroke('rgba(100, 200, 255, 0.4)');
            p.strokeWeight(2);
            p.noFill();
            p.ellipse(canvasWidth / 2, canvasHeight / 2, nucleusRadius * 2);
            p.pop();
        }
    }
    
    function drawCentrosomes() {
        centrosomes.forEach((c, i) => {
            p.push();
            
            // Centriole pair
            p.push();
            p.translate(c.x, c.y);
            p.rotate(c.rotationAngle);
            
            const centrioleColor = stage >= 1 ? 'rgba(255, 0, 110, 0.7)' : 'rgba(255, 0, 110, 0.3)';
            
            p.fill(centrioleColor);
            p.stroke(centrioleColor);
            p.strokeWeight(2);
            p.ellipse(-8, 0, 6, 14);
            p.ellipse(8, 0, 6, 14);
            
            p.pop();
            
            c.rotationAngle += 0.02;
            
            // Aster radiations
            p.stroke('rgba(255, 0, 110, 0.2)');
            p.strokeWeight(1);
            for (let angle = 0; angle < p.TWO_PI; angle += p.PI / 8) {
                const ex = c.x + p.cos(angle) * 90;
                const ey = c.y + p.sin(angle) * 90;
                p.line(c.x, c.y, ex, ey);
            }
            
            // Pericentriolar material (PCM) cloud
            const pcmGradient = p.drawingContext.createRadialGradient(
                c.x, c.y, 0,
                c.x, c.y, 40
            );
            pcmGradient.addColorStop(0, 'rgba(255, 0, 110, 0.15)');
            pcmGradient.addColorStop(1, 'rgba(255, 0, 110, 0)');
            
            p.drawingContext.fillStyle = pcmGradient;
            p.drawingContext.beginPath();
            p.drawingContext.arc(c.x, c.y, 40, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            p.pop();
        });
    }
    
    function drawSpindles() {
        spindles.forEach(spindle => {
            // Spindle fiber bundle
            for (let i = 0; i < 5; i++) {
                const offset = (i - 2) * 2;
                p.stroke(`rgba(100, 150, 200, ${spindle.opacity * 0.5})`);
                p.strokeWeight(spindle.width);
                p.line(
                    spindle.x1 + offset, spindle.y1,
                    spindle.x2 + offset, spindle.y2
                );
            }
            
            // Bright core of spindle
            p.stroke(`rgba(150, 200, 255, ${spindle.opacity * 0.8})`);
            p.strokeWeight(spindle.width * 1.5);
            p.line(spindle.x1, spindle.y1, spindle.x2, spindle.y2);
        });
    }
    
    function drawChromosomes() {
        chromosomes.forEach((chrom, i) => {
            const separation = chrom.condensation > 0.3 ? 10 * chrom.condensation : 0;
            
            p.push();
            p.translate(chrom.x, chrom.y);
            p.rotate(chrom.angle);
            
            // Chromosome base color
            const chromColor = chrom.color;
            
            // Sister chromatids with 3D effect
            if (chrom.condensation > 0.2) {
                // Left chromatid
                const leftGrad = p.drawingContext.createLinearGradient(-separation - 5, -15, -separation + 5, 15);
                leftGrad.addColorStop(0, chromColor + '0.4)');
                leftGrad.addColorStop(0.5, chromColor + '0.8)');
                leftGrad.addColorStop(1, chromColor + '0.4)');
                
                p.drawingContext.fillStyle = leftGrad;
                p.drawingContext.beginPath();
                p.drawingContext.ellipse(-separation, 0, 8, 18, 0, 0, p.TWO_PI);
                p.drawingContext.fill();
                
                // Right chromatid
                const rightGrad = p.drawingContext.createLinearGradient(separation - 5, -15, separation + 5, 15);
                rightGrad.addColorStop(0, chromColor + '0.4)');
                rightGrad.addColorStop(0.5, chromColor + '0.8)');
                rightGrad.addColorStop(1, chromColor + '0.4)');
                
                p.drawingContext.fillStyle = rightGrad;
                p.drawingContext.beginPath();
                p.drawingContext.ellipse(separation, 0, 8, 18, 0, 0, p.TWO_PI);
                p.drawingContext.fill();
            }
            
            // Centromere (constriction)
            const centromereGrad = p.drawingContext.createRadialGradient(0, 0, 2, 0, 0, 6);
            centromereGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            centromereGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            p.drawingContext.fillStyle = centromereGrad;
            p.drawingContext.beginPath();
            p.drawingContext.arc(0, 0, 6, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            p.pop();
            
            // Kinetochore attachment point
            if (stage >= 2) {
                const kinetochoreGlowGrad = p.drawingContext.createRadialGradient(
                    chrom.x, chrom.y, 0,
                    chrom.x, chrom.y, 8
                );
                kinetochoreGlowGrad.addColorStop(0, `rgba(255, 255, 100, 0.4)`);
                kinetochoreGlowGrad.addColorStop(1, 'rgba(255, 255, 100, 0)');
                
                p.drawingContext.fillStyle = kinetochoreGlowGrad;
                p.drawingContext.beginPath();
                p.drawingContext.arc(chrom.x, chrom.y, 8, 0, p.TWO_PI);
                p.drawingContext.fill();
            }
        });
    }
    
    function drawCleavageFurrow() {
        const progress = stageProgress;
        const furrowDepth = progress * 80;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        p.push();
        p.stroke('rgba(0, 217, 255, 0.7)');
        p.strokeWeight(3);
        p.noFill();
        
        // Curved cleavage furrow
        p.beginShape();
        for (let x = centerX * 0.3; x < centerX * 1.7; x += 10) {
            const distFromCenter = Math.abs(x - centerX);
            const y = centerY + Math.sin(distFromCenter / 100) * furrowDepth;
            p.vertex(x, y);
        }
        p.endShape();
        
        // Furrow glow
        p.stroke('rgba(0, 217, 255, 0.2)');
        p.strokeWeight(8);
        p.beginShape();
        for (let x = centerX * 0.3; x < centerX * 1.7; x += 10) {
            const distFromCenter = Math.abs(x - centerX);
            const y = centerY + Math.sin(distFromCenter / 100) * furrowDepth;
            p.vertex(x, y);
        }
        p.endShape();
        
        p.pop();
    }
    
    function drawLabels() {
        const stageNames = ['Interphase', 'Prophase', 'Metaphase', 'Anaphase', 'Telophase'];
        const descriptions = [
            'Chromatin loose in nucleus. DNA replicates (S phase).',
            'Chromosomes condense. Centrioles move to poles. NE breaks down.',
            'Sister chromatids align at cell equator (metaphase plate).',
            'Centromeres divide. Chromatids move to opposite poles.',
            'Nuclear envelopes reform. Cytokinesis begins. Two cells form.'
        ];
        
        p.push();
        p.fill('rgba(245, 245, 247, 0.9)');
        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        p.textFont('Syne');
        p.textSize(20);
        p.text(stageNames[stage], 20, 20);
        
        p.textFont('Space Grotesk');
        p.textSize(13);
        p.fill('rgba(160, 160, 168, 0.9)');
        p.text(descriptions[stage], 20, 50);
        
        p.pop();
    }
    
    function drawDetailedInfo() {
        p.push();
        p.fill('rgba(245, 245, 247, 0.8)');
        p.noStroke();
        p.textAlign(p.LEFT, p.BOTTOM);
        p.textFont('Space Grotesk');
        p.textSize(11);
        
        const stagePercent = (stage + stageProgress) / 5 * 100;
        p.text(`Cell Cycle: ${stagePercent.toFixed(0)}% | Chromosomes: ${chromosomes.length} (2n=4)`, 20, canvasHeight - 20);
        p.text(`Condensation: ${(p.map(stageProgress, 0, 1, 0, 100)).toFixed(0)}% | Spindle Tension: ${stage >= 2 ? 'Active' : 'Inactive'}`, 20, canvasHeight - 5);
        
        p.pop();
    }
    
    function setupControls() {
        const controlsSection = document.getElementById('controls-section');
        controlsSection.innerHTML = '';
        
        let speedGroup = createControlGroup('Speed', 0.3, 2, speed, (val) => {
            speed = val;
        });
        controlsSection.appendChild(speedGroup);
        
        let playBtn = createButton(isAutoPlay ? '⏸ Pause' : '▶ Play', () => {
            isAutoPlay = !isAutoPlay;
            playBtn.textContent = isAutoPlay ? '⏸ Pause' : '▶ Play';
        });
        controlsSection.appendChild(playBtn);
        
        let nextBtn = createButton('⏭ Next Stage', () => {
            stage = (stage + 1) % 5;
            stageProgress = 0;
            soundManager.playChime(550, 0.25);
        });
        controlsSection.appendChild(nextBtn);
    }
    
    this.resetSketch = function() {
        initializeCell();
        stage = 0;
        stageProgress = 0;
        isAutoPlay = true;
        speed = 1;
        soundManager.playSuccess();
    };
};

new p5(mitosisSketch);