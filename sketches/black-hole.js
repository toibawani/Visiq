// ===== BLACK HOLE SPACETIME =====
// Relativistic gravitational deflection and event horizon simulation
// Physics: Schwarzschild metric approximation (Paczyński-Wiita potential),
// photon sphere at 1.5 r_s, and innermost stable circular orbit (ISCO) at 3.0 r_s.

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'black-hole',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            bhMass: { value: 8.0, min: 2.0, max: 20.0, step: 0.5, label: 'Black Hole Mass', unit: 'M☉' },
            diskDensity: { value: 90, min: 30, max: 180, step: 10, label: 'Accretion Particles', unit: 'qty' },
            launchSpeed: { value: 4.5, min: 1.5, max: 10.0, step: 0.25, label: 'Test Particle Speed', unit: 'km/s' },
            showVectors: { value: 1, min: 0, max: 1, step: 1, label: 'Show Vectors', unit: '' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Schwarzschild (rₛ)': '0.0 km',
                'Photon Sphere (1.5rₛ)': '0.0 km',
                'ISCO Boundary (3.0rₛ)': '0.0 km',
                'Trapped Photons': '0'
            };
        },
        setup(p, ctx) {
            let particles = [];
            let photons = [];
            let starfield = [];
            let trappedCount = 0;
            let trappedHistory = [];
            const dragTracker = VisualKit.createDragTracker({ multiplier: 0.7, maxSpeed: 18 });
            let dragOrigin = null;

            function initBackgroundStars() {
                starfield = [];
                for (let i = 0; i < 90; i++) {
                    starfield.push({
                        x: Math.random() * p.width,
                        y: Math.random() * p.height,
                        brightness: 120 + Math.random() * 135,
                        size: 1 + Math.random() * 1.8
                    });
                }
            }

            function initAccretionDisk() {
                particles = [];
                const count = Math.floor(ctx.params.diskDensity);
                const rs = ctx.params.bhMass * 3.5;
                for (let i = 0; i < count; i++) {
                    const radius = rs * 1.8 + Math.random() * rs * 4.5;
                    const angle = Math.random() * Math.PI * 2;
                    const vMag = Math.sqrt((ctx.params.bhMass * 400) / radius) * 0.95;
                    particles.push({
                        x: p.width / 2 + Math.cos(angle) * radius,
                        y: p.height / 2 + Math.sin(angle) * radius,
                        vx: -Math.sin(angle) * vMag,
                        vy: Math.cos(angle) * vMag,
                        r: radius,
                        trail: []
                    });
                }
            }

            initBackgroundStars();
            initAccretionDisk();

            ctx.onReset = () => {
                photons = [];
                trappedCount = 0;
                trappedHistory = [];
                initAccretionDisk();
            };

            ctx.onResize = () => {
                initBackgroundStars();
            };

            ctx.onParamChange = (key) => {
                if (key === 'diskDensity' || key === 'bhMass') {
                    initAccretionDisk();
                }
            };

            p.draw = function() {
                p.background(5, 6, 10);

                const cx = p.width / 2;
                const cy = p.height / 2;
                const mass = ctx.params.bhMass;
                const dt = ctx.speed;
                const showV = ctx.params.showVectors > 0.5;

                const rs = mass * 3.5;
                const rPhoton = rs * 1.5;
                const rISCO = rs * 3.0;

                // 1. Background stars with relativistic gravitational lensing deflection
                p.noStroke();
                for (let i = 0; i < starfield.length; i++) {
                    const star = starfield[i];
                    const dx = star.x - cx;
                    const dy = star.y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > rs) {
                        const deflection = (rs * 16) / (dist + 20);
                        const sx = star.x + (dx / dist) * deflection;
                        const sy = star.y + (dy / dist) * deflection;
                        p.fill(star.brightness);
                        p.circle(sx, sy, star.size);
                    }
                }

                // 2. ISCO & Photon Sphere guidelines
                p.noFill();
                p.stroke(124, 106, 247, 55); // Indigo ring
                p.strokeWeight(1);
                p.circle(cx, cy, rISCO * 2);

                p.stroke(232, 160, 76, 70); // Amber photon sphere
                p.strokeWeight(1);
                p.circle(cx, cy, rPhoton * 2);

                // 3. Accretion Disk particles with swirling trails & Doppler beaming
                for (let i = particles.length - 1; i >= 0; i--) {
                    const pt = particles[i];

                    if (ctx.isPlaying) {
                        const dx = cx - pt.x;
                        const dy = cy - pt.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist <= rs) {
                            trappedCount++;
                            const newR = rs * 4.5 + Math.random() * rs * 2;
                            const newAngle = Math.random() * Math.PI * 2;
                            const vMag = Math.sqrt((mass * 400) / newR) * 0.95;
                            pt.x = cx + Math.cos(newAngle) * newR;
                            pt.y = cy + Math.sin(newAngle) * newR;
                            pt.vx = -Math.sin(newAngle) * vMag;
                            pt.vy = Math.cos(newAngle) * vMag;
                            pt.trail = [];
                            continue;
                        }

                        const effDist = Math.max(dist - rs * 0.7, 4.0);
                        const force = (mass * 320) / (effDist * effDist);
                        pt.vx += (dx / dist) * force * dt;
                        pt.vy += (dy / dist) * force * dt;

                        pt.x += pt.vx * dt;
                        pt.y += pt.vy * dt;

                        if (p.frameCount % 2 === 0) {
                            pt.trail.push({ x: pt.x, y: pt.y });
                            if (pt.trail.length > 8) pt.trail.shift();
                        }
                    }

                    // Relativistic Doppler beaming color: blueshift approaching, redshift receding
                    const color = pt.vx < 0 ? [45, 212, 191] : [232, 100, 76];
                    VisualKit.drawFadingTrail(p, pt.trail, color, { exponent: 1.4, maxAlpha: 140, minWeight: 0.8, maxWeight: 1.8 });

                    p.stroke(color[0], color[1], color[2], 210);
                    p.strokeWeight(2.5);
                    p.point(pt.x, pt.y);
                }

                // 4. Test photons / particles with glow & fading trails
                for (let i = photons.length - 1; i >= 0; i--) {
                    const ph = photons[i];

                    if (ctx.isPlaying) {
                        const dx = cx - ph.x;
                        const dy = cy - ph.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist <= rs) {
                            trappedCount += 2;
                            photons.splice(i, 1);
                            continue;
                        }

                        const effDist = Math.max(dist - rs * 0.7, 3.0);
                        const force = (mass * 380) / (effDist * effDist);
                        ph.vx += (dx / dist) * force * dt;
                        ph.vy += (dy / dist) * force * dt;

                        ph.x += ph.vx * dt;
                        ph.y += ph.vy * dt;

                        ph.trail.push({ x: ph.x, y: ph.y });
                        if (ph.trail.length > 20) ph.trail.shift();

                        if (ph.x < -100 || ph.x > p.width + 100 || ph.y < -100 || ph.y > p.height + 100) {
                            photons.splice(i, 1);
                            continue;
                        }
                    }

                    // Fading trail behind test particle
                    VisualKit.drawFadingTrail(p, ph.trail, [241, 245, 249], {
                        exponent: 1.6,
                        maxAlpha: 190,
                        minWeight: 1.0,
                        maxWeight: 2.2
                    });

                    // Glow particle head
                    VisualKit.drawGlowBody(p, ph.x, ph.y, 4, [241, 245, 249], {
                        outerMult: 2.0,
                        innerMult: 1.3,
                        outerAlpha: 45,
                        innerAlpha: 100,
                        specular: false
                    });

                    // Velocity arrow
                    if (showV) {
                        const spd = Math.hypot(ph.vx, ph.vy);
                        if (spd > 0.4) {
                            VisualKit.drawArrow(p, ph.x, ph.y, ph.x + ph.vx * 3.5, ph.y + ph.vy * 3.5, [241, 245, 249], 200, 1.6, 5);
                        }
                    }
                }

                // 5. Central Event Horizon with multi-layer shadow and photon glow
                VisualKit.drawGlowBody(p, cx, cy, rs, [232, 160, 76], {
                    outerMult: 1.35,
                    innerMult: 1.15,
                    outerAlpha: 25,
                    innerAlpha: 60,
                    strokeWidth: 2,
                    strokeColor: [26, 32, 53],
                    specular: false
                });
                p.noStroke();
                p.fill(0);
                p.circle(cx, cy, rs * 2);

                // Drag indicator line if user is dragging to launch
                if (dragOrigin) {
                    const pos = ptr();
                    p.stroke(241, 245, 249, 160);
                    p.strokeWeight(1.5);
                    p.line(dragOrigin.x, dragOrigin.y, pos.x, pos.y);
                    VisualKit.drawArrow(p, dragOrigin.x, dragOrigin.y,
                        dragOrigin.x + (dragOrigin.x - pos.x) * 0.8,
                        dragOrigin.y + (dragOrigin.y - pos.y) * 0.8,
                        [45, 212, 191], 210, 2, 7);
                }

                // 6. Inset Telemetry Sparkline
                if (ctx.isPlaying) {
                    trappedHistory.push(trappedCount);
                    if (trappedHistory.length > 180) trappedHistory.shift();
                }
                if (p.width > 480) {
                    VisualKit.drawSparkline(p, p.width - 188, 12, 180, 60, trappedHistory, [232, 160, 76], {
                        label: 'Cumulative Accretion Flux',
                        zeroFloor: true,
                        cornerRadius: 6
                    });
                }

                // Telemetry
                ctx._telemetry = {
                    'Schwarzschild (rₛ)': `${(rs * 2.95).toFixed(1)} km`,
                    'Photon Sphere (1.5rₛ)': `${(rPhoton * 2.95).toFixed(1)} km`,
                    'ISCO Boundary (3.0rₛ)': `${(rISCO * 2.95).toFixed(1)} km`,
                    'Trapped Photons': `${trappedCount}`
                };
                ctx.updateTelemetry();

                // Caption
                p.noStroke();
                p.fill(65, 85, 120);
                p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('Amber = redshift  |  Teal = blueshift  |  Drag to aim & fling particles into orbit', 14, p.height - 10);
            };

            function ptr() {
                return (p.touches && p.touches.length > 0)
                    ? { x: p.touches[0].x, y: p.touches[0].y }
                    : { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = ptr();
                dragOrigin = { ...pos };
                dragTracker.start(pos.x, pos.y);
            };

            p.mouseDragged = function() {
                if (!dragOrigin) return;
                const pos = ptr();
                dragTracker.drag(pos.x, pos.y);
            };

            p.mouseReleased = function() {
                if (!dragOrigin) return;
                const pos = ptr();
                const vel = dragTracker.release();
                const dx = dragOrigin.x - pos.x;
                const dy = dragOrigin.y - pos.y;
                const dragDist = Math.hypot(dx, dy);

                let vx = 0, vy = 0;
                if (dragDist > 8) {
                    // Fling launch in drag direction
                    vx = (dx * 0.12);
                    vy = (dy * 0.12);
                } else {
                    // Click spawn with tangential orbital speed
                    const cx = p.width / 2;
                    const cy = p.height / 2;
                    const rdx = pos.x - cx;
                    const rdy = pos.y - cy;
                    const dist = Math.hypot(rdx, rdy);
                    if (dist > 10) {
                        const spd = ctx.params.launchSpeed;
                        vx = (-rdy / dist) * spd;
                        vy = (rdx / dist) * spd;
                    }
                }

                if (Math.hypot(vx, vy) > 0.5) {
                    photons.push({
                        x: dragOrigin.x,
                        y: dragOrigin.y,
                        vx,
                        vy,
                        trail: []
                    });
                    if (photons.length > 50) photons.shift();
                }

                dragOrigin = null;
            };

            p.touchStarted = p.mousePressed;
            p.touchMoved   = p.mouseDragged;
            p.touchEnded   = p.mouseReleased;
        }
    });

    sim.mount();
    return sim;
};