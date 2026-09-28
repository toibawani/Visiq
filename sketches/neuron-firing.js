// ===== NEURON ACTION POTENTIAL =====
// Hodgkin-Huxley all-or-nothing electrical spike and saltatory conduction along axon
// Biology: Resting (-70mV) → Depolarization (Na⁺ influx) → Repolarization (K⁺ efflux) → Refractory

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'neuron-firing',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            stimulusCurrent: { value: 15, min: 2, max: 35, step: 1, label: 'Stimulus Injection', unit: 'μA' },
            myelination: { value: 1, min: 0, max: 1, step: 1, label: 'Myelin Sheaths', unit: 'toggle' },
            axonLength: { value: 380, min: 250, max: 500, step: 20, label: 'Axon Length', unit: 'μm' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Membrane Voltage': '-70.0 mV',
                'Firing Status': 'Resting',
                'Axon Spike Pos': 'Soma',
                'Conduction Speed': '0 m/s'
            };
        },
        setup(p, ctx) {
            let Vm = -70.0; // Resting potential in mV
            let spikeX = -1; // -1 means no active spike propagating
            let voltageHistory = [];
            let isStimulating = false;
            let refractoryTimer = 0;

            function resetNeuron() {
                Vm = -70.0;
                spikeX = -1;
                voltageHistory = [];
                refractoryTimer = 0;
            }

            ctx.onReset = resetNeuron;
            ctx.onResize = resetNeuron;

            // Trigger an electrical impulse
            function triggerSpike() {
                if (refractoryTimer > 0) return;
                const stim = ctx.params.stimulusCurrent;
                // Threshold is roughly 12 μA (-55 mV equivalent)
                if (stim >= 12) {
                    spikeX = 0; // Launch spike from soma along axon
                    Vm = 35.0; // Peak depolarization
                    refractoryTimer = 40;
                } else {
                    // Sub-threshold graded potential
                    Vm = -70.0 + stim * 0.9;
                }
            }

            p.draw = function() {
                p.background(7, 9, 15);

                const w = p.width;
                const h = p.height;
                const axonY = h * 0.42;
                const somaX = 70;
                const dt = ctx.speed;
                const isMyelinated = ctx.params.myelination > 0.5;
                const speedMult = isMyelinated ? 7.0 : 2.5;

                // 1. Action potential propagation along axon
                if (ctx.isPlaying) {
                    if (refractoryTimer > 0) {
                        refractoryTimer -= dt;
                    }

                    if (spikeX >= 0) {
                        spikeX += speedMult * dt;
                        // Voltage curve during propagation
                        if (spikeX < 60) {
                            Vm = 35.0; // Depolarizing
                        } else if (spikeX < 140) {
                            Vm = -85.0; // Hyperpolarizing undershoot
                        } else {
                            Vm = -70.0; // Return to baseline
                        }

                        if (spikeX > ctx.params.axonLength) {
                            spikeX = -1; // Reached terminal buttons
                            Vm = -70.0;
                        }
                    } else if (refractoryTimer <= 0) {
                        // Relax smoothly back to -70mV
                        Vm = Vm * 0.9 + (-70.0) * 0.1;
                    }

                    // Record oscilloscope trace
                    voltageHistory.push(Vm);
                    if (voltageHistory.length > 140) voltageHistory.shift();
                }

                // 2. Render Neuron Morphology
                // Soma (Cell Body)
                p.fill('#7c6af7'); // Violet soma
                p.stroke('#283150');
                p.strokeWeight(3);
                p.circle(somaX, axonY, 56);

                // Nucleus
                p.fill('#1a2035');
                p.noStroke();
                p.circle(somaX, axonY, 22);

                // Dendrites radiating from soma
                p.stroke('#7c6af7');
                p.strokeWeight(2);
                const dendriteAngles = [-2.5, -2.0, -1.5, 1.5, 2.0, 2.5];
                for (const angle of dendriteAngles) {
                    const xEnd = somaX + Math.cos(angle) * 48;
                    const yEnd = axonY + Math.sin(angle) * 48;
                    p.line(somaX, axonY, xEnd, yEnd);
                    p.circle(xEnd, yEnd, 4);
                }

                // Axon trunk
                const axonEnd = somaX + ctx.params.axonLength;
                p.stroke('#64748b');
                p.strokeWeight(6);
                p.line(somaX, axonY, axonEnd, axonY);

                // Myelin Sheaths (Schwann Cells) with Nodes of Ranvier
                if (isMyelinated) {
                    const sheathLen = 50;
                    const gapLen = 12;
                    let curX = somaX + 35;
                    p.strokeWeight(16);
                    p.strokeCap(p.ROUND);

                    while (curX + sheathLen < axonEnd) {
                        p.stroke('#2dd4bf'); // Teal myelin sheath
                        p.line(curX, axonY, curX + sheathLen, axonY);
                        curX += sheathLen + gapLen;
                    }
                }

                // Axon Terminals
                p.stroke('#7c6af7');
                p.strokeWeight(2);
                p.line(axonEnd, axonY, axonEnd + 25, axonY - 18);
                p.line(axonEnd, axonY, axonEnd + 25, axonY);
                p.line(axonEnd, axonY, axonEnd + 25, axonY + 18);
                p.fill('#2dd4bf');
                p.noStroke();
                p.circle(axonEnd + 25, axonY - 18, 6);
                p.circle(axonEnd + 25, axonY, 6);
                p.circle(axonEnd + 25, axonY + 18, 6);

                // Active Action Potential Pulse
                if (spikeX >= 0) {
                    const pulseX = somaX + spikeX;
                    // Glowing ion pulse
                    p.fill('rgba(232, 160, 76, 0.4)');
                    p.noStroke();
                    p.circle(pulseX, axonY, 28);
                    p.fill('#e8a04c'); // Amber electrical impulse
                    p.circle(pulseX, axonY, 14);
                }

                // 3. Oscilloscope Voltage Trace (Bottom region)
                const oscX = 30;
                const oscY = h * 0.65;
                const oscW = w - 60;
                const oscH = h * 0.26;

                p.fill('#0f1117');
                p.stroke('#283150');
                p.strokeWeight(1.5);
                p.rect(oscX, oscY, oscW, oscH, 6);

                // Voltage baseline grid lines
                p.stroke('#1e2438');
                p.strokeWeight(1);
                // 0 mV line
                const y0 = oscY + oscH * 0.35;
                p.line(oscX, y0, oscX + oscW, y0);
                // Threshold -55 mV line
                const yThresh = oscY + oscH * 0.62;
                p.stroke('rgba(232, 160, 76, 0.4)');
                p.line(oscX, yThresh, oscX + oscW, yThresh);
                // Resting -70 mV line
                const yRest = oscY + oscH * 0.72;
                p.stroke('rgba(45, 212, 191, 0.4)');
                p.line(oscX, yRest, oscX + oscW, yRest);

                // Grid labels
                p.fill('#94a3b8');
                p.noStroke();
                p.textSize(10);
                p.textAlign(p.LEFT, p.CENTER);
                p.text('+35 mV (Peak Na⁺)', oscX + 8, oscY + 12);
                p.text('-55 mV (Threshold)', oscX + 8, yThresh - 6);
                p.text('-70 mV (Resting)', oscX + 8, yRest - 6);

                // Plot trace
                if (voltageHistory.length > 1) {
                    p.noFill();
                    p.stroke('#2dd4bf');
                    p.strokeWeight(2);
                    p.beginShape();
                    for (let i = 0; i < voltageHistory.length; i++) {
                        const vx = oscX + 110 + (i / 140) * (oscW - 130);
                        // Map mV [-90, +45] to oscH
                        const normV = (voltageHistory[i] - (-90)) / 135;
                        const vy = oscY + oscH - normV * oscH;
                        p.vertex(vx, vy);
                    }
                    p.endShape();
                }

                // Telemetry
                let status = 'Resting (-70mV)';
                if (Vm > 0) status = 'Depolarized (Na⁺ Open)';
                else if (Vm < -75) status = 'Hyperpolarized (Refractory)';
                else if (spikeX >= 0) status = 'Propagating Along Axon';

                const condSpeed = isMyelinated ? '100 - 120 m/s (Saltatory)' : '1 - 2 m/s (Continuous)';

                ctx._telemetry = {
                    'Membrane Voltage': `${Vm.toFixed(1)} mV`,
                    'Firing Status': status,
                    'Axon Spike Pos': spikeX >= 0 ? `${spikeX.toFixed(0)} μm` : 'Inactive',
                    'Conduction Speed': condSpeed
                };
                ctx.updateTelemetry();

                // Instruction
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Click the soma cell body or inject current ≥ 12 μA to trigger all-or-nothing action potential', 16, h - 8);
            };

            function getPointerPos() {
                if (p.touches && p.touches.length > 0) return { x: p.touches[0].x, y: p.touches[0].y };
                return { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = getPointerPos();
                const somaX = 70;
                const axonY = p.height * 0.42;
                if (Math.hypot(pos.x - somaX, pos.y - axonY) < 45) {
                    triggerSpike();
                    return false;
                }
            };
        }
    });

    sim.mount();
    return sim;
};
