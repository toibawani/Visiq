// ===== WAVE INTERFERENCE =====
// Two-source ripple tank visualizer with wave superposition and nodal lines
// Physics: y(x,y,t) = A₁ sin(k r₁ - ω t) + A₂ sin(k r₂ - ω t + φ)

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'wave-interference',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            wavelength: { value: 36, min: 18, max: 70, step: 2, label: 'Wavelength (λ)', unit: 'px' },
            frequency: { value: 1.2, min: 0.4, max: 2.5, step: 0.1, label: 'Frequency (f)', unit: 'Hz' },
            separation: { value: 140, min: 40, max: 280, step: 10, label: 'Source Distance (d)', unit: 'px' },
            phaseShift: { value: 0, min: 0, max: 180, step: 15, label: 'Phase Shift (φ)', unit: 'deg' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Wave Speed (v)': '0 px/s',
                'Wavenumber (k)': '0 rad/px',
                'Nodal Lines': '0',
                'Central Intensity': '100%'
            };
        },
        setup(p, ctx) {
            let s1 = { x: 0, y: 0 };
            let s2 = { x: 0, y: 0 };
            let draggedSource = null;

            function updateSourcePositions() {
                const cx = p.width / 2;
                const cy = p.height / 2;
                const halfD = ctx.params.separation / 2;
                s1.x = cx - halfD;
                s1.y = cy;
                s2.x = cx + halfD;
                s2.y = cy;
            }

            updateSourcePositions();
            ctx.onReset = updateSourcePositions;
            ctx.onResize = updateSourcePositions;

            ctx.onParamChange = (key) => {
                if (key === 'separation') {
                    updateSourcePositions();
                }
            };

            let waveBuffer = null;

            p.draw = function() {
                const w = p.width;
                const h = p.height;
                const lambda = ctx.params.wavelength;
                const freq = ctx.params.frequency;
                const k = (2 * Math.PI) / lambda;
                const omega = 2 * Math.PI * freq;
                const phaseRad = (ctx.params.phaseShift * Math.PI) / 180;
                const time = (p.millis() / 1000) * ctx.speed;

                // Step 1: Render interference field using downsampled grid for high performance
                p.background(7, 9, 15);

                const step = 8; // 8px resolution grid ensures stable 60fps on mid-range devices
                const cols = Math.ceil(w / step);
                const rows = Math.ceil(h / step);

                p.noStroke();
                for (let r = 0; r < rows; r++) {
                    const y = r * step;
                    for (let c = 0; c < cols; c++) {
                        const x = c * step;

                        const d1 = Math.sqrt((x - s1.x) ** 2 + (y - s1.y) ** 2);
                        const d2 = Math.sqrt((x - s2.x) ** 2 + (y - s2.y) ** 2);

                        // Superposition: sum of two circular waves
                        const a1 = Math.sin(k * d1 - omega * time);
                        const a2 = Math.sin(k * d2 - omega * time + phaseRad);
                        const netAmp = (a1 + a2) * 0.5; // [-1.0, 1.0]

                        if (netAmp > 0) {
                            // Constructive crest: Teal gradient
                            const alpha = Math.floor(netAmp * 220);
                            p.fill(45, 212, 191, alpha);
                        } else {
                            // Constructive trough: Indigo gradient
                            const alpha = Math.floor(-netAmp * 220);
                            p.fill(124, 106, 247, alpha);
                        }
                        p.rect(x, y, step, step);
                    }
                }

                // Step 2: Draw Sources with drag handles
                function drawSource(s, label, color) {
                    p.noStroke();
                    p.fill(color);
                    p.circle(s.x, s.y, 22);

                    p.stroke('#ffffff');
                    p.strokeWeight(2);
                    p.noFill();
                    p.circle(s.x, s.y, 28);

                    p.fill('#ffffff');
                    p.noStroke();
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(11);
                    p.text(label, s.x, s.y);
                }

                drawSource(s1, 'S₁', '#2dd4bf');
                drawSource(s2, 'S₂', '#e8a04c');

                // Step 3: Draw baseline between sources
                p.stroke('rgba(255, 255, 255, 0.25)');
                p.strokeWeight(1);
                p.line(s1.x, s1.y, s2.x, s2.y);

                // Telemetry calculations
                const waveSpeed = lambda * freq;
                const d = Math.sqrt((s2.x - s1.x) ** 2 + (s2.y - s1.y) ** 2);
                const maxNodalOrders = Math.floor(2 * d / lambda);

                ctx._telemetry = {
                    'Wave Speed (v)': `${waveSpeed.toFixed(1)} px/s`,
                    'Wavenumber (k)': `${k.toFixed(3)} rad/px`,
                    'Source Spacing': `${d.toFixed(0)} px`,
                    'Possible Orders': `${maxNodalOrders}`
                };
                ctx.updateTelemetry();

                // Hint
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Drag S₁ or S₂ to move emitters • Teal = Crests, Indigo = Troughs', 16, p.height - 14);
            };

            function getPointerPos() {
                if (p.touches && p.touches.length > 0) return { x: p.touches[0].x, y: p.touches[0].y };
                return { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = getPointerPos();
                const d1 = Math.sqrt((pos.x - s1.x) ** 2 + (pos.y - s1.y) ** 2);
                const d2 = Math.sqrt((pos.x - s2.x) ** 2 + (pos.y - s2.y) ** 2);

                if (d1 < 30) {
                    draggedSource = s1;
                    return false;
                } else if (d2 < 30) {
                    draggedSource = s2;
                    return false;
                }
            };

            p.mouseDragged = function() {
                if (draggedSource) {
                    const pos = getPointerPos();
                    draggedSource.x = p.constrain(pos.x, 20, p.width - 20);
                    draggedSource.y = p.constrain(pos.y, 20, p.height - 20);
                    return false;
                }
            };

            p.mouseReleased = function() {
                draggedSource = null;
            };
        }
    });

    sim.mount();
    return sim;
};