// ===== WAVE INTERFERENCE =====
// Two-source ripple tank visualizer with wave superposition and nodal lines
// Physics: y(x,y,t) = A₁ sin(k r₁ - ω t) + A₂ sin(k r₂ - ω t + φ)

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'wave-interference',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            wavelength:  { value: 36,  min: 18,  max: 70,  step: 2,   label: 'Wavelength (λ)',     unit: 'px'  },
            frequency:   { value: 1.2, min: 0.4, max: 2.5, step: 0.1, label: 'Frequency (f)',       unit: 'Hz'  },
            separation:  { value: 140, min: 40,  max: 280, step: 10,  label: 'Source Distance (d)', unit: 'px'  },
            phaseShift:  { value: 0,   min: 0,   max: 180, step: 15,  label: 'Phase Shift (φ)',     unit: 'deg' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Wave Speed (v)':  '0 px/s',
                'Wavenumber (k)':  '0 rad/px',
                'Source Spacing':  '0 px',
                'Possible Orders': '0'
            };
        },

        setup(p, ctx) {
            // ── Color palette ──────────────────────────────────────────
            const PHYS = VisualKit.getCategoryRGB('physics');   // cyan-teal (S₁)
            const AMBER = [232, 160, 76];                        // amber   (S₂)

            // ── State ──────────────────────────────────────────────────
            let s1 = { x: 0, y: 0 };
            let s2 = { x: 0, y: 0 };
            let draggedSource  = null;
            let drag1 = VisualKit.createDragTracker();
            let drag2 = VisualKit.createDragTracker();
            let waveOsc = null;
            let waveBuffer = null;

            // Stats sparkline history: wave speed over time
            let speedHistory = [];

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
                const cx = p.width  / 2;
                const cy = p.height / 2;
                const halfD = ctx.params.separation / 2;
                s1.x = cx - halfD;
                s1.y = cy;
                s2.x = cx + halfD;
                s2.y = cy;
            }

            updateSourcePositions();
            ctx.onReset  = updateSourcePositions;
            ctx.onResize = updateSourcePositions;
            ctx.onParamChange = (key) => {
                if (key === 'separation') updateSourcePositions();
            };

            // ── Draw source with glow ──────────────────────────────────
            function drawSource(s, label, rgb) {
                VisualKit.drawGlowBody(p, s.x, s.y, 13, rgb, {
                    outerMult:  2.8, innerMult:  1.7,
                    outerAlpha: 40,  innerAlpha: 90,
                    strokeWidth: 2,  specular: true
                });
                p.push();
                p.noStroke();
                p.fill(255, 255, 255, 210);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(11);
                p.text(label, s.x, s.y + 0.5);
                p.pop();
            }

            p.draw = function() {
                const w = p.width;
                const h = p.height;
                const lambda   = ctx.params.wavelength;
                const freq     = ctx.params.frequency;
                const k        = (2 * Math.PI) / lambda;
                const omega    = 2 * Math.PI * freq;
                const phaseRad = (ctx.params.phaseShift * Math.PI) / 180;
                const time     = (p.millis() / 1000) * ctx.speed;

                // ─────────────────────────────────────────────────────
                // 1. Interference field — downscaled ImageData pixel buffer
                // (3750 rect() calls → single typed-array pass → one drawImage)
                // ─────────────────────────────────────────────────────
                const downscale = 4;
                const gw = Math.ceil(w / downscale);
                const gh = Math.ceil(h / downscale);

                if (!waveBuffer || waveBuffer.width !== gw || waveBuffer.height !== gh) {
                    waveBuffer = document.createElement('canvas');
                    waveBuffer.width  = gw;
                    waveBuffer.height = gh;
                    waveBuffer._ctx   = waveBuffer.getContext('2d');
                    waveBuffer._img   = waveBuffer._ctx.createImageData(gw, gh);
                    waveBuffer._u32   = new Uint32Array(waveBuffer._img.data.buffer);
                }

                const u32   = waveBuffer._u32;
                const scale = downscale;

                for (let gy = 0; gy < gh; gy++) {
                    const y = gy * scale;
                    const rowOffset = gy * gw;
                    for (let gx = 0; gx < gw; gx++) {
                        const x = gx * scale;

                        const dx1 = x - s1.x;
                        const dy1 = y - s1.y;
                        const d1  = Math.sqrt(dx1 * dx1 + dy1 * dy1);

                        const dx2 = x - s2.x;
                        const dy2 = y - s2.y;
                        const d2  = Math.sqrt(dx2 * dx2 + dy2 * dy2);

                        const a1 = Math.sin(k * d1 - omega * time);
                        const a2 = Math.sin(k * d2 - omega * time + phaseRad);
                        const netAmp = (a1 + a2) * 0.5; // [-1, 1]

                        let r, g, b, a;
                        if (netAmp > 0) {
                            // Crest: teal (#2dd4bf)
                            const t = netAmp;
                            r = Math.round(7  + (45  - 7)  * t);
                            g = Math.round(9  + (212 - 9)  * t);
                            b = Math.round(15 + (191 - 15) * t);
                            a = Math.round(140 + 115 * t);
                        } else {
                            // Trough: indigo (#7c6af7)
                            const t = -netAmp;
                            r = Math.round(7  + (124 - 7)  * t);
                            g = Math.round(9  + (106 - 9)  * t);
                            b = Math.round(15 + (247 - 15) * t);
                            a = Math.round(140 + 115 * t);
                        }
                        // Packed 0xAABBGGRR (little-endian)
                        u32[rowOffset + gx] = (a << 24) | (b << 16) | (g << 8) | r;
                    }
                }

                waveBuffer._ctx.putImageData(waveBuffer._img, 0, 0);
                p.drawingContext.imageSmoothingEnabled = true;
                p.drawingContext.drawImage(waveBuffer, 0, 0, w, h);

                // ─────────────────────────────────────────────────────
                // 2. Source baseline
                // ─────────────────────────────────────────────────────
                p.push();
                p.stroke(255, 255, 255, 30);
                p.strokeWeight(1);
                p.drawingContext.setLineDash([4, 6]);
                p.line(s1.x, s1.y, s2.x, s2.y);
                p.drawingContext.setLineDash([]);
                p.pop();

                // ─────────────────────────────────────────────────────
                // 3. Source handles
                // ─────────────────────────────────────────────────────
                drawSource(s1, 'S₁', PHYS);
                drawSource(s2, 'S₂', AMBER);

                // ─────────────────────────────────────────────────────
                // 4. Telemetry calculations
                // ─────────────────────────────────────────────────────
                const waveSpeed = lambda * freq;
                const d = Math.hypot(s2.x - s1.x, s2.y - s1.y);
                const maxNodalOrders = Math.floor(2 * d / lambda);

                speedHistory.push(waveSpeed);
                if (speedHistory.length > 80) speedHistory.shift();

                ctx._telemetry = {
                    'Wave Speed (v)':  `${waveSpeed.toFixed(1)} px/s`,
                    'Wavenumber (k)':  `${k.toFixed(3)} rad/px`,
                    'Source Spacing':  `${d.toFixed(0)} px`,
                    'Possible Orders': `${maxNodalOrders}`
                };
                ctx.updateTelemetry();

                // ─────────────────────────────────────────────────────
                // 5. Inset panel — wave-speed sparkline (top-right)
                // ─────────────────────────────────────────────────────
                const spkW = 148;
                const spkH = 52;
                const spkX = w - spkW - 14;
                const spkY = 14;
                if (speedHistory.length >= 2) {
                    VisualKit.drawSparkline(
                        p, spkX, spkY, spkW, spkH,
                        speedHistory, PHYS,
                        { label: 'Wave Speed v(t)', zeroFloor: true, cornerRadius: 7, textSize: 8.5 }
                    );
                }

                // Phase shift badge
                if (ctx.params.phaseShift !== 0) {
                    VisualKit.drawInsetPanel(p, 14, 14, 92, 30, '', { cornerRadius: 6 });
                    p.push();
                    p.noStroke();
                    p.fill(200, 200, 255, 180);
                    p.textSize(10);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.text(`φ = ${ctx.params.phaseShift}°`, 22, 29);
                    p.pop();
                }

                // ─────────────────────────────────────────────────────
                // 6. Audio update
                // ─────────────────────────────────────────────────────
                if (waveOsc && window.VisiqAudio && VisiqAudio.context && !VisiqAudio.muted) {
                    const probeX = w / 2;
                    const probeY = h / 2;
                    const pd1 = Math.hypot(probeX - s1.x, probeY - s1.y);
                    const pd2 = Math.hypot(probeX - s2.x, probeY - s2.y);
                    const pathDiff = Math.abs(pd1 - pd2);
                    const f0 = 180 + freq * 90;
                    const detune = 0.5 + 8 * (1 - Math.abs(Math.cos(Math.PI * pathDiff / lambda)));
                    const now = VisiqAudio.context.currentTime;
                    waveOsc.osc.frequency.setTargetAtTime(f0, now, 0.08);
                    waveOsc.osc2.frequency.setTargetAtTime(f0 + detune, now, 0.08);
                }

                // ─────────────────────────────────────────────────────
                // 7. Footer hint
                // ─────────────────────────────────────────────────────
                p.push();
                p.noStroke();
                p.fill(70, 90, 120);
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('Drag S₁ or S₂ to reposition emitters  ·  Teal = crests  ·  Indigo = troughs', 16, h - 10);
                p.pop();
            };

            // ── Pointer handling ───────────────────────────────────────
            function getPointerPos() {
                if (p.touches && p.touches.length > 0) return { x: p.touches[0].x, y: p.touches[0].y };
                return { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = getPointerPos();
                const d1 = Math.hypot(pos.x - s1.x, pos.y - s1.y);
                const d2 = Math.hypot(pos.x - s2.x, pos.y - s2.y);
                if (d1 < 30) {
                    draggedSource = s1;
                    drag1.start(pos.x, pos.y);
                    return false;
                } else if (d2 < 30) {
                    draggedSource = s2;
                    drag2.start(pos.x, pos.y);
                    return false;
                }
            };

            p.mouseDragged = function() {
                if (draggedSource) {
                    const pos = getPointerPos();
                    draggedSource.x = p.constrain(pos.x, 20, p.width  - 20);
                    draggedSource.y = p.constrain(pos.y, 20, p.height - 20);
                    return false;
                }
            };

            p.mouseReleased = function() {
                draggedSource = null;
            };

            p.touchStarted  = p.mousePressed;
            p.touchMoved    = p.mouseDragged;
            p.touchEnded    = p.mouseReleased;
        }
    });

    sim.mount();
    return sim;
};