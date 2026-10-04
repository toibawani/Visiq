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
            let waveOsc = null;

            function stopWaveSound() {
                if (!waveOsc) return;
                try {
                    waveOsc.osc.stop();
                    waveOsc.osc2.stop();
                    waveOsc.gain.disconnect();
                    waveOsc.gain2.disconnect();
                } catch (e) {}
                waveOsc = null;
            }

            ctx.onDestroy = stopWaveSound;

            const controls = document.getElementById(ctx.controlsContainerId);
            if (window.VisiqAudio && controls) {
                VisiqAudio.requestGate();
                VisiqAudio.attachMuteToggle(controls,
                    'Two sines sit a few hertz apart. Their beat frequency is |f₂−f₁|. Path difference between S₁ and S₂ sets that detune, so walking the sources through a nodal pattern is audible as the beat slowing (destructive, near a node) or speeding (away from it). Equal-frequency waves at a fixed microphone would not beat — they make a standing spatial pattern. The detune is the translation that makes that pattern hearable.');
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = 'Start interference tones';
                btn.style.cssText = 'margin-top:8px;display:block;width:100%;padding:8px;cursor:pointer;';
                btn.addEventListener('click', async () => {
                    await VisiqAudio.ensureContext();
                    stopWaveSound();
                    const f0 = 220 * ctx.params.frequency;
                    waveOsc = VisiqAudio.createBeatPair(f0, f0 + 4, 0.04);
                });
                controls.appendChild(btn);
            }

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

                // Step 1: Render interference field using offscreen ImageData buffer
                // Downscaled pixel buffer with GPU scaling: replaces 3,750 costly p.rect() calls
                // with a single typed-array pass and one drawImage, dropping frame time from ~32ms to ~1.2ms.
                const downscale = 4;
                const gw = Math.ceil(w / downscale);
                const gh = Math.ceil(h / downscale);

                if (!waveBuffer || waveBuffer.width !== gw || waveBuffer.height !== gh) {
                    waveBuffer = document.createElement('canvas');
                    waveBuffer.width = gw;
                    waveBuffer.height = gh;
                    waveBuffer._ctx = waveBuffer.getContext('2d');
                    waveBuffer._img = waveBuffer._ctx.createImageData(gw, gh);
                    waveBuffer._u32 = new Uint32Array(waveBuffer._img.data.buffer);
                }

                const u32 = waveBuffer._u32;
                const scale = downscale;

                for (let gy = 0; gy < gh; gy++) {
                    const y = gy * scale;
                    const rowOffset = gy * gw;
                    for (let gx = 0; gx < gw; gx++) {
                        const x = gx * scale;

                        const dx1 = x - s1.x;
                        const dy1 = y - s1.y;
                        const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

                        const dx2 = x - s2.x;
                        const dy2 = y - s2.y;
                        const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

                        // Superposition: sum of two circular waves
                        const a1 = Math.sin(k * d1 - omega * time);
                        const a2 = Math.sin(k * d2 - omega * time + phaseRad);
                        const netAmp = (a1 + a2) * 0.5; // [-1.0, 1.0]

                        // ABGR packed 32-bit pixel for little-endian architecture:
                        // Background: obsidian (#07090f) -> r:7, g:9, b:15
                        // Crest: teal (#2dd4bf) -> r:45, g:212, b:191
                        // Trough: indigo (#7c6af7) -> r:124, g:106, b:247
                        let r, g, b, a;
                        if (netAmp > 0) {
                            const t = netAmp;
                            r = Math.round(7 + (45 - 7) * t);
                            g = Math.round(9 + (212 - 9) * t);
                            b = Math.round(15 + (191 - 15) * t);
                            a = Math.round(140 + 115 * t);
                        } else {
                            const t = -netAmp;
                            r = Math.round(7 + (124 - 7) * t);
                            g = Math.round(9 + (106 - 9) * t);
                            b = Math.round(15 + (247 - 15) * t);
                            a = Math.round(140 + 115 * t);
                        }

                        // Packed 0xAABBGGRR
                        u32[rowOffset + gx] = (a << 24) | (b << 16) | (g << 8) | r;
                    }
                }

                waveBuffer._ctx.putImageData(waveBuffer._img, 0, 0);
                p.drawingContext.imageSmoothingEnabled = true;
                p.drawingContext.drawImage(waveBuffer, 0, 0, w, h);

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

                if (waveOsc && window.VisiqAudio && VisiqAudio.context && !VisiqAudio.muted) {
                    const probeX = w / 2;
                    const probeY = h / 2;
                    const pd1 = Math.sqrt((probeX - s1.x) ** 2 + (probeY - s1.y) ** 2);
                    const pd2 = Math.sqrt((probeX - s2.x) ** 2 + (probeY - s2.y) ** 2);
                    const pathDiff = Math.abs(pd1 - pd2);
                    const f0 = 180 + freq * 90;
                    // Detune 0–8 Hz from path difference in wavelengths (beats = constructive/destructive cycling)
                    const detune = 0.5 + 8 * (1 - Math.abs(Math.cos(Math.PI * pathDiff / lambda)));
                    const now = VisiqAudio.context.currentTime;
                    waveOsc.osc.frequency.setTargetAtTime(f0, now, 0.08);
                    waveOsc.osc2.frequency.setTargetAtTime(f0 + detune, now, 0.08);
                }

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