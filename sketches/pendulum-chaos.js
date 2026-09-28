// ===== DOUBLE PENDULUM CHAOS =====
// Chaotic dynamics and sensitive dependence on initial conditions
// Physics: Lagrangian mechanics integrated with Runge-Kutta 4th order (RK4)

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'pendulum-chaos',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            rodLength1: { value: 120, min: 60, max: 200, step: 5, label: 'Upper Rod (L₁)', unit: 'px' },
            rodLength2: { value: 120, min: 60, max: 200, step: 5, label: 'Lower Rod (L₂)', unit: 'px' },
            bobMass1: { value: 10, min: 2, max: 30, step: 1, label: 'Upper Mass (m₁)', unit: 'kg' },
            bobMass2: { value: 10, min: 2, max: 30, step: 1, label: 'Lower Mass (m₂)', unit: 'kg' },
            gravity: { value: 9.8, min: 0, max: 25, step: 0.5, label: 'Gravity (g)', unit: 'm/s²' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Total Energy': '0.0 J',
                'Lyapunov Delta': '0.000 rad',
                'Omega 1 (ω₁)': '0.0 rad/s',
                'Omega 2 (ω₂)': '0.0 rad/s'
            };
        },
        setup(p, ctx) {
            // State: [theta1, theta2, omega1, omega2]
            let stateA = [Math.PI / 2, Math.PI / 2, 0, 0];
            // Shadow pendulum: starts with a tiny 0.001 rad perturbation to show chaos
            let stateB = [Math.PI / 2 + 0.001, Math.PI / 2, 0, 0];

            let trailA = [];
            let trailB = [];
            let draggedBob = null;

            function resetState() {
                stateA = [Math.PI / 2, Math.PI / 2, 0, 0];
                stateB = [Math.PI / 2 + 0.001, Math.PI / 2, 0, 0];
                trailA = [];
                trailB = [];
            }

            ctx.onReset = resetState;
            ctx.onResize = resetState;

            // Equations of motion for double pendulum
            function derivatives(s) {
                const [t1, t2, w1, w2] = s;
                const l1 = ctx.params.rodLength1 * 0.01;
                const l2 = ctx.params.rodLength2 * 0.01;
                const m1 = ctx.params.bobMass1;
                const m2 = ctx.params.bobMass2;
                const g = ctx.params.gravity;

                const delta = t1 - t2;
                const den1 = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * t1 - 2 * t2));
                const den2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * t1 - 2 * t2));

                const num1 = -g * (2 * m1 + m2) * Math.sin(t1) - m2 * g * Math.sin(t1 - 2 * t2) - 2 * Math.sin(delta) * m2 * (w2 * w2 * l2 + w1 * w1 * l1 * Math.cos(delta));
                const alpha1 = num1 / Math.max(0.0001, den1);

                const num2 = 2 * Math.sin(delta) * (w1 * w1 * l1 * (m1 + m2) + g * (m1 + m2) * Math.cos(t1) + w2 * w2 * l2 * m2 * Math.cos(delta));
                const alpha2 = num2 / Math.max(0.0001, den2);

                return [w1, w2, alpha1, alpha2];
            }

            // Runge-Kutta 4th Order Integrator
            function rk4Step(s, dt) {
                const k1 = derivatives(s);
                const s2 = s.map((val, i) => val + k1[i] * dt * 0.5);
                const k2 = derivatives(s2);
                const s3 = s.map((val, i) => val + k2[i] * dt * 0.5);
                const k3 = derivatives(s3);
                const s4 = s.map((val, i) => val + k3[i] * dt);
                const k4 = derivatives(s4);

                return s.map((val, i) => val + (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) * (dt / 6));
            }

            p.draw = function() {
                p.background(7, 9, 15);

                const originX = p.width / 2;
                const originY = p.height * 0.35;
                const l1 = ctx.params.rodLength1;
                const l2 = ctx.params.rodLength2;
                const dt = 0.04 * ctx.speed;

                if (ctx.isPlaying && !draggedBob) {
                    // Integrate multiple micro-substeps for energy conservation
                    for (let step = 0; step < 4; step++) {
                        stateA = rk4Step(stateA, dt * 0.25);
                        stateB = rk4Step(stateB, dt * 0.25);
                    }
                }

                // Positions of Pendulum A
                const x1A = originX + l1 * Math.sin(stateA[0]);
                const y1A = originY + l1 * Math.cos(stateA[0]);
                const x2A = x1A + l2 * Math.sin(stateA[1]);
                const y2A = y1A + l2 * Math.cos(stateA[1]);

                // Positions of Shadow Pendulum B
                const x1B = originX + l1 * Math.sin(stateB[0]);
                const y1B = originY + l1 * Math.cos(stateB[0]);
                const x2B = x1B + l2 * Math.sin(stateB[1]);
                const y2B = y1B + l2 * Math.cos(stateB[1]);

                // Record trails
                if (ctx.isPlaying) {
                    trailA.push({ x: x2A, y: y2A });
                    trailB.push({ x: x2B, y: y2B });
                    if (trailA.length > 120) trailA.shift();
                    if (trailB.length > 120) trailB.shift();
                }

                // 1. Draw trails
                p.noFill();
                p.strokeWeight(1.8);

                // Shadow trail (Indigo)
                p.stroke('rgba(124, 106, 247, 0.4)');
                p.beginShape();
                for (let i = 0; i < trailB.length; i++) p.vertex(trailB[i].x, trailB[i].y);
                p.endShape();

                // Main trail (Amber)
                p.stroke('rgba(232, 160, 76, 0.7)');
                p.beginShape();
                for (let i = 0; i < trailA.length; i++) p.vertex(trailA[i].x, trailA[i].y);
                p.endShape();

                // 2. Draw Shadow Pendulum B (Ghosted)
                p.stroke('rgba(124, 106, 247, 0.35)');
                p.strokeWeight(2);
                p.line(originX, originY, x1B, y1B);
                p.line(x1B, y1B, x2B, y2B);
                p.fill('rgba(124, 106, 247, 0.5)');
                p.noStroke();
                p.circle(x1B, y1B, 10);
                p.circle(x2B, y2B, 12);

                // 3. Draw Main Pendulum A
                p.stroke('#f1f5f9');
                p.strokeWeight(2.5);
                p.line(originX, originY, x1A, y1A);
                p.line(x1A, y1A, x2A, y2A);

                // Pivot mount
                p.fill('#64748b');
                p.noStroke();
                p.circle(originX, originY, 14);

                // Bobs
                p.fill('#2dd4bf'); // Teal upper bob
                p.stroke('#07090f');
                p.strokeWeight(2);
                p.circle(x1A, y1A, 16);

                p.fill('#e8a04c'); // Amber lower bob
                p.circle(x2A, y2A, 22);

                // Divergence angle
                const divergence = Math.abs(stateA[1] - stateB[1]) % (2 * Math.PI);
                const m1 = ctx.params.bobMass1;
                const m2 = ctx.params.bobMass2;
                const g = ctx.params.gravity;
                const pe = -(m1 + m2) * g * (l1 * 0.01) * Math.cos(stateA[0]) - m2 * g * (l2 * 0.01) * Math.cos(stateA[1]);
                const ke = 0.5 * m1 * (l1 * 0.01 * stateA[2]) ** 2 + 0.5 * m2 * ((l1 * 0.01 * stateA[2]) ** 2 + (l2 * 0.01 * stateA[3]) ** 2 + 2 * (l1 * 0.01) * (l2 * 0.01) * stateA[2] * stateA[3] * Math.cos(stateA[0] - stateA[1]));

                ctx._telemetry = {
                    'Total Energy': `${Math.abs(ke + pe).toFixed(1)} J`,
                    'Lyapunov Delta': `${divergence.toFixed(3)} rad`,
                    'Omega 1 (ω₁)': `${stateA[2].toFixed(1)} rad/s`,
                    'Omega 2 (ω₂)': `${stateA[3].toFixed(1)} rad/s`
                };
                ctx.updateTelemetry();

                // Legend
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Amber = Main pendulum • Violet = Shadow (+0.001 rad perturbation) • Drag bobs to adjust', 16, p.height - 14);
            };

            function getPointerPos() {
                if (p.touches && p.touches.length > 0) return { x: p.touches[0].x, y: p.touches[0].y };
                return { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = getPointerPos();
                const originX = p.width / 2;
                const originY = p.height * 0.35;
                const l1 = ctx.params.rodLength1;
                const l2 = ctx.params.rodLength2;
                const x1A = originX + l1 * Math.sin(stateA[0]);
                const y1A = originY + l1 * Math.cos(stateA[0]);
                const x2A = x1A + l2 * Math.sin(stateA[1]);
                const y2A = y1A + l2 * Math.cos(stateA[1]);

                if (Math.hypot(pos.x - x2A, pos.y - y2A) < 28) {
                    draggedBob = 2;
                    return false;
                } else if (Math.hypot(pos.x - x1A, pos.y - y1A) < 24) {
                    draggedBob = 1;
                    return false;
                }
            };

            p.mouseDragged = function() {
                if (draggedBob) {
                    const pos = getPointerPos();
                    const originX = p.width / 2;
                    const originY = p.height * 0.35;

                    if (draggedBob === 1) {
                        stateA[0] = Math.atan2(pos.x - originX, pos.y - originY);
                        stateA[2] = 0;
                        stateB[0] = stateA[0] + 0.001;
                        stateB[2] = 0;
                    } else if (draggedBob === 2) {
                        const l1 = ctx.params.rodLength1;
                        const x1 = originX + l1 * Math.sin(stateA[0]);
                        const y1 = originY + l1 * Math.cos(stateA[0]);
                        stateA[1] = Math.atan2(pos.x - x1, pos.y - y1);
                        stateA[3] = 0;
                        stateB[1] = stateA[1];
                        stateB[3] = 0;
                    }
                    trailA = [];
                    trailB = [];
                    return false;
                }
            };

            p.mouseReleased = function() {
                draggedBob = null;
            };
        }
    });

    sim.mount();
    return sim;
};