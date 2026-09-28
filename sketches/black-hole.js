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
            diskDensity: { value: 120, min: 40, max: 240, step: 10, label: 'Accretion Particles', unit: 'qty' },
            launchSpeed: { value: 4.5, min: 1.5, max: 10.0, step: 0.25, label: 'Test Particle Speed', unit: 'km/s' }
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

            function initBackgroundStars() {
                starfield = [];
                // Precompute 100 fixed background stars (zero allocation in draw loop)
                for (let i = 0; i < 100; i++) {
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
                    // Orbital velocity v = sqrt(GM / r)
                    const vMag = Math.sqrt((ctx.params.bhMass * 400) / radius) * 0.95;
                    particles.push({
                        x: p.width / 2 + Math.cos(angle) * radius,
                        y: p.height / 2 + Math.sin(angle) * radius,
                        vx: -Math.sin(angle) * vMag,
                        vy: Math.cos(angle) * vMag,
                        r: radius,
                        colorTemp: Math.random() // for blackbody color tint
                    });
                }
            }

            initBackgroundStars();
            initAccretionDisk();

            ctx.onReset = () => {
                photons = [];
                trappedCount = 0;
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
                p.background(5, 6, 10); // Deep cosmic void

                const cx = p.width / 2;
                const cy = p.height / 2;
                const mass = ctx.params.bhMass;
                const dt = ctx.speed;

                // Physical scale: Schwarzschild radius r_s
                const rs = mass * 3.5;
                const rPhoton = rs * 1.5;
                const rISCO = rs * 3.0;

                // 1. Draw background stars with mild gravitational lensing offset
                p.noStroke();
                for (let i = 0; i < starfield.length; i++) {
                    const star = starfield[i];
                    const dx = star.x - cx;
                    const dy = star.y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > rs) {
                        // Light deflection angle: delta_theta ~ 4GM / (c^2 * b)
                        const deflection = (rs * 16) / (dist + 20);
                        const sx = star.x + (dx / dist) * deflection;
                        const sy = star.y + (dy / dist) * deflection;

                        p.fill(star.brightness);
                        p.circle(sx, sy, star.size);
                    }
                }

                // 2. Draw ISCO guideline
                p.noFill();
                p.stroke('rgba(124, 106, 247, 0.25)'); // Indigo ring
                p.strokeWeight(1);
                p.circle(cx, cy, rISCO * 2);

                // 3. Draw Photon Sphere guideline
                p.stroke('rgba(232, 160, 76, 0.35)'); // Amber ring
                p.strokeWeight(1);
                p.circle(cx, cy, rPhoton * 2);

                // 4. Update and render Accretion Disk particles
                p.strokeWeight(2);
                for (let i = particles.length - 1; i >= 0; i--) {
                    const pt = particles[i];

                    if (ctx.isPlaying) {
                        const dx = cx - pt.x;
                        const dy = cy - pt.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist <= rs) {
                            // Swallowed by event horizon: re-seed at outer boundary
                            const newR = rs * 4.5 + Math.random() * rs * 2;
                            const newAngle = Math.random() * Math.PI * 2;
                            const vMag = Math.sqrt((mass * 400) / newR) * 0.95;
                            pt.x = cx + Math.cos(newAngle) * newR;
                            pt.y = cy + Math.sin(newAngle) * newR;
                            pt.vx = -Math.sin(newAngle) * vMag;
                            pt.vy = Math.cos(newAngle) * vMag;
                            continue;
                        }

                        // Paczyński-Wiita relativistic pseudo-Newtonian potential: F ~ GM / (r - rs)^2
                        const effDist = Math.max(dist - rs * 0.7, 4.0);
                        const force = (mass * 320) / (effDist * effDist);
                        pt.vx += (dx / dist) * force * dt;
                        pt.vy += (dy / dist) * force * dt;

                        pt.x += pt.vx * dt;
                        pt.y += pt.vy * dt;
                    }

                    // Relativistic Doppler beaming: approaching side (moving toward viewer) is brighter & bluer
                    const isApproaching = pt.vx < 0;
                    if (isApproaching) {
                        p.stroke(45, 212, 191, 200); // Teal blueshift
                    } else {
                        p.stroke(232, 100, 76, 180); // Amber/red redshift
                    }
                    p.point(pt.x, pt.y);
                }

                // 5. Update & draw launched test photons/particles
                p.strokeWeight(3);
                for (let i = photons.length - 1; i >= 0; i--) {
                    const ph = photons[i];

                    if (ctx.isPlaying) {
                        const dx = cx - ph.x;
                        const dy = cy - ph.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist <= rs) {
                            trappedCount++;
                            photons.splice(i, 1);
                            continue;
                        }

                        const effDist = Math.max(dist - rs * 0.7, 3.0);
                        const force = (mass * 380) / (effDist * effDist);
                        ph.vx += (dx / dist) * force * dt;
                        ph.vy += (dy / dist) * force * dt;

                        ph.x += ph.vx * dt;
                        ph.y += ph.vy * dt;

                        // Memory cap: discard particles drifting off screen
                        if (ph.x < -100 || ph.x > p.width + 100 || ph.y < -100 || ph.y > p.height + 100) {
                            photons.splice(i, 1);
                            continue;
                        }
                    }

                    p.stroke('#f8fafc');
                    p.point(ph.x, ph.y);
                }

                // 6. Draw Event Horizon (Black Void + Glow)
                p.noStroke();
                // Gravitational shadow glow
                p.fill('rgba(232, 160, 76, 0.12)');
                p.circle(cx, cy, rs * 2.6);
                p.fill('rgba(232, 160, 76, 0.22)');
                p.circle(cx, cy, rs * 2.2);

                // Absolute black interior
                p.fill(0);
                p.stroke('#1a2035');
                p.strokeWeight(2);
                p.circle(cx, cy, rs * 2);

                // Telemetry update
                ctx._telemetry = {
                    'Schwarzschild (rₛ)': `${(rs * 2.95).toFixed(1)} km`,
                    'Photon Sphere (1.5rₛ)': `${(rPhoton * 2.95).toFixed(1)} km`,
                    'ISCO Boundary (3.0rₛ)': `${(rISCO * 2.95).toFixed(1)} km`,
                    'Trapped Photons': `${trappedCount}`
                };
                ctx.updateTelemetry();

                // Onscreen instruction
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Click or drag anywhere to launch test particles into orbit • R to reset', 16, p.height - 14);
            };

            // Launch particles on pointer tap or drag
            function shootParticle(x, y) {
                const cx = p.width / 2;
                const cy = p.height / 2;
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 10) return;

                // Tangential velocity component for orbital entry
                const speed = ctx.params.launchSpeed;
                photons.push({
                    x: x,
                    y: y,
                    vx: (-dy / dist) * speed,
                    vy: (dx / dist) * speed
                });

                // Keep array bounded
                if (photons.length > 80) photons.shift();
            }

            p.mousePressed = function() {
                const x = (p.touches && p.touches.length > 0) ? p.touches[0].x : p.mouseX;
                const y = (p.touches && p.touches.length > 0) ? p.touches[0].y : p.mouseY;
                shootParticle(x, y);
            };

            p.mouseDragged = function() {
                if (p.frameCount % 4 === 0) {
                    const x = (p.touches && p.touches.length > 0) ? p.touches[0].x : p.mouseX;
                    const y = (p.touches && p.touches.length > 0) ? p.touches[0].y : p.mouseY;
                    shootParticle(x, y);
                }
            };
        }
    });

    sim.mount();
    return sim;
};