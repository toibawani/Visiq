// ===== MITOSIS SIMULATION =====
// Real cell division visualization
// Author: toibawani
// Biology: Cellular Division, Chromosome Segregation

let mitosisSketch = function(p) {
    let canvasWidth = 800;
    let canvasHeight = 600;
    let stage = 0; // 0: Interphase, 1: Prophase, 2: Metaphase, 3: Anaphase, 4: Telophase
    let stageProgress = 0;
    let isAutoPlay = true;
    let speed = 1;
    
    let chromosomes = [];
    let spindles = [];
    let centrosomes = [];
    let nucleusRadius = 120;
    
    p.setup = function() {
        const container = document.getElementById('simulation-canvas');
        canvasWidth = container.clientWidth;
        canvasHeight = container.clientHeight;
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent('simulation-canvas');
        
        initializeCell();
        setupControls();
        initSketch(this);
    };
    
    p.draw = function() {
        p.background('#050507');
        
        // Update stage
        if (isAutoPlay) {
            stageProgress += 0.005 * speed;
            if (stageProgress >= 1) {
                stageProgress = 0;
                stage = (stage + 1) % 5;
                soundManager.playPulse(200 + stage * 50, 0.3);
            }
        }
        
        // Update chromosomes based on stage
        updateChromosomes();
        updateSpindles();
        
        // Draw cell membrane
        drawCellMembrane();
        
        // Draw centrosomes
        drawCentrosomes();
        
        // Draw spindle fibers
        drawSpindles();
        
        // Draw chromosomes
        drawChromosomes();
        
        // Draw nuclear envelope (if present)
        if (stage < 1 || stage === 4) {
            drawNuclearEnvelope();
        }
        
        // Draw cleavage furrow (telophase)
        if (stage === 4) {
            drawCleavageFurrow();
        }
        
        // Draw info
        drawInfo();
    };
    
    function initializeCell() {
        // Create 4 chromosome pairs (simplified diploid, 2n=4)
        chromosomes = [];
        const colors = ['#00d9ff', '#ff006e', '#ffd60a', '#6366f1'];
        
        for (let pair = 0; pair < 4; pair++) {
            chromosomes.push({
                x: p.random(canvasWidth * 0.3, canvasWidth * 0.7),
                y: p.random(canvasHeight * 0.3, canvasHeight * 0.7),
                targetX: null,
                targetY: null,
                color: colors[pair],
                sister: null,
                isSister: false,
                angle: 0
            });
        }
        
        // Initialize centrosomes (poles)
        centrosomes = [
            { x: canvasWidth * 0.3, y: canvasHeight / 2, asters: [] },
            { x: canvasWidth * 0.7, y: canvasHeight / 2, asters: [] }
        ];
    }
    
    function updateChromosomes() {
        const progress = stageProgress;
        
        switch(stage) {
            case 0: // Interphase - scattered in nucleus
                chromosomes.forEach((chrom, i) => {
                    if (!chrom.targetX) {
                        chrom.targetX = p.random(canvasWidth * 0.3, canvasWidth * 0.7);
                        chrom.targetY = p.random(canvasHeight * 0.3, canvasHeight * 0.7);
                    }
                    chrom.x += (chrom.targetX - chrom.x) * 0.05;
                    chrom.y += (chrom.targetY - chrom.y) * 0.05;
                    chrom.angle = p.random(p.TWO_PI);
                });
                nucleusRadius = 120;
                break;
                
            case 1: // Prophase - condense and replicate
                if (progress < 0.5) {
                    // Condense into center
                    chromosomes.forEach((chrom, i) => {
                        chrom.x = canvasWidth / 2 + p.cos(i / chromosomes.length * p.TWO_PI) * 80 * (1 - progress * 2);
                        chrom.y = canvasHeight / 2 + p.sin(i / chromosomes.length * p.TWO_PI) * 80 * (1 - progress * 2);
                        chrom.angle = i / chromosomes.length * p.TWO_PI;
                    });
                    nucleusRadius = p.lerp(120, 80, progress * 2);
                } else {
                    // Centrosomes move to poles
                    centrosomes[0].x = p.lerp(canvasWidth * 0.5, canvasWidth * 0.25, (progress - 0.5) * 2);
                    centrosomes[1].x = p.lerp(canvasWidth * 0.5, canvasWidth * 0.75, (progress - 0.5) * 2);
                    
                    chromosomes.forEach((chrom, i) => {
                        chrom.x = canvasWidth / 2;
                        chrom.y = canvasHeight / 2;
                    });
                    nucleusRadius = p.lerp(80, 0, (progress - 0.5) * 2);
                }
                break;
                
            case 2: // Metaphase - align at equator
                centrosomes[0].x = p.lerp(centrosomes[0].x, canvasWidth * 0.2, 0.02);
                centrosomes[1].x = p.lerp(centrosomes[1].x, canvasWidth * 0.8, 0.02);
                
                chromosomes.forEach((chrom, i) => {
                    const angle = i / chromosomes.length * p.TWO_PI;
                    chrom.x = canvasWidth / 2 + p.cos(angle) * 50;
                    chrom.y = canvasHeight / 2 + p.sin(angle) * 50;
                    chrom.angle = angle;
                });
                nucleusRadius = 0;
                break;
                
            case 3: // Anaphase - sisters separate and move to poles
                const anaphaseSpeed = progress;
                
                chromosomes.forEach((chrom, i) => {
                    // Alternate which pole each chromosome goes to
                    const poleIndex = i % 2;
                    const targetX = centrosomes[poleIndex].x;
                    const targetY = centrosomes[poleIndex].y;
                    
                    chrom.x = p.lerp(canvasWidth / 2, targetX, anaphaseSpeed);
                    chrom.y = p.lerp(canvasHeight / 2, targetY, anaphaseSpeed);
                    chrom.angle = i / chromosomes.length * p.TWO_PI;
                });
                nucleusRadius = 0;
                break;
                
            case 4: // Telophase - two nuclei form, cytokinesis begins
                const telophaseProgress = progress;
                
                chromosomes.forEach((chrom, i) => {
                    const poleIndex = i % 2;
                    const poleX = centrosomes[poleIndex].x;
                    const poleY = centrosomes[poleIndex].y;
                    
                    // Move toward poles
                    chrom.x += (poleX - chrom.x) * 0.08;
                    chrom.y += (poleY - chrom.y) * 0.08;
                    
                    // Decondense
                    chrom.angle += 0.05;
                });
                
                // Nuclei reform
                nucleusRadius = p.lerp(0, 80, telophaseProgress);
                break;
        }
    }
    
    function updateSpindles() {
        spindles = [];
        
        if (stage >= 1) { // Prophase onwards
            chromosomes.forEach((chrom, i) => {
                const pole = stage === 3 ? (i % 2) : 0;
                const targetPole = stage === 4 ? (i % 2) : (stage >= 2 ? (i % 2) : 0);
                
                spindles.push({
                    x1: centrosomes[targetPole].x,
                    y1: centrosomes[targetPole].y,
                    x2: chrom.x,
                    y2: chrom.y,
                    opacity: Math.min(1, stage >= 1 && stage <= 3 ? 0.8 : 0.4)
                });
            });
        }
    }
    
    function drawCellMembrane() {
        p.stroke('rgba(0, 217, 255, 0.5)');
        p.strokeWeight(3);
        p.noFill();
        p.ellipse(canvasWidth / 2, canvasHeight / 2, canvasWidth * 0.8, canvasHeight * 0.8);
    }
    
    function drawNuclearEnvelope() {
        if (nucleusRadius > 5) {
            p.stroke('rgba(100, 200, 255, 0.4)');
            p.strokeWeight(2);
            p.noFill();
            p.ellipse(canvasWidth / 2, canvasHeight / 2, nucleusRadius * 2);
        }
    }
    
    function drawCentrosomes() {
        centrosomes.forEach((c, i) => {
            // Centriole pair
            p.fill('rgba(255, 0, 110, 0.4)');
            p.stroke('rgba(255, 0, 110, 0.6)');
            p.strokeWeight(2);
            
            // Two perpendicular centrioles
            p.ellipse(c.x - 8, c.y, 6, 12);
            p.ellipse(c.x + 8, c.y, 6, 12);
            
            // Star-like aster radiating from centrosome
            p.stroke('rgba(255, 0, 110, 0.2)');
            p.strokeWeight(1);
            for (let angle = 0; angle < p.TWO_PI; angle += p.PI / 6) {
                const ex = c.x + p.cos(angle) * 80;
                const ey = c.y + p.sin(angle) * 80;
                p.line(c.x, c.y, ex, ey);
            }
        });
    }
    
    function drawSpindles() {
        spindles.forEach(spindle => {
            p.stroke('rgba(100, 150, 200, ' + spindle.opacity * 0.6 + ')');
            p.strokeWeight(1.5);
            p.line(spindle.x1, spindle.y1, spindle.x2, spindle.y2);
            
            // Gradient effect
            p.stroke('rgba(100, 150, 200, ' + spindle.opacity * 0.3 + ')');
            p.strokeWeight(0.5);
            for (let t = 0.2; t < 1; t += 0.2) {
                const px = spindle.x1 + (spindle.x2 - spindle.x1) * t;
                const py = spindle.y1 + (spindle.y2 - spindle.y1) * t;
                p.point(px, py);
            }
        });
    }
    
    function drawChromosomes() {
        chromosomes.forEach((chrom, i) => {
            const separation = stage >= 1 && stage <= 3 ? 10 : 3;
            
            p.push();
            p.translate(chrom.x, chrom.y);
            p.rotate(chrom.angle);
            
            // Sister chromatids (condensed X shape)
            p.fill(chrom.color);
            p.stroke(chrom.color);
            p.strokeWeight(2);
            
            // Left chromatid
            p.ellipse(-separation, 0, 10, 22);
            // Right chromatid
            p.ellipse(separation, 0, 10, 22);
            
            // Centromere (constriction point)
            p.fill('rgba(255, 255, 255, 0.9)');
            p.noStroke();
            p.ellipse(0, 0, 6, 8);
            
            p.pop();
            
            // Chromosome label
            if (stage >= 2) {
                p.push();
                p.fill('rgba(160, 160, 168, 0.5)');
                p.noStroke();
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(9);
                p.text(i + 1, chrom.x, chrom.y - 25);
                p.pop();
            }
        });
    }
    
    function drawCleavageFurrow() {
        const progress = stageProgress;
        const furrowDepth = progress * 60;
        
        // Draw cleavage furrow (membrane pinching)
        p.stroke('rgba(0, 217, 255, 0.6)');
        p.strokeWeight(2);
        p.noFill();
        
        // Curved line showing where cell will pinch
        p.beginShape();
        for (let x = canvasWidth * 0.2; x < canvasWidth * 0.8; x += 10) {
            const distFromCenter = Math.abs(x - canvasWidth / 2);
            const y = canvasHeight / 2 + Math.sin(distFromCenter / 100) * furrowDepth;
            p.vertex(x, y);
        }
        p.endShape();
    }
    
    function drawInfo() {
        const stageNames = ['Interphase', 'Prophase', 'Metaphase', 'Anaphase', 'Telophase'];
        const descriptions = [
            'DNA replicates in nucleus. Chromosomes are loose chromatin.',
            'Chromosomes condense. Centrioles move to poles. Nuclear envelope breaks down.',
            'Sister chromatids align at metaphase plate (cell equator).',
            'Sister chromatids separate and move to opposite poles.',
            'Two nuclei form. Cell membrane pinches. Cytokinesis begins.'
        ];
        
        p.push();
        p.fill('rgba(245, 245, 247, 0.9)');
        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(18);
        p.textFont('Syne');
        p.text(stageNames[stage], 20, 20);
        
        p.textSize(13);
        p.fill('rgba(160, 160, 168, 0.9)');
        p.textFont('Space Grotesk');
        p.text(descriptions[stage], 20, 45);
        
        p.textSize(12);
        p.fill('rgba(100, 200, 255, 0.7)');
        p.text('Progress: ' + ((stageProgress * 100).toFixed(0)) + '%', 20, 75);
        
        p.textSize(11);
        p.fill('rgba(160, 160, 168, 0.6)');
        p.text('Chromosomes: ' + chromosomes.length + ' (2n=4)', 20, 100);
        
        p.pop();
    }
    
    function setupControls() {
        const controlsSection = document.getElementById('controls-section');
        controlsSection.innerHTML = ''; // Clear existing
        
        // Speed control
        let speedGroup = createControlGroup('Animation Speed', 0.3, 2, speed, (val) => {
            speed = val;
        });
        controlsSection.appendChild(speedGroup);
        
        // Play/Pause button
        let playBtn = createButton(isAutoPlay ? '⏸ Pause' : '▶ Play', () => {
            isAutoPlay = !isAutoPlay;
            playBtn.textContent = isAutoPlay ? '⏸ Pause' : '▶ Play';
            soundManager.playPulse(250, 0.2);
        });
        controlsSection.appendChild(playBtn);
        
        // Next stage button
        let nextBtn = createButton('⏭ Next Stage', () => {
            stage = (stage + 1) % 5;
            stageProgress = 0;
            soundManager.playWhoosh(300);
        });
        controlsSection.appendChild(nextBtn);
    }
    
    this.resetSketch = function() {
        stage = 0;
        stageProgress = 0;
        isAutoPlay = true;
        speed = 1;
        initializeCell();
    };
};

new p5(mitosisSketch);