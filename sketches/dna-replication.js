// ===== DNA REPLICATION SIMULATION v1.0 =====
// Photorealistic molecular biology
// Biology: Double helix unwinding, base pairing, DNA polymerase, semi-conservative replication
// Graphics: 3D helix, nucleotides, hydrogen bonds, replication fork, leading/lagging strands

let dnaReplicationSketch = function(p) {
    let canvasWidth = 800;
    let canvasHeight = 600;
    
    // Simulation state
    let time = 0;
    let replicationPhase = 0; // 0: Intact helix, 1: Unwinding, 2: Leading strand, 3: Lagging strand, 4: Complete
    let phaseProgress = 0;
    let autoPlay = true;
    let speed = 1;
    let showBonds = true;
    let showPolymerase = true;
    
    // DNA structure
    let helixSegments = [];
    let nucleotides = [];
    let helixRadius = 40;
    let helixPitch = 80;
    let totalTurns = 3;
    
    // Replication machinery
    let helicase = { x: 0, y: 0, progress: 0, isActive: false };
    let polymeraseA = { x: 0, y: 0, progress: 0, direction: 1 };
    let polymeraseB = { x: 0, y: 0, progress: 0, direction: -1 };
    
    // Strand states
    let strandA = [];
    let strandB = [];
    let newStrandA = [];
    let newStrandB = [];
    
    // Visual elements
    let hydrogenBonds = [];
    let nucleotidePool = [];
    let replicationFork = { x: 0, y: 0, width: 0 };
    
    p.setup = function() {
        const container = document.getElementById('simulation-canvas');
        canvasWidth = container.clientWidth;
        canvasHeight = container.clientHeight;
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent('simulation-canvas');
        p.pixelDensity(1);
        
        initializeDNA();
        setupControls();
        initSketch(this);
        
        soundManager.startAmbientLoop('biology', 'dna');
    };
    
    p.draw = function() {
        // Cellular background
        drawCellularBackground();
        
        // Clear with gradient
        p.background('#050507');
        
        // Update physics
        if (autoPlay) {
            phaseProgress += 0.002 * speed;
            if (phaseProgress >= 1) {
                phaseProgress = 0;
                replicationPhase = (replicationPhase + 1) % 5;
                soundManager.playOrganicPulse(150 + replicationPhase * 40, 0.3);
            }
        }
        
        updateDNAStructure();
        updateReplicationMachinery();
        updateNucleotidePairing();
        updateReplicationFork();
        
        // Rendering (back to front)
        drawCellMembrane();
        drawNucleotidePool();
        drawBackgroundStrands();
        drawHelixStructure();
        
        if (showBonds) {
            drawHydrogenBonds();
        }
        
        drawReplicationFork();
        drawHelicase();
        
        if (showPolymerase) {
            drawPolymerases();
        }
        
        drawNewStrands();
        drawCompleteHélices();
        
        // Info
        drawDNAInfo();
        
        time += 0.016;
    };
    
    function initializeDNA() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // Create initial double helix
        strandA = [];
        strandB = [];
        helixSegments = [];
        
        const segmentCount = 20;
        for (let i = 0; i < segmentCount; i++) {
            const t = i / segmentCount;
            const angle = t * totalTurns * p.TWO_PI;
            const y = centerY - helixPitch * totalTurns / 2 + t * helixPitch * totalTurns;
            
            // Strand A (top strand)
            const aX = centerX + Math.cos(angle) * helixRadius;
            strandA.push({
                index: i,
                x: aX,
                y: y,
                baseX: aX,
                baseY: y,
                base: p.random(['A', 'T', 'G', 'C']),
                complementBase: null,
                paired: true,
                brightness: 0.7,
                angle: angle
            });
            
            // Strand B (bottom strand)
            const bX = centerX + Math.cos(angle + p.PI) * helixRadius;
            strandB.push({
                index: i,
                x: bX,
                y: y,
                baseX: bX,
                baseY: y,
                base: p.random(['A', 'T', 'G', 'C']),
                complementBase: null,
                paired: true,
                brightness: 0.7,
                angle: angle + p.PI
            });
            
            // Assign complementary bases
            setComplementaryBase(strandA[i]);
            setComplementaryBase(strandB[i]);
            
            helixSegments.push({
                index: i,
                aX: strandA[i].x,
                aY: strandA[i].y,
                bX: strandB[i].x,
                bY: strandB[i].y,
                connected: true
            });
        }
        
        // Nucleotide pool (free nucleotides in cytoplasm)
        nucleotidePool = [];
        for (let i = 0; i < 50; i++) {
            nucleotidePool.push({
                x: p.random(canvasWidth * 0.2, canvasWidth * 0.8),
                y: p.random(canvasHeight * 0.1, canvasHeight * 0.9),
                vx: p.random(-1, 1),
                vy: p.random(-1, 1),
                base: p.random(['A', 'T', 'G', 'C']),
                age: 0,
                incorporated: false,
                brightness: p.random(0.4, 0.8)
            });
        }
        
        // Initialize polymerases
        polymeraseA = {
            x: canvasWidth / 2 - 100,
            y: canvasHeight / 2,
            progress: 0,
            direction: 1,
            speed: 0.5,
            nucleotidesAdded: 0,
            active: false
        };
        
        polymeraseB = {
            x: canvasWidth / 2 + 100,
            y: canvasHeight / 2,
            progress: 0,
            direction: -1,
            speed: 0.3,
            nucleotidesAdded: 0,
            active: false
        };
        
        // Helicase
        helicase = {
            x: canvasWidth / 2,
            y: canvasHeight / 2 - helixPitch * totalTurns / 2,
            progress: 0,
            isActive: false,
            speed: 0.4
        };
        
        // New strands
        newStrandA = [];
        newStrandB = [];
    }
    
    function setComplementaryBase(nucleotide) {
        switch(nucleotide.base) {
            case 'A': nucleotide.complementBase = 'T'; break;
            case 'T': nucleotide.complementBase = 'A'; break;
            case 'G': nucleotide.complementBase = 'C'; break;
            case 'C': nucleotide.complementBase = 'G'; break;
        }
    }
    
    function updateDNAStructure() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const transition = replicationPhase + phaseProgress;
        
        // Phase 0: Normal helix (no unwinding)
        if (transition < 1) {
            helixSegments.forEach((segment, i) => {
                const unwound = 0;
                segment.connected = true;
            });
            
            strandA.forEach((nuc, i) => {
                nuc.paired = true;
                nuc.brightness = p.map(i, 0, strandA.length, 0.5, 0.9);
            });
            
            strandB.forEach((nuc, i) => {
                nuc.paired = true;
                nuc.brightness = p.map(i, 0, strandB.length, 0.5, 0.9);
            });
        }
        // Phase 1: Helicase unwinding
        else if (transition < 2) {
            const unwindAmount = (transition - 1);
            helicase.isActive = true;
            helicase.progress = unwindAmount;
            
            helixSegments.forEach((segment, i) => {
                const localProgress = p.constrain(unwindAmount * 5 - i * 0.1, 0, 1);
                segment.connected = 1 - localProgress;
                
                if (i < strandA.length) {
                    strandA[i].paired = segment.connected > 0.5;
                    strandB[i].paired = segment.connected > 0.5;
                }
            });
        }
        // Phase 2: Leading strand synthesis
        else if (transition < 3) {
            const synthProgress = (transition - 2);
            polymeraseA.active = true;
            polymeraseA.progress = synthProgress;
            polymeraseA.nucleotidesAdded = Math.floor(synthProgress * strandA.length);
            
            // Create new strand A
            newStrandA = strandA.slice(0, polymeraseA.nucleotidesAdded).map(nuc => ({
                x: nuc.x + 60,
                y: nuc.y,
                base: nuc.complementBase,
                brightness: 0.8,
                age: Math.random()
            }));
        }
        // Phase 3: Lagging strand synthesis
        else if (transition < 4) {
            const synthProgress = (transition - 3);
            polymeraseB.active = true;
            polymeraseB.progress = synthProgress;
            polymeraseB.nucleotidesAdded = Math.floor(synthProgress * strandB.length);
            
            // Create new strand B (discontinuous - Okazaki fragments)
            newStrandB = strandB.slice(0, polymeraseB.nucleotidesAdded).map((nuc, idx) => ({
                x: nuc.x - 60,
                y: nuc.y,
                base: nuc.complementBase,
                brightness: 0.6 + Math.sin(idx * 0.3) * 0.2,
                age: Math.random()
            }));
        }
        // Phase 4: Complete
        else {
            polymeraseA.active = false;
            polymeraseB.active = false;
            helicase.isActive = false;
        }
    }
    
    function updateReplicationMachinery() {
        // Helicase moves along unwinding DNA
        if (helicase.isActive) {
            helicase.progress += 0.005 * speed;
        }
    }
    
    function updateNucleotidePairing() {
        nucleotidePool.forEach(nucleotide => {
            nucleotide.x += nucleotide.vx * 0.3;
            nucleotide.y += nucleotide.vy * 0.3;
            
            nucleotide.vx *= 0.98;
            nucleotide.vy *= 0.98;
            
            // Brownian motion
            nucleotide.vx += p.random(-0.2, 0.2);
            nucleotide.vy += p.random(-0.2, 0.2);
            
            // Constrain to canvas
            if (nucleotide.x < 50) {
                nucleotide.x = 50;
                nucleotide.vx *= -1;
            }
            if (nucleotide.x > canvasWidth - 50) {
                nucleotide.x = canvasWidth - 50;
                nucleotide.vx *= -1;
            }
            if (nucleotide.y < 50) {
                nucleotide.y = 50;
                nucleotide.vy *= -1;
            }
            if (nucleotide.y > canvasHeight - 50) {
                nucleotide.y = canvasHeight - 50;
                nucleotide.vy *= -1;
            }
            
            nucleotide.age++;
            
            // Fade if too old
            if (nucleotide.age > 300) {
                nucleotide.brightness *= 0.99;
            }
        });
    }
    
    function updateReplicationFork() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const transition = replicationPhase + phaseProgress;
        
        if (transition >= 1 && transition < 2) {
            replicationFork.x = centerX;
            replicationFork.y = centerY - helixPitch * totalTurns / 2 + (transition - 1) * helixPitch * totalTurns;
            replicationFork.width = 80;
        }
    }
    
    function drawCellularBackground() {
        const grad = p.drawingContext.createRadialGradient(
            canvasWidth / 2, canvasHeight / 2, 0,
            canvasWidth / 2, canvasHeight / 2, 600
        );
        grad.addColorStop(0, 'rgba(50, 80, 100, 0.1)');
        grad.addColorStop(1, 'rgba(20, 40, 60, 0.05)');
        
        p.drawingContext.fillStyle = grad;
        p.drawingContext.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    function drawCellMembrane() {
        p.push();
        p.stroke('rgba(0, 217, 255, 0.3)');
        p.strokeWeight(2);
        p.noFill();
        
        // Nuclear envelope (simplified)
        p.ellipse(canvasWidth / 2, canvasHeight / 2, canvasWidth * 0.7, canvasHeight * 0.8);
        
        p.pop();
    }
    
    function drawNucleotidePool() {
        p.push();
        
        nucleotidePool.forEach(nucleotide => {
            // Nucleotide glow
            const glowGrad = p.drawingContext.createRadialGradient(
                nucleotide.x, nucleotide.y, 0,
                nucleotide.x, nucleotide.y, 6
            );
            glowGrad.addColorStop(0, 'rgba(100, 200, 255, ' + (nucleotide.brightness * 0.4) + ')');
            glowGrad.addColorStop(1, 'rgba(100, 200, 255, 0)');
            
            p.drawingContext.fillStyle = glowGrad;
            p.drawingContext.beginPath();
            p.drawingContext.arc(nucleotide.x, nucleotide.y, 6, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            // Nucleotide core
            const baseColor = getBaseColor(nucleotide.base);
            p.fill(baseColor + (nucleotide.brightness * 0.7) + ')');
            p.noStroke();
            p.ellipse(nucleotide.x, nucleotide.y, 3);
            
            // Base label (tiny)
            p.fill(baseColor + '0.9)');
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(7);
            p.text(nucleotide.base, nucleotide.x, nucleotide.y);
        });
        
        p.pop();
    }
    
    function drawBackgroundStrands() {
        p.push();
        
        // Draw sugar-phosphate backbone
        strandA.forEach((nuc, i) => {
            if (i < strandA.length - 1) {
                p.stroke('rgba(100, 150, 200, 0.4)');
                p.strokeWeight(2);
                p.line(strandA[i].x, strandA[i].y, strandA[i + 1].x, strandA[i + 1].y);
            }
        });
        
        strandB.forEach((nuc, i) => {
            if (i < strandB.length - 1) {
                p.stroke('rgba(200, 100, 150, 0.4)');
                p.strokeWeight(2);
                p.line(strandB[i].x, strandB[i].y, strandB[i + 1].x, strandB[i + 1].y);
            }
        });
        
        p.pop();
    }
    
    function drawHelixStructure() {
        p.push();
        
        // Draw base pairs
        strandA.forEach((nucA, i) => {
            if (i < strandB.length) {
                const nucB = strandB[i];
                
                // Base circle
                const baseColor = getBaseColor(nucA.base);
                p.fill(baseColor + (nucA.brightness * 0.8) + ')');
                p.noStroke();
                p.ellipse(nucA.x, nucA.y, 5);
                
                // Complement base
                const compColor = getBaseColor(nucB.base);
                p.fill(compColor + (nucB.brightness * 0.8) + ')');
                p.ellipse(nucB.x, nucB.y, 5);
            }
        });
        
        p.pop();
    }
    
    function drawHydrogenBonds() {
        if (!showBonds) return;
        
        p.push();
        
        strandA.forEach((nucA, i) => {
            if (i < strandB.length) {
                const nucB = strandB[i];
                
                if (nucA.paired) {
                    // Bond strength visualization
                    const bondCount = (nucA.base === 'G' || nucA.base === 'C') ? 3 : 2;
                    
                    for (let b = 0; b < bondCount; b++) {
                        const offset = (b - (bondCount - 1) / 2) * 2;
                        p.stroke('rgba(0, 217, 255, ' + (0.4 - b * 0.1) + ')');
                        p.strokeWeight(1);
                        p.line(
                            nucA.x + offset, nucA.y,
                            nucB.x - offset, nucB.y
                        );
                    }
                }
            }
        });
        
        p.pop();
    }
    
    function drawReplicationFork() {
        if (replicationFork.width === 0) return;
        
        p.push();
        
        // Y-shaped fork
        p.stroke('rgba(0, 217, 255, 0.7)');
        p.strokeWeight(3);
        
        // Upper strand
        p.line(
            replicationFork.x - replicationFork.width / 2, replicationFork.y,
            replicationFork.x, replicationFork.y + 40
        );
        
        // Lower strand
        p.line(
            replicationFork.x + replicationFork.width / 2, replicationFork.y,
            replicationFork.x, replicationFork.y + 40
        );
        
        // Center line
        p.line(replicationFork.x, replicationFork.y, replicationFork.x, replicationFork.y + 40);
        
        p.pop();
    }
    
    function drawHelicase() {
        if (!helicase.isActive) return;
        
        p.push();
        
        const helicaseX = helicase.x;
        const helicaseY = helicase.y + helicase.progress * helixPitch * totalTurns;
        
        // Helicase enzyme (hexagonal ring)
        p.fill('rgba(255, 100, 50, 0.6)');
        p.stroke('rgba(255, 100, 50, 0.8)');
        p.strokeWeight(2);
        
        // Draw hexagon
        p.beginShape();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * p.TWO_PI;
            const x = helicaseX + Math.cos(angle) * 15;
            const y = helicaseY + Math.sin(angle) * 15;
            p.vertex(x, y);
        }
        p.endShape(p.CLOSE);
        
        // Glow
        const helicaseGlow = p.drawingContext.createRadialGradient(
            helicaseX, helicaseY, 0,
            helicaseX, helicaseY, 30
        );
        helicaseGlow.addColorStop(0, 'rgba(255, 100, 50, 0.2)');
        helicaseGlow.addColorStop(1, 'rgba(255, 100, 50, 0)');
        
        p.drawingContext.fillStyle = helicaseGlow;
        p.drawingContext.beginPath();
        p.drawingContext.arc(helicaseX, helicaseY, 30, 0, p.TWO_PI);
        p.drawingContext.fill();
        
        p.pop();
    }
    
    function drawPolymerases() {
        if (!showPolymerase) return;
        
        p.push();
        
        // Polymerase A (leading strand)
        if (polymeraseA.active) {
            drawPolymerase(
                polymeraseA.x,
                polymeraseA.y + polymeraseA.progress * helixPitch * totalTurns,
                'rgba(100, 200, 255, 0.7)',
                'Leading'
            );
        }
        
        // Polymerase B (lagging strand)
        if (polymeraseB.active) {
            drawPolymerase(
                polymeraseB.x,
                polymeraseB.y + polymeraseB.progress * helixPitch * totalTurns,
                'rgba(255, 150, 100, 0.7)',
                'Lagging'
            );
        }
        
        p.pop();
    }
    
    function drawPolymerase(x, y, color, label) {
        // Polymerase enzyme (blob shape)
        p.fill(color);
        p.stroke(color.replace('0.7', '0.9'));
        p.strokeWeight(2);
        
        // Draw irregular blob
        p.beginShape();
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * p.TWO_PI;
            const radius = 12 + Math.sin(angle * 3 + time * 0.1) * 3;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            p.vertex(px, py);
        }
        p.endShape(p.CLOSE);
        
        // Glow
        const polyGlow = p.drawingContext.createRadialGradient(x, y, 0, x, y, 35);
        polyGlow.addColorStop(0, color.replace('0.7', '0.3'));
        polyGlow.addColorStop(1, color.replace('0.7', '0'));
        
        p.drawingContext.fillStyle = polyGlow;
        p.drawingContext.beginPath();
        p.drawingContext.arc(x, y, 35, 0, p.TWO_PI);
        p.drawingContext.fill();
        
        // Label
        p.fill('rgba(245, 245, 247, 0.8)');
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(8);
        p.text(label, x, y - 25);
    }
    
    function drawNewStrands() {
        p.push();
        
        // New strand A (leading - continuous)
        newStrandA.forEach((nuc, i) => {
            const glowGrad = p.drawingContext.createRadialGradient(
                nuc.x, nuc.y, 0,
                nuc.x, nuc.y, 5
            );
            glowGrad.addColorStop(0, 'rgba(100, 255, 150, ' + (nuc.brightness * 0.5) + ')');
            glowGrad.addColorStop(1, 'rgba(100, 255, 150, 0)');
            
            p.drawingContext.fillStyle = glowGrad;
            p.drawingContext.beginPath();
            p.drawingContext.arc(nuc.x, nuc.y, 5, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            const baseColor = getBaseColor(nuc.base);
            p.fill(baseColor + (nuc.brightness * 0.9) + ')');
            p.noStroke();
            p.ellipse(nuc.x, nuc.y, 4);
        });
        
        // Connect with backbone
        if (newStrandA.length > 1) {
            p.stroke('rgba(100, 255, 150, 0.6)');
            p.strokeWeight(2);
            p.beginShape();
            newStrandA.forEach(nuc => {
                p.vertex(nuc.x, nuc.y);
            });
            p.endShape();
        }
        
        // New strand B (lagging - Okazaki fragments)
        newStrandB.forEach((nuc, i) => {
            const glowGrad = p.drawingContext.createRadialGradient(
                nuc.x, nuc.y, 0,
                nuc.x, nuc.y, 5
            );
            glowGrad.addColorStop(0, 'rgba(150, 255, 100, ' + (nuc.brightness * 0.5) + ')');
            glowGrad.addColorStop(1, 'rgba(150, 255, 100, 0)');
            
            p.drawingContext.fillStyle = glowGrad;
            p.drawingContext.beginPath();
            p.drawingContext.arc(nuc.x, nuc.y, 5, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            const baseColor = getBaseColor(nuc.base);
            p.fill(baseColor + (nuc.brightness * 0.9) + ')');
            p.noStroke();
            p.ellipse(nuc.x, nuc.y, 4);
        });
        
        // Connect with backbone (dashed - Okazaki fragments)
        if (newStrandB.length > 1) {
            p.stroke('rgba(150, 255, 100, 0.6)');
            p.strokeWeight(2);
            p.beginShape();
            newStrandB.forEach(nuc => {
                p.vertex(nuc.x, nuc.y);
            });
            p.endShape();
        }
        
        p.pop();
    }
    
    function drawCompleteHelices() {
        // After replication complete, show two separate double helices
        const transition = replicationPhase + phaseProgress;
        
        if (transition >= 4) {
            p.push();
            
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(10);
            p.textFont('Space Grotesk');
            p.fill('rgba(100, 255, 150, 0.8)');
            p.text('Original + Complementary', canvasWidth / 2 - 100, canvasHeight / 2 + 150);
            p.text('Original + Complementary', canvasWidth / 2 + 100, canvasHeight / 2 + 150);
            
            p.pop();
        }
    }
    
    function drawDNAInfo() {
        p.push();
        p.fill('rgba(245, 245, 247, 0.95)');
        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        p.textFont('Syne');
        p.textSize(18);
        p.text('DNA Replication', 20, 15);
        
        p.textFont('Space Grotesk');
        p.textSize(12);
        p.fill('rgba(160, 160, 168, 0.95)');
        
        const phases = ['Intact Helix', 'Unwinding', 'Leading Strand', 'Lagging Strand', 'Complete'];
        p.text('Phase: ' + phases[replicationPhase] + ' (' + (phaseProgress * 100).toFixed(0) + '%)', 20, 40);
        p.text('Free Nucleotides: ' + nucleotidePool.length + ' | Base Pairs: ' + strandA.length, 20, 58);
        p.text('Leading: ' + polymeraseA.nucleotidesAdded + ' bp | Lagging: ' + polymeraseB.nucleotidesAdded + ' bp', 20, 76);
        
        p.textSize(10);
        p.fill('rgba(160, 160, 168, 0.5)');
        p.text('Helicase unwinds the double helix. DNA polymerase reads template and synthesizes new strand.', 20, canvasHeight - 25);
        
        p.pop();
    }
    
    function getBaseColor(base) {
        switch(base) {
            case 'A': return 'rgba(100, 200, 255, ';  // Cyan
            case 'T': return 'rgba(255, 100, 50, ';   // Orange
            case 'G': return 'rgba(100, 255, 150, ';  // Green
            case 'C': return 'rgba(255, 150, 100, '; // Coral
            default: return 'rgba(200, 200, 200, ';
        }
    }
    
    function setupControls() {
        const controlsSection = document.getElementById('controls-section');
        controlsSection.innerHTML = '';
        
        let speedGroup = createControlGroup('Speed', 0.3, 2, speed, (val) => {
            speed = val;
        });
        controlsSection.appendChild(speedGroup);
        
        let playBtn = createButton(autoPlay ? '⏸ Pause' : '▶ Play', () => {
            autoPlay = !autoPlay;
            playBtn.textContent = autoPlay ? '⏸ Pause' : '▶ Play';
        });
        controlsSection.appendChild(playBtn);
        
        let bondsBtn = createButton(showBonds ? '👁 Hide Bonds' : '👁 Show Bonds', () => {
            showBonds = !showBonds;
            bondsBtn.textContent = showBonds ? '👁 Hide Bonds' : '👁 Show Bonds';
        });
        controlsSection.appendChild(bondsBtn);
        
        let polyBtn = createButton(showPolymerase ? '👁 Hide Enzymes' : '👁 Show Enzymes', () => {
            showPolymerase = !showPolymerase;
            polyBtn.textContent = showPolymerase ? '👁 Hide Enzymes' : '👁 Show Enzymes';
        });
        controlsSection.appendChild(polyBtn);
    }
    
    this.resetSketch = function() {
        initializeDNA();
        replicationPhase = 0;
        phaseProgress = 0;
        time = 0;
        soundManager.playSuccess();
    };
};

new p5(dnaReplicationSketch);