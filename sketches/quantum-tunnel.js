// ===== QUANTUM TUNNELING =====
// Wave packet transmission and reflection across a finite rectangular potential barrier
// Physics: 1D Time-dependent Schrödinger equation approximation with exponential evanescent decay

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'quantum-tunnel',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            particleEnergy: { value: 3.5, min: 1.0, max: 8.0, step: 0.1, label: 'Particle Energy (E)', unit: 'eV' },
            barrierHeight: { value: 5.0, min: 2.0, max: 10.0, step: 0.1, label: 'Barrier Height (V₀)', unit: 'eV' },
            barrierWidth: { value: 40, min: 15, max: 90, step: 5, label: 'Barrier Width (L)', unit: 'nm' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Transmission (T)': '0.0%',
                'Reflection (R)': '100.0%',
                'Decay Factor (κ)': '0.0 nm⁻¹',
                'E / V₀ Ratio': '0.00'
            };
        },
        setup(p, ctx) {
            let packetX = 0;
            const sigma = 35; // packet spatial width

            function resetPacket() {
                packetX = p.width * 0.18;
            }

            resetPacket();
            ctx.onReset = resetPacket;
            ctx.onResize = resetPacket;

            p.draw = function() {
                p.background(7, 9, 15);

                const w = p.width;
                const h = p.height;
                const groundY = h * 0.70;
                const barrierCenter = w * 0.52;
                const bWidth = ctx.params.barrierWidth;
                const bLeft = barrierCenter - bWidth / 2;
                const bRight = barrierCenter + bWidth / 2;

                const E = ctx.params.particleEnergy;
                const V0 = ctx.params.barrierHeight;
                const dt = ctx.speed;

                // Advance wave packet position
                if (ctx.isPlaying) {
                    packetX += 1.8 * dt;
                    if (packetX > w + 120) {
                        resetPacket();
                    }
                }

                // Analytical tunneling transmission coefficient T
                let T = 0;
                let kappa = 0;
                if (E < V0) {
                    // Decay constant kappa = sqrt(2m(V0 - E)) / hbar
                    kappa = Math.sqrt(Math.max(0.01, V0 - E)) * 0.15;
                    const sinhVal = Math.sinh(kappa * bWidth * 0.1);
                    const denom = 1 + (V0 * V0 * sinhVal * sinhVal) / (4 * E * (V0 - E));
                    T = 1 / denom;
                } else {
                    const kPrime = Math.sqrt(Math.max(0.01, E - V0)) * 0.15;
                    const sinVal = Math.sin(kPrime * bWidth * 0.1);
                    const denom = 1 + (V0 * V0 * sinVal * sinVal) / (4 * E * (E - V0));
                    T = 1 / denom;
                }
                const R = Math.max(0, 1 - T);

                // Draw Potential Barrier V(x)
                const vScale = 22; // px per eV
                const barrierTopY = groundY - V0 * vScale;
                const energyY = groundY - E * vScale;

                // Barrier block
                p.noStroke();
                p.fill('rgba(232, 160, 76, 0.18)'); // Amber glow fill
                p.rect(bLeft, barrierTopY, bWidth, groundY - barrierTopY);

                p.stroke('#e8a04c');
                p.strokeWeight(2);
                p.line(bLeft, groundY, bLeft, barrierTopY);
                p.line(bLeft, barrierTopY, bRight, barrierTopY);
                p.line(bRight, barrierTopY, bRight, groundY);

                // Ground line
                p.stroke('#283150');
                p.strokeWeight(1.5);
                p.line(0, groundY, w, groundY);

                // Incident Energy level E (dashed line)
                p.stroke('#2dd4bf');
                p.strokeWeight(1);
                for (let x = 0; x < w; x += 10) {
                    p.line(x, energyY, x + 5, energyY);
                }

                p.fill('#2dd4bf');
                p.noStroke();
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text(`E = ${E.toFixed(1)} eV`, 16, energyY - 4);

                p.fill('#e8a04c');
                p.text(`V₀ = ${V0.toFixed(1)} eV`, bRight + 8, barrierTopY + 14);

                // Render wave packet |psi(x)|^2 and wavefunction Re(psi)
                const k0 = Math.sqrt(E) * 0.45;
                const time = (p.millis() / 300) * ctx.speed;

                p.noFill();
                p.stroke('#7c6af7');
                p.strokeWeight(2.5);

                p.beginShape();
                for (let x = 0; x < w; x += 3) {
                    let amp = 0;

                    if (packetX < bLeft) {
                        // Before entering barrier
                        const dist = x - packetX;
                        const env = Math.exp(-(dist * dist) / (2 * sigma * sigma));
                        const phase = k0 * dist - time;
                        amp = env * Math.cos(phase);
                    } else {
                        // In contact with or past barrier: split into transmitted and reflected packets
                        const elapsed = packetX - bLeft;

                        // Reflected packet (traveling left from bLeft)
                        const refCenter = bLeft - elapsed;
                        const distRef = x - refCenter;
                        const refEnv = Math.sqrt(R) * Math.exp(-(distRef * distRef) / (2 * sigma * sigma));
                        const refWave = refEnv * Math.cos(-k0 * distRef - time);

                        // Transmitted packet (traveling right from bRight)
                        const transCenter = bRight + elapsed;
                        const distTrans = x - transCenter;
                        const transEnv = Math.sqrt(T) * Math.exp(-(distTrans * distTrans) / (2 * sigma * sigma));
                        const transWave = transEnv * Math.cos(k0 * distTrans - time);

                        if (x < bLeft) {
                            amp = refWave;
                        } else if (x > bRight) {
                            amp = transWave;
                        } else {
                            // Exponential decay within the barrier
                            const depth = x - bLeft;
                            amp = Math.exp(-kappa * depth * 0.8) * Math.cos(time * 0.5) * 0.6;
                        }
                    }

                    const waveY = energyY - amp * 45;
                    p.vertex(x, waveY);
                }
                p.endShape();

                // Telemetry
                ctx._telemetry = {
                    'Transmission (T)': `${(T * 100).toFixed(1)}%`,
                    'Reflection (R)': `${(R * 100).toFixed(1)}%`,
                    'Decay Factor (κ)': `${kappa.toFixed(2)} nm⁻¹`,
                    'E / V₀ Ratio': `${(E / V0).toFixed(2)}`
                };
                ctx.updateTelemetry();

                // Explanatory note
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Wave packet splits into transmitted and reflected probability waves • R to re-fire', 16, h - 14);
            };
        }
    });

    sim.mount();
    return sim;
};
