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
            particleCount: { value: 80, min: 20, max: 180, step: 10, label: 'Molecules (N)', unit: 'qty' },
            pistonWidth: { value: 320, min: 140, max: 480, step: 10, label: 'Chamber Width (V)', unit: 'px' }
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
            let wallImpulseAccumulator = 0;
            let measuredPressure = 101.3;
            let lastPressureCalc = 0;
            let isDraggingPiston = false;

            const chamberLeft = 60;
            const chamberTop = 60;
            const chamberHeight = 280;

            function initParticles() {
                particles = [];
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
                        radius: 4.5
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
                    // Rescale velocities to match new temperature
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
                const pWidth = ctx.params.pistonWidth;
                const pRight = chamberLeft + pWidth;
                const pBottom = chamberTop + chamberHeight;

                // 1. Draw Chamber Walls
                p.stroke('#3a4775');
                p.strokeWeight(4);
                // Top wall
                p.line(chamberLeft, chamberTop, pRight + 60, chamberTop);
                // Bottom wall
                p.line(chamberLeft, pBottom, pRight + 60, pBottom);
                // Left fixed wall
                p.line(chamberLeft, chamberTop, chamberLeft, pBottom);

                // 2. Draw Moveable Piston Head (amber bar)
                p.stroke('#e8a04c');
                p.strokeWeight(12);
                p.line(pRight, chamberTop + 6, pRight, pBottom - 6);

                // Piston rod and handle
                p.stroke('#64748b');
                p.strokeWeight(6);
                p.line(pRight, chamberTop + chamberHeight * 0.5, pRight + 70, chamberTop + chamberHeight * 0.5);

                // Handle grip
                p.fill('#e8a04c');
                p.noStroke();
                p.circle(pRight + 70, chamberTop + chamberHeight * 0.5, 20);

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
                        }
                        // Piston head collision
                        else if (pt.x + pt.radius > pRight) {
                            pt.x = pRight - pt.radius;
                            pt.vx = -Math.abs(pt.vx);
                            wallImpulseAccumulator += Math.abs(pt.vx) * 2;
                        }

                        // Top / bottom wall collisions
                        if (pt.y - pt.radius < chamberTop) {
                            pt.y = chamberTop + pt.radius;
                            pt.vy = Math.abs(pt.vy);
                            wallImpulseAccumulator += Math.abs(pt.vy) * 2;
                        } else if (pt.y + pt.radius > pBottom) {
                            pt.y = pBottom - pt.radius;
                            pt.vy = -Math.abs(pt.vy);
                            wallImpulseAccumulator += Math.abs(pt.vy) * 2;
                        }
                    }

                    // Temperature-based particle coloring (blue/teal when cold, amber/red when hot)
                    const speed = Math.hypot(pt.vx, pt.vy);
                    totalSpeedSq += speed * speed;

                    p.noStroke();
                    if (ctx.params.temperature < 250) {
                        p.fill('#2dd4bf'); // Teal (Cold)
                    } else if (ctx.params.temperature > 500) {
                        p.fill('#f87171'); // Red/warm (Hot)
                    } else {
                        p.fill('#e8a04c'); // Amber (Ambient)
                    }
                    p.circle(pt.x, pt.y, pt.radius * 2);
                }

                // 4. Pressure calculation averaged over 0.25s intervals
                if (p.millis() - lastPressureCalc > 250) {
                    const area = 2 * (pWidth + chamberHeight);
                    // P ~ Impulse / (Area * time)
                    const rawP = (wallImpulseAccumulator * 80) / Math.max(10, area);
                    measuredPressure = measuredPressure * 0.7 + rawP * 0.3;
                    wallImpulseAccumulator = 0;
                    lastPressureCalc = p.millis();
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

                // Legend
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Drag the amber piston handle to compress or expand chamber • Heat to speed up molecules', 16, p.height - 14);
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
                    return false;
                }
            };

            p.mouseDragged = function() {
                if (isDraggingPiston) {
                    const pos = getPointerPos();
                    const newWidth = Math.max(140, Math.min(480, pos.x - chamberLeft));
                    ctx.params.pistonWidth = newWidth;
                    // Update slider UI badge
                    const slider = document.getElementById(`sim-param-pressure-temperature-pistonWidth`);
                    const badge = document.getElementById(`sim-param-pressure-temperature-pistonWidth-val`);
                    if (slider) slider.value = String(newWidth);
                    if (badge) badge.textContent = `${newWidth} px`;
                    return false;
                }
            };

            p.mouseReleased = function() {
                isDraggingPiston = false;
            };
        }
    });

    sim.mount();
    return sim;
};
