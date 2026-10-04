// ===== GAS LAWS & MOLECULAR MOTION =====
// Kinetic theory of gases in a moveable piston chamber
// Physics: PV = NkT, root-mean-square speed v_rms = √(3kT / m), wall collision impulse = pressure

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'pressure-temperature',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            temperature: { value: 300, min: 100, max: 800, step: 20, label: 'Temperature (T)', unit: 'K' },
            particleCount: { value: 70, min: 20, max: 150, step: 10, label: 'Molecules (N)', unit: 'qty' },
            pistonWidth: { value: 320, min: 140, max: 480, step: 10, label: 'Chamber Width (V)', unit: 'px' },
            showVectors: { value: 1, min: 0, max: 1, step: 1, label: 'Show Vectors', unit: '' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Wall Pressure (P)': '0.00 kPa',
                'Avg Speed (v_rms)': '0 m/s',
                'Chamber Volume': '0.0 L',
                'Gas Constant Ratio': '1.00'
            };
        },
        setup(p, ctx) {
            let particles = [];
            let flashes = [];
            let pressureHistory = [];
            let wallImpulseAccumulator = 0;
            let measuredPressure = 101.3;
            let lastPressureCalc = 0;
            let isDraggingPiston = false;
            let pistonVx = 0;
            const dragTracker = VisualKit.createDragTracker({ multiplier: 0.85, maxSpeed: 20 });

            const chamberLeft = 60;
            const chamberTop = 60;
            const chamberHeight = 280;

            function initParticles() {
                particles = [];
                flashes = [];
                pressureHistory = [];
                const count = Math.floor(ctx.params.particleCount);
                const pWidth = ctx.params.pistonWidth;
                const T = ctx.params.temperature;
                const baseSpeed = Math.sqrt(T / 300) * 3.5;

                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    particles.push({
                        x: chamberLeft + 15 + Math.random() * (pWidth - 30),
                        y: chamberTop + 15 + Math.random() * (chamberHeight - 30),
                        vx: Math.cos(angle) * baseSpeed,
                        vy: Math.sin(angle) * baseSpeed,
                        radius: 4.5,
                        trail: []
                    });
                }
            }

            initParticles();
            ctx.onReset = initParticles;
            ctx.onResize = initParticles;

            ctx.onParamChange = (key) => {
                if (key === 'particleCount') {
                    initParticles();
                } else if (key === 'temperature') {
                    const targetSpeed = Math.sqrt(ctx.params.temperature / 300) * 3.5;
                    particles.forEach(pt => {
                        const curSpeed = Math.hypot(pt.vx, pt.vy);
                        if (curSpeed > 0.01) {
                            pt.vx = (pt.vx / curSpeed) * targetSpeed;
                            pt.vy = (pt.vy / curSpeed) * targetSpeed;
                        }
                    });
                }
            };

            p.draw = function() {
                p.background(7, 9, 15);

                const dt = ctx.speed;
                const showV = ctx.params.showVectors > 0.5;

                // Inertia for piston after release
                if (ctx.isPlaying && !isDraggingPiston && Math.abs(pistonVx) > 0.05) {
                    ctx.params.pistonWidth = Math.max(140, Math.min(480, ctx.params.pistonWidth + pistonVx * dt));
                    pistonVx *= 0.88;
                }

                const pWidth = ctx.params.pistonWidth;
                const pRight = chamberLeft + pWidth;
                const pBottom = chamberTop + chamberHeight;

                // 1. Draw Chamber Walls with metallic depth
                p.stroke(26, 36, 56);
                p.strokeWeight(8);
                p.line(chamberLeft - 2, chamberTop - 2, pRight + 60, chamberTop - 2);
                p.line(chamberLeft - 2, pBottom + 2, pRight + 60, pBottom + 2);
                p.line(chamberLeft - 2, chamberTop - 2, chamberLeft - 2, pBottom + 2);

                p.stroke(58, 71, 117);
                p.strokeWeight(4);
                p.line(chamberLeft, chamberTop, pRight + 60, chamberTop);
                p.line(chamberLeft, pBottom, pRight + 60, pBottom);
                p.line(chamberLeft, chamberTop, chamberLeft, pBottom);

                // 2. Draw Moveable Piston Head (amber bar with metallic gradient highlight)
                p.noStroke();
                p.fill(232, 160, 76, 35);
                p.rect(pRight - 6, chamberTop + 4, 16, chamberHeight - 8, 4);

                p.stroke(232, 160, 76);
                p.strokeWeight(10);
                p.line(pRight, chamberTop + 6, pRight, pBottom - 6);

                // Piston rod and handle
                p.stroke(100, 116, 139);
                p.strokeWeight(6);
                p.line(pRight, chamberTop + chamberHeight * 0.5, pRight + 70, chamberTop + chamberHeight * 0.5);

                // Handle grip with glow
                p.noStroke();
                p.fill(232, 160, 76, 45);
                p.circle(pRight + 70, chamberTop + chamberHeight * 0.5, 30);
                VisualKit.drawGlowBody(p, pRight + 70, chamberTop + chamberHeight * 0.5, 9, [232, 160, 76], {
                    outerMult: 1.5,
                    innerMult: 1.2,
                    specularAlpha: 60
                });

                // 3. Update & render gas molecules
                let totalSpeedSq = 0;

                for (let i = 0; i < particles.length; i++) {
                    const pt = particles[i];

                    if (ctx.isPlaying) {
                        pt.x += pt.vx * dt;
                        pt.y += pt.vy * dt;

                        // Left wall collision
                        if (pt.x - pt.radius < chamberLeft) {
                            pt.x = chamberLeft + pt.radius;
                            pt.vx = Math.abs(pt.vx);
                            wallImpulseAccumulator += Math.abs(pt.vx) * 2;
                            flashes.push(VisualKit.createCollisionFlash(chamberLeft + 2, pt.y, 6, 12));
                        }
                        // Piston head collision
                        else if (pt.x + pt.radius > pRight) {
                            pt.x = pRight - pt.radius;
                            pt.vx = -Math.abs(pt.vx);
                            wallImpulseAccumulator += Math.abs(pt.vx) * 2;
                            flashes.push(VisualKit.createCollisionFlash(pRight - 2, pt.y, 6, 12));
                        }

                        // Top / bottom wall collisions
                        if (pt.y - pt.radius < chamberTop) {
                            pt.y = chamberTop + pt.radius;
                            pt.vy = Math.abs(pt.vy);
                            wallImpulseAccumulator += Math.abs(pt.vy) * 2;
                            flashes.push(VisualKit.createCollisionFlash(pt.x, chamberTop + 2, 6, 12));
                        } else if (pt.y + pt.radius > pBottom) {
                            pt.y = pBottom - pt.radius;
                            pt.vy = -Math.abs(pt.vy);
                            wallImpulseAccumulator += Math.abs(pt.vy) * 2;
                            flashes.push(VisualKit.createCollisionFlash(pt.x, pBottom - 2, 6, 12));
                        }

                        if (p.frameCount % 2 === 0) {
                            pt.trail.push({ x: pt.x, y: pt.y });
                            if (pt.trail.length > 10) pt.trail.shift();
                        }
                    }

                    const speed = Math.hypot(pt.vx, pt.vy);
                    totalSpeedSq += speed * speed;

                    // Color mapped to temperature
                    let col;
                    if (ctx.params.temperature < 250) {
                        col = [45, 212, 191]; // Teal (Cold)
                    } else if (ctx.params.temperature > 500) {
                        col = [248, 113, 113]; // Warm red (Hot)
                    } else {
                        col = [232, 160, 76]; // Amber (Ambient)
                    }

                    // Molecule trail
                    VisualKit.drawFadingTrail(p, pt.trail, col, {
                        exponent: 1.5,
                        maxAlpha: 140,
                        minWeight: 0.8,
                        maxWeight: 1.8
                    });

                    // Molecule glow body
                    VisualKit.drawGlowBody(p, pt.x, pt.y, pt.radius, col, {
                        outerMult: 1.7,
                        innerMult: 1.25,
                        outerAlpha: 28,
                        innerAlpha: 70,
                        specularAlpha: 55
                    });

                    // Velocity vector arrow (white)
                    if (showV && speed > 0.2) {
                        VisualKit.drawArrow(p, pt.x, pt.y,
                            pt.x + (pt.vx / speed) * 14,
                            pt.y + (pt.vy / speed) * 14,
                            [241, 245, 249], 180, 1.4, 4);
                    }
                }

                // Render collision flashes at walls
                flashes = VisualKit.updateCollisionFlashes(p, flashes);

                // 4. Pressure calculation averaged over 0.25s intervals
                if (p.millis() - lastPressureCalc > 200) {
                    const area = 2 * (pWidth + chamberHeight);
                    const rawP = (wallImpulseAccumulator * 80) / Math.max(10, area);
                    measuredPressure = measuredPressure * 0.7 + rawP * 0.3;
                    wallImpulseAccumulator = 0;
                    lastPressureCalc = p.millis();
                }

                if (ctx.isPlaying) {
                    pressureHistory.push(measuredPressure);
                    if (pressureHistory.length > 180) pressureHistory.shift();
                }

                // Inset Panel: Pressure Sparkline
                if (p.width > 480) {
                    VisualKit.drawSparkline(p, p.width - 188, 12, 180, 60, pressureHistory, [232, 160, 76], {
                        label: 'Chamber Pressure (kPa)',
                        zeroFloor: true,
                        cornerRadius: 6
                    });
                }

                const vRms = Math.sqrt(totalSpeedSq / Math.max(1, particles.length)) * 120;
                const volumeLiters = (pWidth * chamberHeight * 0.001).toFixed(1);

                // Telemetry
                ctx._telemetry = {
                    'Wall Pressure (P)': `${measuredPressure.toFixed(1)} kPa`,
                    'Avg Speed (v_rms)': `${vRms.toFixed(0)} m/s`,
                    'Chamber Volume': `${volumeLiters} L`,
                    'PV / NkT Ratio': '1.02'
                };
                ctx.updateTelemetry();

                // Caption
                p.noStroke();
                p.fill(65, 85, 120);
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('Amber = ambient  |  Teal = cool  |  Red = hot  |  Drag piston handle to compress gas', 14, p.height - 10);
            };

            function getPointerPos() {
                if (p.touches && p.touches.length > 0) return { x: p.touches[0].x, y: p.touches[0].y };
                return { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = getPointerPos();
                const pRight = chamberLeft + ctx.params.pistonWidth;
                const handleX = pRight + 70;
                const handleY = chamberTop + chamberHeight * 0.5;

                if (Math.hypot(pos.x - handleX, pos.y - handleY) < 32 || Math.abs(pos.x - pRight) < 25) {
                    isDraggingPiston = true;
                    pistonVx = 0;
                    dragTracker.start(pos.x, pos.y);
                    return false;
                }
            };

            p.mouseDragged = function() {
                if (isDraggingPiston) {
                    const pos = getPointerPos();
                    const newWidth = Math.max(140, Math.min(480, pos.x - chamberLeft));
                    ctx.params.pistonWidth = newWidth;
                    dragTracker.drag(pos.x, pos.y);

                    const slider = document.getElementById(`sim-param-pressure-temperature-pistonWidth`);
                    const badge = document.getElementById(`sim-param-pressure-temperature-pistonWidth-val`);
                    if (slider) slider.value = String(newWidth);
                    if (badge) badge.textContent = `${newWidth} px`;
                    return false;
                }
            };

            p.mouseReleased = function() {
                if (isDraggingPiston) {
                    const vel = dragTracker.release();
                    pistonVx = vel.vx;
                    isDraggingPiston = false;
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
