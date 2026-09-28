// ===== PROTEIN FOLDING (HP MODEL) =====
// Hydrophobic collapse and energy landscape minimization into 3D tertiary native conformation
// Biology: Hydrophobic residues (H, amber) pack into core; Polar residues (P, teal) stay on surface

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'protein-folding',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            temperature: { value: 298, min: 270, max: 375, step: 5, label: 'Temperature (T)', unit: 'K' },
            hydrophobicAffinity: { value: 2.2, min: 0.5, max: 5.0, step: 0.2, label: 'Hydrophobic Force (ε)', unit: 'kJ/mol' },
            chainLength: { value: 24, min: 14, max: 36, step: 2, label: 'Residue Count', unit: 'residues' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Free Energy (ΔG)': '0.0 kJ/mol',
                'Core H-H Contacts': '0',
                'Radius of Gyration': '0.0 nm',
                'Folding State': 'Native State'
            };
        },
        setup(p, ctx) {
            let residues = [];
            let draggedResidue = null;
            const bondRestLength = 22;

            function initChain() {
                residues = [];
                const n = Math.floor(ctx.params.chainLength);
                const startX = p.width * 0.3;
                const startY = p.height * 0.5;

                // Alternate sequence with hydrophobic core pattern: P-H-P-P-H-H-P-H...
                for (let i = 0; i < n; i++) {
                    const isHydrophobic = (i % 3 === 1) || (i % 5 === 2) || (i % 4 === 0);
                    residues.push({
                        x: startX + i * (bondRestLength * 0.9),
                        y: startY + Math.sin(i * 0.6) * 15,
                        vx: 0,
                        vy: 0,
                        type: isHydrophobic ? 'H' : 'P', // H = Hydrophobic (Amber), P = Polar (Teal)
                        color: isHydrophobic ? '#e8a04c' : '#2dd4bf',
                        radius: 7
                    });
                }
            }

            initChain();
            ctx.onReset = initChain;
            ctx.onResize = initChain;
            ctx.onParamChange = (k) => {
                if (k === 'chainLength') initChain();
            };

            p.draw = function() {
                p.background(7, 9, 15);

                const dt = ctx.speed;
                const eps = ctx.params.hydrophobicAffinity;
                const T = ctx.params.temperature;
                const thermalNoise = Math.max(0.1, (T - 273) * 0.025);

                let hhContacts = 0;
                let potentialEnergy = 0;

                // Physics update: spring bonds + hydrophobic attraction + thermal agitation
                if (ctx.isPlaying) {
                    // 1. Bond length constraints between adjacent residues (peptide backbone)
                    for (let iter = 0; iter < 4; iter++) {
                        for (let i = 0; i < residues.length - 1; i++) {
                            const r1 = residues[i];
                            const r2 = residues[i + 1];
                            const dx = r2.x - r1.x;
                            const dy = r2.y - r1.y;
                            const dist = Math.hypot(dx, dy) || 0.001;
                            const diff = (dist - bondRestLength) * 0.5;

                            if (r1 !== draggedResidue) {
                                r1.x += (dx / dist) * diff * 0.5;
                                r1.y += (dy / dist) * diff * 0.5;
                            }
                            if (r2 !== draggedResidue) {
                                r2.x -= (dx / dist) * diff * 0.5;
                                r2.y -= (dy / dist) * diff * 0.5;
                            }
                        }
                    }

                    // 2. Non-bonded pairwise interactions
                    for (let i = 0; i < residues.length; i++) {
                        const r1 = residues[i];
                        if (r1 === draggedResidue) continue;

                        for (let j = i + 1; j < residues.length; j++) {
                            const r2 = residues[j];
                            const dx = r2.x - r1.x;
                            const dy = r2.y - r1.y;
                            const dist = Math.hypot(dx, dy) || 0.001;

                            // Steric repulsion (Pauli exclusion / hard core)
                            const minDist = (r1.radius + r2.radius) * 1.5;
                            if (dist < minDist) {
                                const repulse = (minDist - dist) * 0.25;
                                r1.x -= (dx / dist) * repulse;
                                r1.y -= (dy / dist) * repulse;
                                r2.x += (dx / dist) * repulse;
                                r2.y += (dy / dist) * repulse;
                            }

                            // Hydrophobic-Hydrophobic attractive collapse (only non-adjacent residues)
                            if (Math.abs(i - j) > 1 && r1.type === 'H' && r2.type === 'H') {
                                const optimalContact = bondRestLength * 1.35;
                                if (dist < optimalContact * 2.2) {
                                    const attract = (dist - optimalContact) * 0.04 * eps;
                                    r1.x += (dx / dist) * attract;
                                    r1.y += (dy / dist) * attract;
                                    r2.x -= (dx / dist) * attract;
                                    r2.y -= (dy / dist) * attract;

                                    if (dist < optimalContact * 1.4) {
                                        hhContacts++;
                                        potentialEnergy -= eps;
                                    }
                                }
                            }
                        }

                        // Thermal brownian motion (denatures above ~340K)
                        r1.x += (Math.random() - 0.5) * thermalNoise * dt;
                        r1.y += (Math.random() - 0.5) * thermalNoise * dt;

                        // Containment inside canvas
                        r1.x = p.constrain(r1.x, 30, p.width - 30);
                        r1.y = p.constrain(r1.y, 30, p.height - 30);
                    }
                }

                // Calculate center of mass and radius of gyration Rg
                let comX = 0, comY = 0;
                for (const r of residues) {
                    comX += r.x;
                    comY += r.y;
                }
                comX /= residues.length;
                comY /= residues.length;

                let rgSq = 0;
                for (const r of residues) {
                    rgSq += (r.x - comX) ** 2 + (r.y - comY) ** 2;
                }
                const rg = Math.sqrt(rgSq / residues.length) * 0.1; // scale to nm

                // 1. Draw Hydrophobic Contact Bonds (amber dashed lines)
                p.stroke('rgba(232, 160, 76, 0.4)');
                p.strokeWeight(1.2);
                for (let i = 0; i < residues.length; i++) {
                    const r1 = residues[i];
                    if (r1.type !== 'H') continue;
                    for (let j = i + 2; j < residues.length; j++) {
                        const r2 = residues[j];
                        if (r2.type === 'H' && Math.hypot(r1.x - r2.x, r1.y - r2.y) < bondRestLength * 1.9) {
                            p.line(r1.x, r1.y, r2.x, r2.y);
                        }
                    }
                }

                // 2. Draw Peptide Backbone
                p.stroke('#64748b');
                p.strokeWeight(3);
                p.noFill();
                p.beginShape();
                for (let i = 0; i < residues.length; i++) {
                    p.vertex(residues[i].x, residues[i].y);
                }
                p.endShape();

                // 3. Draw Residues (Beads)
                for (let i = 0; i < residues.length; i++) {
                    const r = residues[i];
                    p.fill(r.color);
                    p.stroke('#07090f');
                    p.strokeWeight(1.5);
                    p.circle(r.x, r.y, r.radius * 2);

                    p.fill('#07090f');
                    p.noStroke();
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(8);
                    p.text(r.type, r.x, r.y);
                }

                // State determination
                let stateName = 'Partially Folded';
                if (T > 345) stateName = 'Denatured (Unfolded)';
                else if (hhContacts >= Math.floor(ctx.params.chainLength * 0.25)) stateName = 'Native Conformation (Folded)';

                // Telemetry
                ctx._telemetry = {
                    'Free Energy (ΔG)': `${potentialEnergy.toFixed(1)} kJ/mol`,
                    'Core H-H Contacts': `${hhContacts}`,
                    'Radius of Gyration': `${rg.toFixed(2)} nm`,
                    'Folding State': stateName
                };
                ctx.updateTelemetry();

                // Legend
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Amber (H) = Hydrophobic (Core) • Teal (P) = Polar (Surface) • Heat > 345K denatures protein', 16, p.height - 14);
            };

            function getPointerPos() {
                if (p.touches && p.touches.length > 0) return { x: p.touches[0].x, y: p.touches[0].y };
                return { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = getPointerPos();
                for (let i = 0; i < residues.length; i++) {
                    const r = residues[i];
                    if (Math.hypot(pos.x - r.x, pos.y - r.y) < 18) {
                        draggedResidue = r;
                        return false;
                    }
                }
            };

            p.mouseDragged = function() {
                if (draggedResidue) {
                    const pos = getPointerPos();
                    draggedResidue.x = p.constrain(pos.x, 20, p.width - 20);
                    draggedResidue.y = p.constrain(pos.y, 20, p.height - 20);
                    return false;
                }
            };

            p.mouseReleased = function() {
                draggedResidue = null;
            };
        }
    });

    sim.mount();
    return sim;
};
