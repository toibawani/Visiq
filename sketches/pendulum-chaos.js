// ===== DOUBLE PENDULUM CHAOS =====
// Chaotic dynamics and sensitive dependence on initial conditions
// Physics: Lagrangian mechanics with RK4 integration

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'pendulum-chaos',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            rodLength1: { value: 120, min: 60,  max: 200, step: 5,   label: 'Upper Rod (L1)', unit: 'px'   },
            rodLength2: { value: 120, min: 60,  max: 200, step: 5,   label: 'Lower Rod (L2)', unit: 'px'   },
            bobMass1:   { value: 10,  min: 2,   max: 30,  step: 1,   label: 'Upper Mass (m1)', unit: 'kg' },
            bobMass2:   { value: 10,  min: 2,   max: 30,  step: 1,   label: 'Lower Mass (m2)', unit: 'kg' },
            gravity:    { value: 9.8, min: 0,   max: 25,  step: 0.5, label: 'Gravity (g)',     unit: 'm/s2' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Total Energy': '0.0 J',
                'Lyapunov Delta': '0.000 rad',
                'Omega 1': '0.0 rad/s',
                'Omega 2': '0.0 rad/s'
            };
        },
        setup(p, ctx) {
            let stateA = [Math.PI / 2, Math.PI / 2, 0, 0];
            let stateB = [Math.PI / 2 + 0.001, Math.PI / 2, 0, 0];

            let trailA = [], trailB = [];
            let phaseHistory = [];
            let energyHistory = [];
            let baseEnergy = null;
            let draggedBob = null;
            let prevDragAngle = 0, lastDragDelta = 0;

            function derivatives(s) {
                const [t1, t2, w1, w2] = s;
                const l1 = ctx.params.rodLength1 * 0.01;
                const l2 = ctx.params.rodLength2 * 0.01;
                const m1 = ctx.params.bobMass1;
                const m2 = ctx.params.bobMass2;
                const g  = ctx.params.gravity;
                const D  = t1 - t2;
                const denom = 2*m1 + m2 - m2*Math.cos(2*D);
                const num1 = -g*(2*m1+m2)*Math.sin(t1)
                           - m2*g*Math.sin(t1-2*t2)
                           - 2*Math.sin(D)*m2*(w2*w2*l2 + w1*w1*l1*Math.cos(D));
                const alpha1 = num1 / Math.max(1e-4, l1*denom);
                const num2 = 2*Math.sin(D)*(w1*w1*l1*(m1+m2)
                           + g*(m1+m2)*Math.cos(t1)
                           + w2*w2*l2*m2*Math.cos(D));
                const alpha2 = num2 / Math.max(1e-4, l2*denom);
                return [w1, w2, alpha1, alpha2];
            }

            function rk4(s, dt) {
                const k1 = derivatives(s);
                const s2 = s.map((v, i) => v + k1[i]*dt*0.5);
                const k2 = derivatives(s2);
                const s3 = s.map((v, i) => v + k2[i]*dt*0.5);
                const k3 = derivatives(s3);
                const s4 = s.map((v, i) => v + k3[i]*dt);
                const k4 = derivatives(s4);
                return s.map((v, i) => v + (k1[i]+2*k2[i]+2*k3[i]+k4[i])*(dt/6));
            }

            function totalEnergy(s) {
                const l1 = ctx.params.rodLength1*0.01, l2 = ctx.params.rodLength2*0.01;
                const m1 = ctx.params.bobMass1, m2 = ctx.params.bobMass2;
                const g  = ctx.params.gravity;
                const [t1, t2, w1, w2] = s;
                const pe = -(m1+m2)*g*l1*Math.cos(t1) - m2*g*l2*Math.cos(t2);
                const ke = 0.5*m1*(l1*w1)**2
                         + 0.5*m2*((l1*w1)**2 + (l2*w2)**2
                         + 2*l1*l2*w1*w2*Math.cos(t1-t2));
                return ke + pe;
            }

            function resetState() {
                stateA = [Math.PI/2, Math.PI/2, 0, 0];
                stateB = [Math.PI/2+0.001, Math.PI/2, 0, 0];
                trailA=[]; trailB=[]; phaseHistory=[]; energyHistory=[]; baseEnergy=null;
            }
            ctx.onReset  = resetState;
            ctx.onResize = resetState;

            // Per-segment fading polyline
            function fadingTrail(trail, r, g, b) {
                if (trail.length < 2) return;
                p.noFill();
                for (let i = 1; i < trail.length; i++) {
                    const t = i / trail.length;
                    p.stroke(r, g, b, Math.pow(t, 1.6) * 220);
                    p.strokeWeight(1.2 + t*1.2);
                    p.line(trail[i-1].x, trail[i-1].y, trail[i].x, trail[i].y);
                }
            }

            // Arc arrow showing angular velocity
            function angularVelocityArc(cx, cy, omega, bobR, r, g, b) {
                const span = Math.min(Math.abs(omega)*0.22, Math.PI*0.6);
                if (span < 0.06) return;
                const arcR  = bobR + 15;
                const top   = -Math.PI*0.5;
                const startA = omega > 0 ? top        : top - span;
                const endA   = omega > 0 ? top + span : top;
                p.push();
                p.translate(cx, cy);
                p.noFill(); p.stroke(r, g, b, 200); p.strokeWeight(1.8);
                p.arc(0, 0, arcR*2, arcR*2, startA, endA);
                const tipA  = omega > 0 ? endA : startA;
                const perpD = omega > 0 ? 1    : -1;
                const ax = arcR * Math.cos(tipA);
                const ay = arcR * Math.sin(tipA);
                const tangA = tipA + perpD*Math.PI*0.5;
                const hl = 6;
                p.line(ax, ay, ax - hl*Math.cos(tangA-0.45), ay - hl*Math.sin(tangA-0.45));
                p.line(ax, ay, ax - hl*Math.cos(tangA+0.45), ay - hl*Math.sin(tangA+0.45));
                p.pop();
            }

            // Phase portrait inset
            function drawPhasePortrait(px, py, pw, ph) {
                p.push();
                p.noStroke(); p.fill(8, 12, 22, 215); p.rect(px, py, pw, ph, 7);
                p.stroke(35, 48, 70); p.strokeWeight(1); p.noFill(); p.rect(px, py, pw, ph, 7);
                const cx = px+pw*0.5, cy = py+ph*0.5;
                p.stroke(28, 38, 58); p.strokeWeight(1);
                p.line(px+5, cy, px+pw-5, cy); p.line(cx, py+5, cx, py+ph-5);
                p.noStroke(); p.fill(65, 85, 120); p.textSize(8.5);
                p.textAlign(p.CENTER, p.TOP);
                p.text('phase space (t1 vs t2)', px+pw*0.5, py+4);
                const W = Math.PI;
                const scale = Math.min(pw, ph) / (2*W*1.25);
                const wrap = v => ((v+W)%(2*W)+2*W)%(2*W) - W;
                if (phaseHistory.length > 2) {
                    p.noFill();
                    for (let i = 1; i < phaseHistory.length; i++) {
                        const frac = i / phaseHistory.length;
                        p.stroke(232, 160, 76, Math.pow(frac, 2)*190); p.strokeWeight(1);
                        const x1 = cx + wrap(phaseHistory[i-1].t1)*scale;
                        const y1 = cy + wrap(phaseHistory[i-1].t2)*scale;
                        const x2 = cx + wrap(phaseHistory[i].t1)*scale;
                        const y2 = cy + wrap(phaseHistory[i].t2)*scale;
                        if (Math.abs(x1-x2) < pw*0.4 && Math.abs(y1-y2) < ph*0.4) {
                            p.line(
                                p.constrain(x1,px+3,px+pw-3), p.constrain(y1,py+3,py+ph-3),
                                p.constrain(x2,px+3,px+pw-3), p.constrain(y2,py+3,py+ph-3)
                            );
                        }
                    }
                }
                p.noStroke(); p.fill(232, 160, 76);
                p.circle(
                    p.constrain(cx+wrap(stateA[0])*scale, px+3, px+pw-3),
                    p.constrain(cy+wrap(stateA[1])*scale, py+3, py+ph-3),
                    5
                );
                p.pop();
            }

            // Energy sparkline inset
            function drawEnergySparkline(px, py, pw, ph) {
                p.push();
                p.noStroke(); p.fill(8, 12, 22, 215); p.rect(px, py, pw, ph, 7);
                p.stroke(35, 48, 70); p.strokeWeight(1); p.noFill(); p.rect(px, py, pw, ph, 7);
                p.noStroke(); p.fill(65, 85, 120); p.textSize(8.5);
                p.textAlign(p.LEFT, p.TOP); p.text('Energy (RK4 drift)', px+5, py+4);
                if (energyHistory.length > 2) {
                    const mn = Math.min(...energyHistory);
                    const mx = Math.max(...energyHistory);
                    const range = Math.max(Math.abs(mx-mn), 0.01);
                    p.noFill(); p.stroke(45, 212, 191, 190); p.strokeWeight(1.5);
                    p.beginShape();
                    for (let i = 0; i < energyHistory.length; i++) {
                        const x = px+5 + (i/(energyHistory.length-1))*(pw-10);
                        const y = py+ph-7 - ((energyHistory[i]-mn)/range)*(ph-18);
                        p.vertex(x, y);
                    }
                    p.endShape();
                    if (baseEnergy !== null) {
                        const ry = py+ph-7 - ((baseEnergy-mn)/range)*(ph-18);
                        p.drawingContext.setLineDash([3, 4]);
                        p.stroke(255, 255, 255, 28); p.strokeWeight(1);
                        p.line(px+5, ry, px+pw-5, ry);
                        p.drawingContext.setLineDash([]);
                    }
                }
                p.pop();
            }

            // Vertical chaos-divergence bar
            function drawDivergenceBar(px, py, pw, ph, div) {
                const logD  = Math.log10(Math.max(div, 1e-6));
                const norm  = p.constrain((logD - (-6)) / (Math.log10(Math.PI+1e-9) - (-6)), 0, 1);
                const cr = Math.round(p.lerp(45,  232, norm));
                const cg = Math.round(p.lerp(212,  80, norm));
                const cb = Math.round(p.lerp(191,  76, norm));
                p.push();
                p.noStroke(); p.fill(8, 12, 22, 215); p.rect(px, py, pw, ph, 5);
                const barH = (ph-22)*norm;
                p.fill(cr, cg, cb, 190); p.rect(px+4, py+ph-11-barH, pw-8, barH, 3);
                p.stroke(35, 48, 70); p.strokeWeight(1); p.noFill(); p.rect(px, py, pw, ph, 5);
                p.noStroke(); p.fill(65, 85, 120); p.textSize(8);
                p.textAlign(p.CENTER, p.TOP); p.text('Dt', px+pw*0.5, py+4);
                p.fill(cr, cg, cb); p.textSize(8);
                p.textAlign(p.CENTER, p.BOTTOM);
                p.text(div < 0.01 ? div.toExponential(0) : div.toFixed(3), px+pw*0.5, py+ph-2);
                p.pop();
            }

            // Main draw loop
            p.draw = function() {
                p.background(7, 9, 15);

                const originX = p.width * 0.5;
                const originY = p.height * 0.31;
                const l1 = ctx.params.rodLength1;
                const l2 = ctx.params.rodLength2;
                const TRAIL_MAX = 350;
                const dt = 0.04 * ctx.speed;

                if (ctx.isPlaying && !draggedBob) {
                    for (let s = 0; s < 4; s++) {
                        stateA = rk4(stateA, dt*0.25);
                        stateB = rk4(stateB, dt*0.25);
                    }
                }

                const x1A = originX + l1*Math.sin(stateA[0]);
                const y1A = originY + l1*Math.cos(stateA[0]);
                const x2A = x1A    + l2*Math.sin(stateA[1]);
                const y2A = y1A    + l2*Math.cos(stateA[1]);
                const x1B = originX + l1*Math.sin(stateB[0]);
                const y1B = originY + l1*Math.cos(stateB[0]);
                const x2B = x1B    + l2*Math.sin(stateB[1]);
                const y2B = y1B    + l2*Math.cos(stateB[1]);

                if (ctx.isPlaying) {
                    trailA.push({x:x2A, y:y2A}); if (trailA.length > TRAIL_MAX) trailA.shift();
                    trailB.push({x:x2B, y:y2B}); if (trailB.length > TRAIL_MAX) trailB.shift();
                    phaseHistory.push({t1:stateA[0], t2:stateA[1]});
                    if (phaseHistory.length > 700) phaseHistory.shift();
                    const E = totalEnergy(stateA);
                    if (baseEnergy === null) baseEnergy = E;
                    energyHistory.push(E); if (energyHistory.length > 200) energyHistory.shift();
                }

                // 1. Fading trails
                fadingTrail(trailB, 124, 106, 247);
                fadingTrail(trailA, 232, 160, 76);

                // 2. Ghost shadow rods
                p.stroke(124, 106, 247, 40); p.strokeWeight(1.2); p.noFill();
                p.line(originX, originY, x1B, y1B); p.line(x1B, y1B, x2B, y2B);
                p.fill(124, 106, 247, 55); p.noStroke();
                p.circle(x1B, y1B, 8); p.circle(x2B, y2B, 10);

                // 3. Main rods — metallic with shadow + specular
                p.stroke(18, 23, 38, 90); p.strokeWeight(4.5);
                p.line(originX+1.5, originY+2, x1A+1.5, y1A+2);
                p.line(x1A+1.5, y1A+2, x2A+1.5, y2A+2);
                p.stroke(155, 172, 210, 220); p.strokeWeight(3);
                p.line(originX, originY, x1A, y1A); p.line(x1A, y1A, x2A, y2A);
                p.stroke(220, 230, 255, 70); p.strokeWeight(1);
                p.line(originX-0.5, originY-0.5, x1A-0.5, y1A-0.5);
                p.line(x1A-0.5, y1A-0.5, x2A-0.5, y2A-0.5);

                // 4. Pivot mount
                p.noStroke(); p.fill(55, 70, 100); p.circle(originX, originY, 18);
                p.fill(28, 38, 62); p.circle(originX, originY, 9);
                p.fill(78, 94, 130); p.circle(originX, originY, 5);

                // 5. Upper bob (teal)
                const r1 = Math.max(10, 10 + ctx.params.bobMass1*0.28);
                p.noStroke(); p.fill(45, 212, 191, 30); p.circle(x1A, y1A, (r1+12)*2);
                p.fill(45, 212, 191, 75); p.circle(x1A, y1A, (r1+5)*2);
                p.fill(45, 212, 191); p.stroke(7, 9, 15); p.strokeWeight(2);
                p.circle(x1A, y1A, r1*2);
                p.noStroke(); p.fill(255, 255, 255, 50);
                p.circle(x1A - r1*0.28, y1A - r1*0.28, r1*0.52);

                // 6. Lower bob (amber)
                const r2 = Math.max(12, 12 + ctx.params.bobMass2*0.28);
                p.noStroke(); p.fill(232, 160, 76, 30); p.circle(x2A, y2A, (r2+14)*2);
                p.fill(232, 160, 76, 75); p.circle(x2A, y2A, (r2+6)*2);
                p.fill(232, 160, 76); p.stroke(7, 9, 15); p.strokeWeight(2);
                p.circle(x2A, y2A, r2*2);
                p.noStroke(); p.fill(255, 255, 255, 50);
                p.circle(x2A - r2*0.28, y2A - r2*0.28, r2*0.52);

                // 7. Angular velocity arcs
                if (!draggedBob) {
                    angularVelocityArc(x1A, y1A, stateA[2], r1, 45, 212, 191);
                    angularVelocityArc(x2A, y2A, stateA[3], r2, 232, 160, 76);
                }

                // 8. Inset panels
                if (p.width >= 500) {
                    drawPhasePortrait(12, 14, 130, 110);
                    drawEnergySparkline(p.width - 175, 14, 172, 68);
                    const div = Math.abs(stateA[1] - stateB[1]) % (2*Math.PI);
                    drawDivergenceBar(p.width - 34, 90, 28, 102, div);
                }

                // 9. Telemetry
                const E   = totalEnergy(stateA);
                const div = Math.abs(stateA[1] - stateB[1]) % (2*Math.PI);
                ctx._telemetry = {
                    'Total Energy':   `${E.toFixed(2)} J`,
                    'Lyapunov Delta': `${div.toFixed(4)} rad`,
                    'Omega 1': `${stateA[2].toFixed(2)} rad/s`,
                    'Omega 2': `${stateA[3].toFixed(2)} rad/s`
                };
                ctx.updateTelemetry();

                // 10. Caption
                p.noStroke(); p.fill(58, 78, 112); p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('Amber = main  |  Violet = shadow (+0.001 rad)  |  Drag bobs to set initial conditions', 14, p.height - 10);
            };

            function ptr() {
                return p.touches && p.touches.length > 0
                    ? { x: p.touches[0].x, y: p.touches[0].y }
                    : { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = ptr();
                const oX = p.width*0.5, oY = p.height*0.31;
                const l1v = ctx.params.rodLength1, l2v = ctx.params.rodLength2;
                const r1 = Math.max(10, 10+ctx.params.bobMass1*0.28);
                const r2 = Math.max(12, 12+ctx.params.bobMass2*0.28);
                const x1 = oX + l1v*Math.sin(stateA[0]);
                const y1 = oY + l1v*Math.cos(stateA[0]);
                const x2 = x1 + l2v*Math.sin(stateA[1]);
                const y2 = y1 + l2v*Math.cos(stateA[1]);
                if (Math.hypot(pos.x-x2, pos.y-y2) < r2+16) {
                    draggedBob=2; prevDragAngle=stateA[1]; lastDragDelta=0; return false;
                } else if (Math.hypot(pos.x-x1, pos.y-y1) < r1+14) {
                    draggedBob=1; prevDragAngle=stateA[0]; lastDragDelta=0; return false;
                }
            };

            p.mouseDragged = function() {
                if (!draggedBob) return;
                const pos = ptr();
                const oX = p.width*0.5, oY = p.height*0.31;
                const l1v = ctx.params.rodLength1;
                if (draggedBob === 1) {
                    const angle = Math.atan2(pos.x-oX, pos.y-oY);
                    lastDragDelta = angle - prevDragAngle;
                    prevDragAngle = angle;
                    stateA[0]=angle; stateA[2]=0;
                    stateB[0]=angle+0.001; stateB[2]=0;
                } else {
                    const x1 = oX + l1v*Math.sin(stateA[0]);
                    const y1 = oY + l1v*Math.cos(stateA[0]);
                    const angle = Math.atan2(pos.x-x1, pos.y-y1);
                    lastDragDelta = angle - prevDragAngle;
                    prevDragAngle = angle;
                    stateA[1]=angle; stateA[3]=0;
                    stateB[1]=angle; stateB[3]=0;
                }
                trailA=[]; trailB=[]; phaseHistory=[]; energyHistory=[]; baseEnergy=null;
                return false;
            };

            p.mouseReleased = function() {
                if (!draggedBob) return;
                const omega = p.constrain(lastDragDelta * 14, -20, 20);
                if (draggedBob===1) { stateA[2]=omega; stateB[2]=omega; }
                else                { stateA[3]=omega; stateB[3]=omega; }
                draggedBob = null;
            };

            p.touchStarted = p.mousePressed;
            p.touchMoved   = p.mouseDragged;
            p.touchEnded   = p.mouseReleased;
        }
    });

    sim.mount();
    return sim;
};
