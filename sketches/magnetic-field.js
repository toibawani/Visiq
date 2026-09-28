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
            emissionRate: { value: 3, min: 1, max: 6, step: 1, label: 'Emitter Influx', unit: 'p/s' }
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
            let magnet = { x: 0, y: 0, length: 110, angle: 0 };
            let particles = [];
            let fieldGrid = [];
            let isDraggingMagnet = false;

            function updateMagnetPos() {
                magnet.x = p.width * 0.5;
                magnet.y = p.height * 0.5;
                computeFieldLines();
            }

            // Precompute background field vector arrows
            function computeFieldLines() {
                fieldGrid = [];
                const step = 35;
                for (let x = 20; x < p.width; x += step) {
                    for (let y = 20; y < p.height; y += step) {
                        fieldGrid.push({ x, y });
                    }
                }
            }

            // Magnetic field B at point (px, py) from dipole poles
            function getBField(px, py) {
                const halfL = magnet.length * 0.5;
                const nx = magnet.x + Math.cos(magnet.angle) * halfL;
                const ny = magnet.y + Math.sin(magnet.angle) * halfL;
                const sx = magnet.x - Math.cos(magnet.angle) * halfL;
                const sy = magnet.y - Math.sin(magnet.angle) * halfL;

                // North pole (source)
                const dnx = px - nx;
                const dny = py - ny;
                const distN = Math.hypot(dnx, dny) + 12;
                const bNx = (dnx / distN) / (distN * distN);
                const bNy = (dny / distN) / (distN * distN);

                // South pole (sink)
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
                updateMagnetPos();
            };
            ctx.onResize = updateMagnetPos;

            p.draw = function() {
                p.background(7, 9, 15);

                const dt = ctx.speed;
                const q = ctx.params.particleCharge;
                const vInit = ctx.params.particleSpeed;

                // 1. Draw magnetic field lines/needles
                p.strokeWeight(1);
                for (let i = 0; i < fieldGrid.length; i++) {
                    const pt = fieldGrid[i];
                    const B = getBField(pt.x, pt.y);
                    const bMag = Math.hypot(B.bx, B.by);
                    if (bMag > 0.001) {
                        const len = Math.min(14, bMag * 6);
                        const angle = Math.atan2(B.by, B.bx);
                        const alpha = Math.min(140, Math.floor(bMag * 50) + 20);

                        p.stroke(124, 106, 247, alpha); // Indigo vector needle
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

                    if (ctx.isPlaying) {
                        const B = getBField(pt.x, pt.y);
                        // 2D Lorentz deflection: acceleration perp to velocity
                        // In 2D with B perpendicular to plane or planar dipole:
                        // a_x = q * v_y * B_z - here we cross in plane
                        const bMag = Math.hypot(B.bx, B.by);
                        const fx = pt.q * (pt.vy * B.bx - pt.vx * B.by) * 0.08;
                        const fy = pt.q * (pt.vx * B.bx + pt.vy * B.by) * 0.08;

                        pt.vx += fx * dt;
                        pt.vy += fy * dt;

                        // Normalize to conserve particle kinetic energy
                        const curSpeed = Math.hypot(pt.vx, pt.vy);
                        if (curSpeed > 0.001) {
                            pt.vx = (pt.vx / curSpeed) * vInit;
                            pt.vy = (pt.vy / curSpeed) * vInit;
                        }

                        pt.x += pt.vx * dt;
                        pt.y += pt.vy * dt;

                        avgForce += Math.hypot(fx, fy);
                        activeCount++;

                        // Record trail
                        if (p.frameCount % 2 === 0) {
                            pt.trail.push({ x: pt.x, y: pt.y });
                            if (pt.trail.length > 20) pt.trail.shift();
                        }

                        // Boundary cull
                        if (pt.x < -60 || pt.x > p.width + 60 || pt.y < -60 || pt.y > p.height + 60) {
                            particles.splice(i, 1);
                            continue;
                        }
                    }

                    // Render trail
                    if (pt.trail.length > 1) {
                        p.noFill();
                        p.stroke(pt.q > 0 ? 'rgba(232, 160, 76, 0.45)' : 'rgba(45, 212, 191, 0.45)');
                        p.strokeWeight(2);
                        p.beginShape();
                        for (let t = 0; t < pt.trail.length; t++) p.vertex(pt.trail[t].x, pt.trail[t].y);
                        p.endShape();
                    }

                    // Render particle
                    p.noStroke();
                    p.fill(pt.q > 0 ? '#e8a04c' : '#2dd4bf'); // Amber = +, Teal = -
                    p.circle(pt.x, pt.y, 8);
                }

                // 4. Render Dipole Magnet
                const halfL = magnet.length * 0.5;
                const cosA = Math.cos(magnet.angle);
                const sinA = Math.sin(magnet.angle);
                const nx = magnet.x + cosA * halfL;
                const ny = magnet.y + sinA * halfL;
                const sx = magnet.x - cosA * halfL;
                const sy = magnet.y - sinA * halfL;

                p.strokeWeight(16);
                p.strokeCap(p.ROUND);

                // South pole (Teal)
                p.stroke('#2dd4bf');
                p.line(magnet.x, magnet.y, sx, sy);

                // North pole (Amber/Red)
                p.stroke('#f87171');
                p.line(magnet.x, magnet.y, nx, ny);

                // Pole labels
                p.fill('#ffffff');
                p.noStroke();
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(11);
                p.text('N', nx, ny);
                p.text('S', sx, sy);

                // Telemetry
                const centerB = getBField(p.width * 0.5, p.height * 0.5);
                const centerBMag = Math.hypot(centerB.bx, centerB.by);
                const cyclotronR = (vInit / Math.max(0.1, centerBMag * 0.1));

                ctx._telemetry = {
                    'Lorentz Force (F)': `${(avgForce / Math.max(1, activeCount)).toFixed(2)} pN`,
                    'Cyclotron Radius': `${cyclotronR.toFixed(1)} px`,
                    'Active Particles': `${activeCount}`,
                    'Field at Center': `${centerBMag.toFixed(2)} T`
                };
                ctx.updateTelemetry();

                // Legend / instructions
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Drag the dipole magnet to reposition field • Amber = Positive (+q), Teal = Negative (-q)', 16, p.height - 14);
            };

            function getPointerPos() {
                if (p.touches && p.touches.length > 0) return { x: p.touches[0].x, y: p.touches[0].y };
                return { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = getPointerPos();
                if (Math.hypot(pos.x - magnet.x, pos.y - magnet.y) < magnet.length * 0.6) {
                    isDraggingMagnet = true;
                    return false;
                }
            };

            p.mouseDragged = function() {
                if (isDraggingMagnet) {
                    const pos = getPointerPos();
                    magnet.x = p.constrain(pos.x, 80, p.width - 80);
                    magnet.y = p.constrain(pos.y, 80, p.height - 80);
                    return false;
                }
            };

            p.mouseReleased = function() {
                isDraggingMagnet = false;
            };
        }
    });

    sim.mount();
    return sim;
};
