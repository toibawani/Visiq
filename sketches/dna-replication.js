// ===== DNA REPLICATION SIMULATION v2.0 =====
// Ultimate molecular biology with CRISPR, codons, proteins, and advanced mechanics

let dnaReplicationSketch = function(p) {
    let canvasWidth = 800;
    let canvasHeight = 600;
    
    let time = 0;
    let replicationPhase = 0; // 0: Intact, 1: Unwinding, 2: Leading, 3: Lagging, 4: Complete, 5: CRISPR Edit
    let phaseProgress = 0;
    let autoPlay = true;
    let speed = 1;
    let showBonds = true;
    let showPolymerase = true;
    let showCodons = true;
    let showProteinSynthesis = true;
    
    let helixSegments = [];
    let nucleotides = [];
    let helixRadius = 40;
    let helixPitch = 80;
    let totalTurns = 3;
    
    let helicase = { x: 0, y: 0, progress: 0, isActive: false };
    let polymeraseA = { x: 0, y: 0, progress: 0, direction: 1 };
    let polymeraseB = { x: 0, y: 0, progress: 0, direction: -1 };
    let crispr = { x: 0, y: 0, progress: 0, isActive: false, targetIndex: 8 };
    
    let strandA = [];
    let strandB = [];
    let newStrandA = [];
    let newStrandB = [];
    let mRNAStrand = [];
    let ribosomes = [];
    let proteins = [];
    let nucleotidePool = [];
    let aminoAcidPool = [];
    let codonMarkers = [];
    let editSite = null;
    
    let hydrogenBonds = [];
    let cellularBackground = [];
    let particleEffects = [];
    
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
        drawCellularBackground();
        drawCellMembrane();
        
        p.background('#050507');
        
        if (autoPlay) {
            phaseProgress += 0.002 * speed;
            if (phaseProgress >= 1) {
                phaseProgress = 0;
                replicationPhase = (replicationPhase + 1) % 6;
                soundManager.playOrganicPulse(150 + replicationPhase * 40, 0.3);
            }
        }
        
        updateDNAStructure();
        updateReplicationMachinery();
        updateNucleotidePairing();
        updateCRISPR();
        updateTranscription();
        updateTranslation();
        updateParticleEffects();
        
        drawNucleotidePool();
        drawAminoAcidPool();
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
        
        if (showCodons) {
            drawCodonMarkers();
        }
        
        drawNewStrands();
        drawCRISPRCas9();
        drawmRNA();
        drawRibosomes();
        
        if (showProteinSynthesis) {
            drawProteins();
        }
        
        drawCompleteHelices();
        drawParticleEffects();
        
        drawDNAInfo();
        
        time += 0.016;
    };
    
    function initializeDNA() {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        strandA = [];
        strandB = [];
        helixSegments = [];
        
        const segmentCount = 24;
        const baseSequenceA = ['A', 'T', 'G', 'C', 'A', 'T', 'G', 'C', 'A', 'T', 'C', 'G', 'A', 'T', 'G', 'C', 'C', 'G', 'A', 'T', 'A', 'T', 'G', 'C'];
        
        for (let i = 0; i < segmentCount; i++) {
            const t = i / segmentCount;
            const angle = t * totalTurns * p.TWO_PI;
            const y = centerY - helixPitch * totalTurns / 2 + t * helixPitch * totalTurns;
            
            const aX = centerX + Math.cos(angle) * helixRadius;
            const baseA = baseSequenceA[i];
            
            strandA.push({
                index: i,
                x: aX,
                y: y,
                baseX: aX,
                baseY: y,
                base: baseA,
                complementBase: getComplement(baseA),
                paired: true,
                brightness: 0.7,
                angle: angle,
                isEdited: false
            });
            
            const bX = centerX + Math.cos(angle + p.PI) * helixRadius;
            const baseB = getComplement(baseA);
            
            strandB.push({
                index: i,
                x: bX,
                y: y,
                baseX: bX,
                baseY: y,
                base: baseB,
                complementBase: baseA,
                paired: true,
                brightness: 0.7,
                angle: angle + p.PI,
                isEdited: false
            });
            
            helixSegments.push({
                index: i,
                aX: strandA[i].x,
                aY: strandA[i].y,
                bX: strandB[i].x,
                bY: strandB[i].y,
                connected: true
            });
        }
        
        // Cellular background particles
        cellularBackground = [];
        for (let i = 0; i < 100; i++) {
            cellularBackground.push({
                x: p.random(canvasWidth),
                y: p.random(canvasHeight),
                size: p.random(1, 3),
                opacity: p.random(0.1, 0.3),
                vx: p.random(-0.3, 0.3),
                vy: p.random(-0.3, 0.3)
            });
        }
        
        // Nucleotide pool
        nucleotidePool = [];
        for (let i = 0; i < 80) {
            nucleotidePool.push({
                x: p.random(canvasWidth * 0.15, canvasWidth * 0.85),
                y: p.random(canvasHeight * 0.1, canvasHeight * 0.9),
                vx: p.random(-1.5, 1.5),
                vy: p.random(-1.5, 1.5),
                base: p.random(['A', 'T', 'G', 'C']),
                age: 0,
                incorporated: false,
                brightness: p.random(0.5, 0.9),
                trail: []
            });
        }
        
        // Amino acid pool
        aminoAcidPool = [];
        for (let i = 0; i < 60; i++) {
            aminoAcidPool.push({
                x: p.random(canvasWidth * 0.15, canvasWidth * 0.85),
                y: p.random(canvasHeight * 0.1, canvasHeight * 0.9),
                vx: p.random(-1.2, 1.2),
                vy: p.random(-1.2, 1.2),
                type: p.random(['Met', 'Phe', 'Leu', 'Ser', 'Pro', 'Thr', 'Ala', 'Gly', 'Val', 'Ile']),
                age: 0,
                brightness: p.random(0.4, 0.8),
                trail: []
            });
        }
        
        // Ribosomes
        ribosomes = [];
        for (let i = 0; i < 3; i++) {
            ribosomes.push({
                x: canvasWidth / 2 - 100 + i * 50,
                y: canvasHeight / 2 + 150,
                progress: 0,
                isActive: false,
                codonIndex: 0,
                protein: []
            });
        }
        
        // Polymerases
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
        
        helicase = {
            x: canvasWidth / 2,
            y: canvasHeight / 2 - helixPitch * totalTurns / 2,
            progress: 0,
            isActive: false,
            speed: 0.4
        };
        
        crispr = {
            x: canvasWidth / 2,
            y: canvasHeight / 2 - helixPitch * totalTurns / 2 - 80,
            progress: 0,
            isActive: false,
            targetIndex: 8,
            cutMade: false
        };
        
        newStrandA = [];
        newStrandB = [];
        mRNAStrand = [];
        proteins = [];
    }
    
    function getComplement(base) {
        switch(base) {
            case 'A': return 'T';
            case 'T': return 'A';
            case 'G': return 'C';
            case 'C': return 'G';
            default: return 'N';
        }
    }
    
    function updateDNAStructure() {
        const transition = replicationPhase + phaseProgress;
        
        switch(replicationPhase) {
            case 0: // Intact helix
                helixSegments.forEach((segment, i) => {
                    segment.connected = 1;
                    strandA[i].paired = true;
                    strandB[i].paired = true;
                });
                break;
                
            case 1: // Unwinding by helicase
                const unwindAmount = phaseProgress;
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
                break;
                
            case 2: // Leading strand
                const synthProgress = phaseProgress;
                polymeraseA.active = true;
                polymeraseA.progress = synthProgress;
                polymeraseA.nucleotidesAdded = Math.floor(synthProgress * strandA.length);
                
                newStrandA = strandA.slice(0, polymeraseA.nucleotidesAdded).map((nuc, idx) => ({
                    x: nuc.x + 60,
                    y: nuc.y,
                    base: nuc.complementBase,
                    brightness: 0.8,
                    age: idx
                }));
                break;
                
            case 3: // Lagging strand
                const lagProgress = phaseProgress;
                polymeraseB.active = true;
                polymeraseB.progress = lagProgress;
                polymeraseB.nucleotidesAdded = Math.floor(lagProgress * strandB.length);
                
                newStrandB = strandB.slice(0, polymeraseB.nucleotidesAdded).map((nuc, idx) => ({
                    x: nuc.x - 60,
                    y: nuc.y,
                    base: nuc.complementBase,
                    brightness: 0.6 + Math.sin(idx * 0.3) * 0.2,
                    age: idx
                }));
                break;
                
            case 4: // Transcription to mRNA
                if (phaseProgress < 0.5) {
                    const transcriptProgress = phaseProgress * 2;
                    mRNAStrand = strandA.slice(0, Math.floor(transcriptProgress * strandA.length)).map((nuc, idx) => {
                        const rnaBase = nuc.complementBase === 'T' ? 'U' : nuc.complementBase;
                        return {
                            x: nuc.x - 100,
                            y: nuc.y - 80 + Math.sin(idx * 0.2) * 10,
                            base: rnaBase,
                            brightness: 0.7,
                            age: idx
                        };
                    });
                } else {
                    mRNAStrand = strandA.map((nuc, idx) => {
                        const rnaBase = nuc.complementBase === 'T' ? 'U' : nuc.complementBase;
                        return {
                            x: nuc.x - 100,
                            y: nuc.y - 80 + Math.sin(idx * 0.2) * 10,
                            base: rnaBase,
                            brightness: 0.7,
                            age: idx
                        };
                    });
                    
                    // Activate ribosomes
                    ribosomes.forEach((ribo, i) => {
                        ribo.isActive = true;
                        ribo.progress = (phaseProgress - 0.5) * 2;
                    });
                }
                break;
                
            case 5: // CRISPR gene editing
                crispr.isActive = true;
                crispr.progress = phaseProgress;
                crispr.x = strandA[crispr.targetIndex].x;
                crispr.y = strandA[crispr.targetIndex].y - 60;
                
                if (phaseProgress > 0.6 && !crispr.cutMade) {
                    strandA[crispr.targetIndex].isEdited = true;
                    strandB[crispr.targetIndex].isEdited = true;
                    crispr.cutMade = true;
                    soundManager.playChime(600, 0.5);
                }
                break;
        }
    }
    
    function updateReplicationMachinery() {
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
            
            nucleotide.vx += p.random(-0.2, 0.2);
            nucleotide.vy += p.random(-0.2, 0.2);
            
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
            
            nucleotide.trail.push({ x: nucleotide.x, y: nucleotide.y });
            if (nucleotide.trail.length > 20) nucleotide.trail.shift();
            
            nucleotide.age++;
            if (nucleotide.age > 300) {
                nucleotide.brightness *= 0.99;
            }
        });
        
        aminoAcidPool.forEach(aa => {
            aa.x += aa.vx * 0.3;
            aa.y += aa.vy * 0.3;
            
            aa.vx *= 0.98;
            aa.vy *= 0.98;
            
            aa.vx += p.random(-0.15, 0.15);
            aa.vy += p.random(-0.15, 0.15);
            
            if (aa.x < 50) {
                aa.x = 50;
                aa.vx *= -1;
            }
            if (aa.x > canvasWidth - 50) {
                aa.x = canvasWidth - 50;
                aa.vx *= -1;
            }
            if (aa.y < 50) {
                aa.y = 50;
                aa.vy *= -1;
            }
            if (aa.y > canvasHeight - 50) {
                aa.y = canvasHeight - 50;
                aa.vy *= -1;
            }
            
            aa.trail.push({ x: aa.x, y: aa.y });
            if (aa.trail.length > 15) aa.trail.shift();
            
            aa.age++;
        });
    }
    
    function updateCRISPR() {
        // CRISPR updates handled in updateDNAStructure
    }
    
    function updateTranscription() {
        // mRNA updates handled in updateDNAStructure
    }
    
    function updateTranslation() {
        ribosomes.forEach(ribo => {
            if (ribo.isActive && mRNAStrand.length > 0) {
                ribo.codonIndex = Math.floor(ribo.progress * mRNAStrand.length / 3) * 3;
                
                if (ribo.codonIndex + 2 < mRNAStrand.length) {
                    if (p.random() < 0.3) {
                        const codon = mRNAStrand[ribo.codonIndex].base + 
                                    mRNAStrand[ribo.codonIndex + 1].base + 
                                    mRNAStrand[ribo.codonIndex + 2].base;
                        
                        const aa = codonToAminoAcid(codon);
                        ribo.protein.push({
                            type: aa,
                            age: 0,
                            brightness: 0.8
                        });
                    }
                }
            }
        });
    }
    
    function updateParticleEffects() {
        cellularBackground.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.x < 0) particle.x = canvasWidth;
            if (particle.x > canvasWidth) particle.x = 0;
            if (particle.y < 0) particle.y = canvasHeight;
            if (particle.y > canvasHeight) particle.y = 0;
        });
    }
    
    function codonToAminoAcid(codon) {
        const codonTable = {
            'AUG': 'Met', 'UUU': 'Phe', 'UUC': 'Phe', 'UUA': 'Leu', 'UUG': 'Leu',
            'UCU': 'Ser', 'UCC': 'Ser', 'UCA': 'Ser', 'UCG': 'Ser', 'UAU': 'Tyr',
            'UAC': 'Tyr', 'UGU': 'Cys', 'UGC': 'Cys', 'UGG': 'Trp', 'CUU': 'Leu',
            'CUC': 'Leu', 'CUA': 'Leu', 'CUG': 'Leu', 'CCU': 'Pro', 'CCC': 'Pro',
            'CCA': 'Pro', 'CCG': 'Pro', 'CAU': 'His', 'CAC': 'His', 'CAA': 'Gln',
            'CAG': 'Gln', 'CGU': 'Arg', 'CGC': 'Arg', 'CGA': 'Arg', 'CGG': 'Arg',
            'AUU': 'Ile', 'AUC': 'Ile', 'AUA': 'Ile', 'ACU': 'Thr', 'ACC': 'Thr',
            'ACA': 'Thr', 'ACG': 'Thr', 'AAU': 'Asn', 'AAC': 'Asn', 'AAA': 'Lys',
            'AAG': 'Lys', 'AGU': 'Ser', 'AGC': 'Ser', 'AGA': 'Arg', 'AGG': 'Arg',
            'GUU': 'Val', 'GUC': 'Val', 'GUA': 'Val', 'GUG': 'Val', 'GCU': 'Ala',
            'GCC': 'Ala', 'GCA': 'Ala', 'GCG': 'Ala', 'GAU': 'Asp', 'GAC': 'Asp',
            'GAA': 'Glu', 'GAG': 'Glu', 'GGU': 'Gly', 'GGC': 'Gly', 'GGA': 'Gly',
            'GGG': 'Gly', 'UAA': 'Stop', 'UAG': 'Stop', 'UGA': 'Stop'
        };
        return codonTable[codon] || 'Unk';
    }
    
    function drawCellularBackground() {
        p.push();
        p.stroke('rgba(50, 100, 150, 0.1)');
        p.strokeWeight(0.5);
        
        cellularBackground.forEach(particle => {
            p.point(particle.x, particle.y);
        });
        
        p.pop();
    }
    
    function drawCellMembrane() {
        p.push();
        p.stroke('rgba(0, 217, 255, 0.3)');
        p.strokeWeight(2);
        p.noFill();
        p.ellipse(canvasWidth / 2, canvasHeight / 2, canvasWidth * 0.7, canvasHeight * 0.8);
        p.pop();
    }
    
    function drawNucleotidePool() {
        p.push();
        
        nucleotidePool.forEach(nucleotide => {
            // Trail
            for (let i = 0; i < nucleotide.trail.length; i++) {
                const t = i / nucleotide.trail.length;
                const opacity = t * 0.15;
                p.stroke('rgba(100, 200, 255, ' + opacity + ')');
                p.strokeWeight(0.5);
                
                if (i < nucleotide.trail.length - 1) {
                    p.line(
                        nucleotide.trail[i].x, nucleotide.trail[i].y,
                        nucleotide.trail[i + 1].x, nucleotide.trail[i + 1].y
                    );
                }
            }
            
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
            
            const baseColor = getBaseColor(nucleotide.base);
            p.fill(baseColor + (nucleotide.brightness * 0.7) + ')');
            p.noStroke();
            p.ellipse(nucleotide.x, nucleotide.y, 3);
            
            p.fill(baseColor + '0.9)');
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(6);
            p.textFont('IBM Plex Mono');
            p.text(nucleotide.base, nucleotide.x, nucleotide.y);
        });
        
        p.pop();
    }
    
    function drawAminoAcidPool() {
        p.push();
        
        aminoAcidPool.forEach(aa => {
            // Trail
            for (let i = 0; i < aa.trail.length; i++) {
                const t = i / aa.trail.length;
                const opacity = t * 0.1;
                p.stroke('rgba(200, 100, 150, ' + opacity + ')');
                p.strokeWeight(0.5);
                
                if (i < aa.trail.length - 1) {
                    p.line(
                        aa.trail[i].x, aa.trail[i].y,
                        aa.trail[i + 1].x, aa.trail[i + 1].y
                    );
                }
            }
            
            const glowGrad = p.drawingContext.createRadialGradient(
                aa.x, aa.y, 0,
                aa.x, aa.y, 5
            );
            glowGrad.addColorStop(0, 'rgba(200, 100, 150, ' + (aa.brightness * 0.3) + ')');
            glowGrad.addColorStop(1, 'rgba(200, 100, 150, 0)');
            
            p.drawingContext.fillStyle = glowGrad;
            p.drawingContext.beginPath();
            p.drawingContext.arc(aa.x, aa.y, 5, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            p.fill('rgba(200, 100, 150, ' + (aa.brightness * 0.8) + ')');
            p.noStroke();
            p.ellipse(aa.x, aa.y, 3);
            
            p.fill('rgba(200, 100, 150, 0.9)');
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(5);
            p.textFont('IBM Plex Mono');
            p.text(aa.type.substring(0, 1), aa.x, aa.y);
        });
        
        p.pop();
    }
    
    function drawBackgroundStrands() {
        p.push();
        
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
        
        strandA.forEach((nucA, i) => {
            if (i < strandB.length) {
                const nucB = strandB[i];
                
                const baseColor = getBaseColor(nucA.base);
                let colorStr = baseColor;
                
                if (nucA.isEdited) {
                    p.fill('rgba(255, 100, 50, ' + (nucA.brightness * 0.9) + ')');
                } else {
                    const match = baseColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),/);
                    if (match) {
                        p.fill('rgba(' + match[1] + ', ' + match[2] + ', ' + match[3] + ', ' + (nucA.brightness * 0.8) + ')');
                    }
                }
                
                p.noStroke();
                p.ellipse(nucA.x, nucA.y, 5);
                
                const compColor = getBaseColor(nucB.base);
                const compMatch = compColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),/);
                if (compMatch) {
                    p.fill('rgba(' + compMatch[1] + ', ' + compMatch[2] + ', ' + compMatch[3] + ', ' + (nucB.brightness * 0.8) + ')');
                }
                
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
        const transition = replicationPhase + phaseProgress;
        if (transition < 1 || transition >= 2) return;
        
        p.push();
        
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        const forkY = centerY - helixPitch * totalTurns / 2 + (transition - 1) * helixPitch * totalTurns;
        
        p.stroke('rgba(0, 217, 255, 0.7)');
        p.strokeWeight(3);
        
        p.line(centerX - 40, forkY, centerX, forkY + 40);
        p.line(centerX + 40, forkY, centerX, forkY + 40);
        p.line(centerX, forkY, centerX, forkY + 40);
        
        p.pop();
    }
    
    function drawHelicase() {
        if (!helicase.isActive) return;
        
        p.push();
        
        const helicaseY = helicase.y + helicase.progress * helixPitch * totalTurns;
        
        p.fill('rgba(255, 100, 50, 0.6)');
        p.stroke('rgba(255, 100, 50, 0.8)');
        p.strokeWeight(2);
        
        p.beginShape();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * p.TWO_PI;
            const x = helicase.x + Math.cos(angle) * 15;
            const y = helicaseY + Math.sin(angle) * 15;
            p.vertex(x, y);
        }
        p.endShape(p.CLOSE);
        
        const helicaseGlow = p.drawingContext.createRadialGradient(
            helicase.x, helicaseY, 0,
            helicase.x, helicaseY, 30
        );
        helicaseGlow.addColorStop(0, 'rgba(255, 100, 50, 0.2)');
        helicaseGlow.addColorStop(1, 'rgba(255, 100, 50, 0)');
        
        p.drawingContext.fillStyle = helicaseGlow;
        p.drawingContext.beginPath();
        p.drawingContext.arc(helicase.x, helicaseY, 30, 0, p.TWO_PI);
        p.drawingContext.fill();
        
        p.pop();
    }
    
    function drawPolymerases() {
        if (!showPolymerase) return;
        
        p.push();
        
        if (polymeraseA.active) {
            drawPolymerase(
                polymeraseA.x,
                polymeraseA.y + polymeraseA.progress * helixPitch * totalTurns,
                'rgba(100, 200, 255, 0.7)',
                'Pol III',
                'Leading'
            );
        }
        
        if (polymeraseB.active) {
            drawPolymerase(
                polymeraseB.x,
                polymeraseB.y + polymeraseB.progress * helixPitch * totalTurns,
                'rgba(255, 150, 100, 0.7)',
                'Pol III',
                'Lagging'
            );
        }
        
        p.pop();
    }
    
    function drawPolymerase(x, y, color, name, type) {
        p.push();
        p.fill(color);
        p.stroke(color.replace('0.7', '0.9'));
        p.strokeWeight(2);
        
        p.beginShape();
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * p.TWO_PI;
            const radius = 12 + Math.sin(angle * 3 + time * 0.1) * 3;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            p.vertex(px, py);
        }
        p.endShape(p.CLOSE);
        
        const polyGlow = p.drawingContext.createRadialGradient(x, y, 0, x, y, 35);
        polyGlow.addColorStop(0, color.replace('0.7', '0.3'));
        polyGlow.addColorStop(1, color.replace('0.7', '0'));
        
        p.drawingContext.fillStyle = polyGlow;
        p.drawingContext.beginPath();
        p.drawingContext.arc(x, y, 35, 0, p.TWO_PI);
        p.drawingContext.fill();
        
        p.fill('rgba(245, 245, 247, 0.8)');
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(8);
        p.textFont('IBM Plex Mono');
        p.text(name, x, y - 25);
        p.textSize(6);
        p.text(type, x, y + 20);
        
        p.pop();
    }
    
    function drawCodonMarkers() {
        if (!showCodons || mRNAStrand.length < 3) return;
        
        p.push();
        p.noFill();
        p.stroke('rgba(255, 150, 100, 0.4)');
        p.strokeWeight(2);
        
        for (let i = 0; i < mRNAStrand.length; i += 3) {
            if (i + 2 < mRNAStrand.length) {
                const avgX = (mRNAStrand[i].x + mRNAStrand[i + 1].x + mRNAStrand[i + 2].x) / 3;
                const avgY = (mRNAStrand[i].y + mRNAStrand[i + 1].y + mRNAStrand[i + 2].y) / 3;
                
                p.rect(avgX - 10, avgY - 8, 20, 16);
            }
        }
        
        p.pop();
    }
    
    function drawNewStrands() {
        p.push();
        
        // New strand A
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
        
        if (newStrandA.length > 1) {
            p.stroke('rgba(100, 255, 150, 0.6)');
            p.strokeWeight(2);
            p.beginShape();
            newStrandA.forEach(nuc => {
                p.vertex(nuc.x, nuc.y);
            });
            p.endShape();
        }
        
        // New strand B
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
    
    function drawCRISPRCas9() {
        if (!crispr.isActive) return;
        
        p.push();
        
        // CRISPR complex
        p.fill('rgba(255, 150, 100, 0.7)');
        p.stroke('rgba(255, 150, 100, 0.9)');
        p.strokeWeight(2);
        
        // Draw complex shape
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * p.TWO_PI + time * 0.03;
            const x = crispr.x + Math.cos(angle) * 20;
            const y = crispr.y + Math.sin(angle) * 20;
            p.ellipse(x, y, 8);
        }
        
        // Center
        p.fill('rgba(255, 180, 150, 0.9)');
        p.ellipse(crispr.x, crispr.y, 12);
        
        // Glow
        const crisprGlow = p.drawingContext.createRadialGradient(
            crispr.x, crispr.y, 0,
            crispr.x, crispr.y, 40
        );
        crisprGlow.addColorStop(0, 'rgba(255, 150, 100, 0.3)');
        crisprGlow.addColorStop(1, 'rgba(255, 150, 100, 0)');
        
        p.drawingContext.fillStyle = crisprGlow;
        p.drawingContext.beginPath();
        p.drawingContext.arc(crispr.x, crispr.y, 40, 0, p.TWO_PI);
        p.drawingContext.fill();
        
        p.fill('rgba(245, 245, 247, 0.7)');
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(8);
        p.textFont('IBM Plex Mono');
        p.text('CRISPR', crispr.x, crispr.y);
        
        p.pop();
    }
    
    function drawmRNA() {
        if (mRNAStrand.length === 0) return;
        
        p.push();
        
        p.stroke('rgba(255, 150, 100, 0.5)');
        p.strokeWeight(2);
        p.noFill();
        p.beginShape();
        mRNAStrand.forEach((nuc, i) => {
            p.vertex(nuc.x, nuc.y);
        });
        p.endShape();
        
        mRNAStrand.forEach((nuc, i) => {
            const baseColor = getBaseColor(nuc.base);
            p.fill(baseColor + (nuc.brightness * 0.8) + ')');
            p.noStroke();
            p.ellipse(nuc.x, nuc.y, 4);
        });
        
        p.pop();
    }
    
    function drawRibosomes() {
        p.push();
        
        ribosomes.forEach((ribo, idx) => {
            if (!ribo.isActive) return;
            
            ribo.x = canvasWidth / 2 - 100 + ribo.progress * 200;
            
            // Ribosome
            p.fill('rgba(100, 200, 150, 0.7)');
            p.stroke('rgba(100, 200, 150, 0.9)');
            p.strokeWeight(2);
            p.ellipse(ribo.x, ribo.y, 25, 20);
            
            // Sub-units
            p.fill('rgba(120, 220, 170, 0.6)');
            p.ellipse(ribo.x - 8, ribo.y - 3, 12, 12);
            p.ellipse(ribo.x + 8, ribo.y + 3, 12, 12);
            
            // Glow
            const riboGlow = p.drawingContext.createRadialGradient(
                ribo.x, ribo.y, 0,
                ribo.x, ribo.y, 35
            );
            riboGlow.addColorStop(0, 'rgba(100, 200, 150, 0.15)');
            riboGlow.addColorStop(1, 'rgba(100, 200, 150, 0)');
            
            p.drawingContext.fillStyle = riboGlow;
            p.drawingContext.beginPath();
            p.drawingContext.arc(ribo.x, ribo.y, 35, 0, p.TWO_PI);
            p.drawingContext.fill();
            
            p.fill('rgba(245, 245, 247, 0.6)');
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(7);
            p.textFont('IBM Plex Mono');
            p.text('80S', ribo.x, ribo.y);
        });
        
        p.pop();
    }
    
    function drawProteins() {
        if (!showProteinSynthesis) return;
        
        p.push();
        
        proteins.forEach((protein, idx) => {
            protein.forEach((aa, i) => {
                const x = canvasWidth / 2 + (idx - 1) * 80;
                const y = canvasHeight / 2 + 100 + i * 8;
                
                p.fill('rgba(150, 200, 255, ' + (aa.brightness * 0.8) + ')');
                p.noStroke();
                p.ellipse(x, y, 5);
            });
        });
        
        p.pop();
    }
    
    function drawCompleteHelices() {
        const transition = replicationPhase + phaseProgress;
        
        if (transition >= 4) {
            p.push();
            
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(9);
            p.textFont('Space Grotesk');
            p.fill('rgba(100, 255, 150, 0.7)');
            p.text('Twin Helices', canvasWidth / 2 - 100, canvasHeight / 2 + 180);
            p.text('mRNA (Protein Code)', canvasWidth / 2, canvasHeight / 2 + 200);
            p.text('Proteins (Products)', canvasWidth / 2 + 100, canvasHeight / 2 + 180);
            
            p.pop();
        }
    }
    
    function drawParticleEffects() {
        // Particle effects drawn inline with other elements
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
        
        const phases = ['Intact Helix', 'Unwinding', 'Leading Strand', 'Lagging Strand', 'Transcription', 'CRISPR Gene Edit'];
        p.text('Phase: ' + phases[replicationPhase] + ' (' + (phaseProgress * 100).toFixed(0) + '%)', 20, 40);
        p.text('Base Pairs: ' + strandA.length + ' | Free Nucleotides: ' + nucleotidePool.length, 20, 58);
        p.text('Leading: ' + polymeraseA.nucleotidesAdded + ' bp | Lagging: ' + polymeraseB.nucleotidesAdded + ' bp', 20, 76);
        p.text('mRNA Length: ' + mRNAStrand.length + ' | Amino Acids Synthesized: ' + (ribosomes.reduce((a, b) => a + b.protein.length, 0)), 20, 94);
        
        p.textSize(10);
        p.fill('rgba(160, 160, 168, 0.5)');
        p.text('Helicase unwinds DNA. Polymerase synthesizes new strands. mRNA is transcribed and translated into proteins.', 20, canvasHeight - 25);
        
        p.pop();
    }
    
    function getBaseColor(base) {
        switch(base) {
            case 'A': return 'rgba(100, 200, 255, ';
            case 'T': return 'rgba(255, 100, 50, ';
            case 'U': return 'rgba(255, 150, 100, ';
            case 'G': return 'rgba(100, 255, 150, ';
            case 'C': return 'rgba(255, 150, 100, ';
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
        
        let codonBtn = createButton(showCodons ? '👁 Hide Codons' : '👁 Show Codons', () => {
            showCodons = !showCodons;
            codonBtn.textContent = showCodons ? '👁 Hide Codons' : '👁 Show Codons';
        });
        controlsSection.appendChild(codonBtn);
        
        let proteinBtn = createButton(showProteinSynthesis ? '👁 Hide Proteins' : '👁 Show Proteins', () => {
            showProteinSynthesis = !showProteinSynthesis;
            proteinBtn.textContent = showProteinSynthesis ? '👁 Hide Proteins' : '👁 Show Proteins';
        });
        controlsSection.appendChild(proteinBtn);
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