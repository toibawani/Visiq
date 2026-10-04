// ===== PROTEIN FOLDING (HP MODEL) =====
// Hydrophobic collapse and energy landscape minimization into 3D tertiary native conformation
// Biology: Hydrophobic residues (H, amber) pack into core; Polar residues (P, teal) stay on surface

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'protein-folding',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            temperature:         { value: 298, min: 270, max: 375, step: 5,   label: 'Temperature (T)',        unit: 'K'       },
            hydrophobicAffinity: { value: 2.2, min: 0.5, max: 5.0, step: 0.2, label: 'Hydrophobic Force (ε)', unit: 'kJ/mol' },
            chainLength:         { value: 24,  min: 14,  max: 36,  step: 2,   label: 'Residue Count',          unit: 'residues'}
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
            // ── Color palette ──────────────────────────────────────────
            const AMBER = [232, 160,  76];  // H residue (hydrophobic)
            const TEAL  = [ 45, 212, 191];  // P residue (polar)
            const BIO   = VisualKit.getCategoryRGB('biology');

            // ── State ──────────────────────────────────────────────────
            let residues       = [];
            let draggedResidue = null;
            const bondRestLength = 22;
            // Energy sparkline
            let energyHistory = [];

            function initChain() {
                residues       = [];
                energyHistory  = [];
                const n      = Math.floor(ctx.params.chainLength);
                const startX = p.width * 0.3;
                const startY = p.height * 0.5;

                for (let i = 0; i < n; i++) {
                    const isHydrophobic = (i % 3 === 1) || (i % 5 === 2) || (i % 4 === 0);
                    residues.push({
                        x:      startX + i * (bondRestLength * 0.9),
                        y:      startY + Math.sin(i * 0.6) * 15,
                        vx: 0,  vy: 0,
                        type:   isHydrophobic ? 'H' : 'P',
                        radius: 7
                    });
                }
            }

            initChain();
            ctx.onReset       = initChain;
            ctx.onResize      = initChain;
            ctx.onParamChange = (k) => { if (k === 'chainLength') initChain(); };

            p.draw = function() {
                p.background(7, 9, 15);

                const dt           = ctx.speed;
                const eps          = ctx.params.hydrophobicAffinity;
                const T            = ctx.params.temperature;
                const thermalNoise = Math.max(0.1, (T - 273) * 0.025);

                let hhContacts      = 0;
                let potentialEnergy = 0;

                // ─────────────────────────────────────────────────────
                // 1. Physics
                // ─────────────────────────────────────────────────────
                if (ctx.isPlaying) {
                    // Bond constraints (4 passes for stiffness)
                    for (let iter = 0; iter < 4; iter++) {
                        for (let i = 0; i < residues.length - 1; i++) {
                            const r1   = residues[i];
                            const r2   = residues[i + 1];
                            const dx   = r2.x - r1.x;
                            const dy   = r2.y - r1.y;
                            const dist = Math.hypot(dx, dy) || 0.001;
                            const diff = (dist - bondRestLength) * 0.5;
                            if (r1 !== draggedResidue) { r1.x += (dx / dist) * diff * 0.5; r1.y += (dy / dist) * diff * 0.5; }
                            if (r2 !== draggedResidue) { r2.x -= (dx / dist) * diff * 0.5; r2.y -= (dy / dist) * diff * 0.5; }
                        }
                    }

                    // Non-bonded interactions
                    for (let i = 0; i < residues.length; i++) {
                        const r1 = residues[i];
                        if (r1 === draggedResidue) continue;

                        for (let j = i + 1; j < residues.length; j++) {
                            const r2   = residues[j];
                            const dx   = r2.x - r1.x;
                            const dy   = r2.y - r1.y;
                            const dist = Math.hypot(dx, dy) || 0.001;

                            // Steric repulsion
                            const minDist = (r1.radius + r2.radius) * 1.5;
                            if (dist < minDist) {
                                const repulse = (minDist - dist) * 0.25;
                                r1.x -= (dx / dist) * repulse;
                                r1.y -= (dy / dist) * repulse;
                                r2.x += (dx / dist) * repulse;
                                r2.y += (dy / dist) * repulse;
                            }

                            // H-H attractive collapse
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

                        // Thermal noise
                        r1.x += (Math.random() - 0.5) * thermalNoise * dt;
                        r1.y += (Math.random() - 0.5) * thermalNoise * dt;
                        r1.x  = p.constrain(r1.x, 30, p.width  - 30);
                        r1.y  = p.constrain(r1.y, 30, p.height - 30);
                    }

                    energyHistory.push(potentialEnergy);
                    if (energyHistory.length > 100) energyHistory.shift();
                }

                // ─────────────────────────────────────────────────────
                // 2. Center of mass + Radius of Gyration
                // ─────────────────────────────────────────────────────
                let comX = 0, comY = 0;
                for (const r of residues) { comX += r.x; comY += r.y; }
                comX /= residues.length;
                comY /= residues.length;
                let rgSq = 0;
                for (const r of residues) rgSq += (r.x - comX) ** 2 + (r.y - comY) ** 2;
                const rg = Math.sqrt(rgSq / residues.length) * 0.1;

                // ─────────────────────────────────────────────────────
                // 3. Hydrophobic contact bonds (dashed amber lines)
                // ─────────────────────────────────────────────────────
                p.push();
                if (p.drawingContext?.setLineDash) p.drawingContext.setLineDash([3, 4]);
                p.stroke(AMBER[0], AMBER[1], AMBER[2], 70);
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
                if (p.drawingContext?.setLineDash) p.drawingContext.setLineDash([]);
                p.pop();

                // ─────────────────────────────────────────────────────
                // 4. Peptide backbone (glowing tube)
                // ─────────────────────────────────────────────────────
                p.push();
                p.noFill();
                // Glow pass
                p.stroke(100, 116, 139, 45);
                p.strokeWeight(10);
                p.beginShape();
                for (const r of residues) p.vertex(r.x, r.y);
                p.endShape();
                // Core
                p.stroke(100, 116, 139, 180);
                p.strokeWeight(3.5);
                p.beginShape();
                for (const r of residues) p.vertex(r.x, r.y);
                p.endShape();
                p.pop();

                // ─────────────────────────────────────────────────────
                // 5. Residue beads (glow bodies)
                // ─────────────────────────────────────────────────────
                for (let i = 0; i < residues.length; i++) {
                    const r   = residues[i];
                    const rgb = r.type === 'H' ? AMBER : TEAL;

                    VisualKit.drawGlowBody(p, r.x, r.y, r.radius, rgb, {
                        outerMult:  2.2,  innerMult:  1.4,
                        outerAlpha: r.type === 'H' ? 35 : 22,
                        innerAlpha: r.type === 'H' ? 80 : 55,
                        strokeWidth: 1.2, specular: true
                    });

                    // Residue label
                    p.push();
                    p.noStroke();
                    p.fill(7, 9, 15, 200);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(7.5);
                    p.text(r.type, r.x, r.y);
                    p.pop();
                }

                // ─────────────────────────────────────────────────────
                // 6. Energy sparkline inset (top-right)
                // ─────────────────────────────────────────────────────
                if (energyHistory.length >= 2) {
                    const spkW = 148;
                    const spkH = 52;
                    const spkX = p.width - spkW - 14;
                    const spkY = 14;
                    VisualKit.drawSparkline(
                        p, spkX, spkY, spkW, spkH,
                        energyHistory, AMBER,
                        { label: 'ΔG Energy (kJ/mol)', cornerRadius: 7, textSize: 8.5 }
                    );
                }

                // ─────────────────────────────────────────────────────
                // 7. Telemetry
                // ─────────────────────────────────────────────────────
                let stateName = 'Partially Folded';
                if (T > 345) stateName = 'Denatured (Unfolded)';
                else if (hhContacts >= Math.floor(ctx.params.chainLength * 0.25)) stateName = 'Native Conformation';

                ctx._telemetry = {
                    'Free Energy (ΔG)':   `${potentialEnergy.toFixed(1)} kJ/mol`,
                    'Core H-H Contacts':  `${hhContacts}`,
                    'Radius of Gyration': `${rg.toFixed(2)} nm`,
                    'Folding State':      stateName
                };
                ctx.updateTelemetry();

                // ─────────────────────────────────────────────────────
                // 8. Footer hint
                // ─────────────────────────────────────────────────────
                p.push();
                p.noStroke();
                p.fill(70, 90, 120);
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('Amber (H) = Hydrophobic core  ·  Teal (P) = Polar surface  ·  T > 345 K denatures protein', 16, p.height - 10);
                p.pop();
            };

            // ── Pointer handling ───────────────────────────────────────
            function getPointerPos() {
                if (p.touches && p.touches.length > 0) return { x: p.touches[0].x, y: p.touches[0].y };
                return { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = getPointerPos();
                for (const r of residues) {
                    if (Math.hypot(pos.x - r.x, pos.y - r.y) < 18) {
                        draggedResidue = r;
                        return false;
                    }
                }
            };

            p.mouseDragged = function() {
                if (draggedResidue) {
                    const pos = getPointerPos();
                    draggedResidue.x = p.constrain(pos.x, 20, p.width  - 20);
                    draggedResidue.y = p.constrain(pos.y, 20, p.height - 20);
                    return false;
                }
            };

            p.mouseReleased = function() { draggedResidue = null; };
            p.touchStarted  = p.mousePressed;
            p.touchMoved    = p.mouseDragged;
            p.touchEnded    = p.mouseReleased;
        }
    });

    sim.mount();
    return sim;
};
