// ===== MAGNETIC FIELD & LORENTZ FORCE =====
// Dipole magnetic field lines and charged particle trajectory integration
// Physics: Lorentz force F = q(v × B) causing cyclotron curvature and magnetic mirroring

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'magnetic-field',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            fieldStrength: { value: 3.0, min: 0.5, max: 8.0, step: 0.5, label: 'Magnetic Moment (M)', unit: 'T·m³' },
            particleCharge: { value: 1, min: -1, max: 1, step: 2, label: 'Particle Charge (q)', unit: 'e' },
            particleSpeed: { value: 3.5, min: 1.0, max: 7.0, step: 0.5, label: 'Particle Speed (v)', unit: 'km/s' },
            emissionRate: { value: 3, min: 1, max: 6, step: 1, label: 'Emitter Influx', unit: 'p/s' },
            showVectors: { value: 1, min: 0, max: 1, step: 1, label: 'Show Vectors', unit: '' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Lorentz Force (F)': '0.00 pN',
                'Cyclotron Radius': '0.0 px',
                'Active Particles': '0',
                'Field at Center': '0.00 T'
            };
        },
        setup(p, ctx) {
            let magnet = { x: 0, y: 0, vx: 0, vy: 0, length: 110, angle: 0 };
            let particles = [];
            let fieldGrid = [];
            let isDraggingMagnet = false;
            let forceHistory = [];
            const dragTracker = VisualKit.createDragTracker({ multiplier: 0.85, maxSpeed: 16 });

            function updateMagnetPos() {
                magnet.x = p.width * 0.5;
                magnet.y = p.height * 0.5;
                magnet.vx = 0;
                magnet.vy = 0;
                computeFieldLines();
            }

            function computeFieldLines() {
                fieldGrid = [];
                const step = 35;
                for (let x = 20; x < p.width; x += step) {
                    for (let y = 20; y < p.height; y += step) {
                        fieldGrid.push({ x, y });
                    }
                }
            }

            function getBField(px, py) {
                const halfL = magnet.length * 0.5;
                const nx = magnet.x + Math.cos(magnet.angle) * halfL;
                const ny = magnet.y + Math.sin(magnet.angle) * halfL;
                const sx = magnet.x - Math.cos(magnet.angle) * halfL;
                const sy = magnet.y - Math.sin(magnet.angle) * halfL;

                const dnx = px - nx;
                const dny = py - ny;
                const distN = Math.hypot(dnx, dny) + 12;
                const bNx = (dnx / distN) / (distN * distN);
                const bNy = (dny / distN) / (distN * distN);

                const dsx = px - sx;
                const dsy = py - sy;
                const distS = Math.hypot(dsx, dsy) + 12;
                const bSx = -(dsx / distS) / (distS * distS);
                const bSy = -(dsy / distS) / (distS * distS);

                const scale = ctx.params.fieldStrength * 12000;
                return {
                    bx: (bNx + bSx) * scale,
                    by: (bNy + bSy) * scale
                };
            }

            updateMagnetPos();
            ctx.onReset = () => {
                particles = [];
                forceHistory = [];
                updateMagnetPos();
            };
            ctx.onResize = updateMagnetPos;

            p.draw = function() {
                p.background(7, 9, 15);

                const dt = ctx.speed;
                const q = ctx.params.particleCharge;
                const vInit = ctx.params.particleSpeed;
                const showV = ctx.params.showVectors > 0.5;

                // Inertia drift for magnet after drag release
                if (ctx.isPlaying && !isDraggingMagnet) {
                    magnet.x += magnet.vx * dt;
                    magnet.y += magnet.vy * dt;
                    magnet.vx *= 0.92;
                    magnet.vy *= 0.92;
                    magnet.x = p.constrain(magnet.x, 80, p.width - 80);
                    magnet.y = p.constrain(magnet.y, 80, p.height - 80);
                }

                // 1. Magnetic field lines/needles
                p.strokeWeight(1);
                for (let i = 0; i < fieldGrid.length; i++) {
                    const pt = fieldGrid[i];
                    const B = getBField(pt.x, pt.y);
                    const bMag = Math.hypot(B.bx, B.by);
                    if (bMag > 0.001) {
                        const len = Math.min(14, bMag * 6);
                        const angle = Math.atan2(B.by, B.bx);
                        const alpha = Math.min(130, Math.floor(bMag * 45) + 20);

                        p.stroke(124, 106, 247, alpha);
                        p.line(
                            pt.x - (Math.cos(angle) * len * 0.5),
                            pt.y - (Math.sin(angle) * len * 0.5),
                            pt.x + (Math.cos(angle) * len * 0.5),
                            pt.y + (Math.sin(angle) * len * 0.5)
                        );
                    }
                }

                // 2. Spawn incoming charged particles
                if (ctx.isPlaying && p.frameCount % (18 - ctx.params.emissionRate * 2) === 0) {
                    const startY = p.height * 0.2 + Math.random() * p.height * 0.6;
                    particles.push({
                        x: 10,
                        y: startY,
                        vx: vInit,
                        vy: (Math.random() - 0.5) * 0.5,
                        q: q,
                        trail: []
                    });
                }

                // 3. Update & render charged particles under Lorentz force F = q(v × B)
                let avgForce = 0;
                let activeCount = 0;

                for (let i = particles.length - 1; i >= 0; i--) {
                    const pt = particles[i];

                    let fx = 0, fy = 0;
                    if (ctx.isPlaying) {
                        const B = getBField(pt.x, pt.y);
                        fx = pt.q * (pt.vy * B.bx - pt.vx * B.by) * 0.08;
                        fy = pt.q * (pt.vx * B.bx + pt.vy * B.by) * 0.08;

                        pt.vx += fx * dt;
                        pt.vy += fy * dt;

                        // Conserve particle kinetic energy: speed is invariant under magnetic force
                        const curSpeed = Math.hypot(pt.vx, pt.vy);
                        if (curSpeed > 0.001) {
                            pt.vx = (pt.vx / curSpeed) * vInit;
                            pt.vy = (pt.vy / curSpeed) * vInit;
                        }

                        pt.x += pt.vx * dt;
                        pt.y += pt.vy * dt;

                        const fMag = Math.hypot(fx, fy);
                        avgForce += fMag;
                        activeCount++;

                        pt.trail.push({ x: pt.x, y: pt.y });
                        if (pt.trail.length > 24) pt.trail.shift();

                        if (pt.x < -60 || pt.x > p.width + 60 || pt.y < -60 || pt.y > p.height + 60) {
                            particles.splice(i, 1);
                            continue;
                        }
                    }

                    const col = pt.q > 0 ? [232, 160, 76] : [45, 212, 191];

                    // Fading trail
                    VisualKit.drawFadingTrail(p, pt.trail, col, {
                        exponent: 1.6,
                        maxAlpha: 190,
                        minWeight: 1.0,
                        maxWeight: 2.2
                    });

                    // Glow particle body
                    VisualKit.drawGlowBody(p, pt.x, pt.y, 5, col, {
                        outerMult: 1.8,
                        innerMult: 1.25,
                        outerAlpha: 35,
                        innerAlpha: 85,
                        specularAlpha: 55
                    });

                    // Vectors
                    if (showV) {
                        // Velocity vector (white)
                        VisualKit.drawArrow(p, pt.x, pt.y,
                            pt.x + (pt.vx / vInit) * 22,
                            pt.y + (pt.vy / vInit) * 22,
                            [241, 245, 249], 200, 1.8, 6);

                        // Lorentz force vector (emerald green)
                        const fMag = Math.hypot(fx, fy);
                        if (fMag > 0.02) {
                            const scaleF = Math.min(fMag * 140, 36);
                            VisualKit.drawArrow(p, pt.x, pt.y,
                                pt.x + (fx / fMag) * scaleF,
                                pt.y + (fy / fMag) * scaleF,
                                [52, 211, 153], 200, 1.5, 5);
                        }
                    }
                }

                // 4. Render Dipole Magnet with glow on poles
                const halfL = magnet.length * 0.5;
                const cosA = Math.cos(magnet.angle);
                const sinA = Math.sin(magnet.angle);
                const nx = magnet.x + cosA * halfL;
                const ny = magnet.y + sinA * halfL;
                const sx = magnet.x - cosA * halfL;
                const sy = magnet.y - sinA * halfL;

                // North pole glow
                p.noStroke();
                p.fill(248, 113, 113, 30);
                p.circle(nx, ny, 26);
                // South pole glow
                p.fill(45, 212, 191, 30);
                p.circle(sx, sy, 26);

                p.strokeWeight(16);
                p.strokeCap(p.ROUND);

                // South pole bar (Teal)
                p.stroke(45, 212, 191);
                p.line(magnet.x, magnet.y, sx, sy);

                // North pole bar (Red)
                p.stroke(248, 113, 113);
                p.line(magnet.x, magnet.y, nx, ny);

                // Metallic core pivot
                p.noStroke();
                p.fill(30, 41, 59);
                p.circle(magnet.x, magnet.y, 14);
                p.fill(71, 85, 105);
                p.circle(magnet.x, magnet.y, 6);

                // Pole labels
                p.fill(255, 255, 255);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(11);
                p.text('N', nx, ny);
                p.text('S', sx, sy);

                // 5. Inset Sparkline: Average Lorentz Force
                const meanF = activeCount > 0 ? (avgForce / activeCount) * 10 : 0;
                if (ctx.isPlaying) {
                    forceHistory.push(meanF);
                    if (forceHistory.length > 180) forceHistory.shift();
                }
                if (p.width > 480) {
                    VisualKit.drawSparkline(p, p.width - 188, 12, 180, 60, forceHistory, [0, 229, 255], {
                        label: 'Mean Lorentz Force (pN)',
                        zeroFloor: true,
                        cornerRadius: 6
                    });
                }

                // Telemetry
                const centerB = getBField(p.width * 0.5, p.height * 0.5);
                const centerBMag = Math.hypot(centerB.bx, centerB.by);
                const cyclotronR = (vInit / Math.max(0.1, centerBMag * 0.1));

                ctx._telemetry = {
                    'Lorentz Force (F)': `${(meanF).toFixed(2)} pN`,
                    'Cyclotron Radius': `${cyclotronR.toFixed(1)} px`,
                    'Active Particles': `${activeCount}`,
                    'Field at Center': `${centerBMag.toFixed(2)} T`
                };
                ctx.updateTelemetry();

                // Caption
                p.noStroke();
                p.fill(65, 85, 120);
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('White = velocity (v)  |  Green = Lorentz force (F=q v×B)  |  Drag dipole to fling and reposition', 14, p.height - 10);
            };

            function getPointerPos() {
                if (p.touches && p.touches.length > 0) return { x: p.touches[0].x, y: p.touches[0].y };
                return { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = getPointerPos();
                if (Math.hypot(pos.x - magnet.x, pos.y - magnet.y) < magnet.length * 0.6) {
                    isDraggingMagnet = true;
                    magnet.vx = 0;
                    magnet.vy = 0;
                    dragTracker.start(pos.x, pos.y);
                    return false;
                }
            };

            p.mouseDragged = function() {
                if (isDraggingMagnet) {
                    const pos = getPointerPos();
                    magnet.x = p.constrain(pos.x, 80, p.width - 80);
                    magnet.y = p.constrain(pos.y, 80, p.height - 80);
                    dragTracker.drag(pos.x, pos.y);
                    return false;
                }
            };

            p.mouseReleased = function() {
                if (isDraggingMagnet) {
                    const vel = dragTracker.release();
                    magnet.vx = vel.vx;
                    magnet.vy = vel.vy;
                    isDraggingMagnet = false;
                }
            };

            p.touchStarted = p.mousePressed;
            p.touchMoved   = p.mouseDragged;
            p.touchEnded   = p.mouseReleased;
        }
    });

    sim.mount();
    return sim;
};
