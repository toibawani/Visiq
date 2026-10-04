// ===== NEWTON'S PLAYGROUND =====
// Interactive force, mass, and acceleration simulator
// Explores F = ma, elastic collisions, momentum, and kinetic energy

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'newton',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            gravity:     { value: 0.4,  min: 0.0,  max: 1.5,  step: 0.05,  label: 'Gravity',        unit: 'm/s2' },
            friction:    { value: 0.98, min: 0.90,  max: 1.00, step: 0.005, label: 'Air Friction',    unit: 'coeff' },
            restitution: { value: 0.85, min: 0.2,   max: 0.99, step: 0.05,  label: 'Restitution',     unit: 'e' },
            mass1:       { value: 6.0,  min: 1.0,   max: 20.0, step: 0.5,   label: 'Teal Body Mass',  unit: 'kg' },
            mass2:       { value: 12.0, min: 1.0,   max: 30.0, step: 0.5,   label: 'Amber Body Mass', unit: 'kg' },
            showForces:  { value: 1,    min: 0,     max: 1,    step: 1,     label: 'Show Force Arrows', unit: '' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Total KE':   '0.0 J',
                'Momentum':   '0.0 kg m/s',
                'Max Speed':  '0.0 m/s',
                'Collisions': '0'
            };
        },

        setup(p, ctx) {
            const PALETTE = [
                { fill: [45,  212, 191], glow: [45,  212, 191, 28] },  // teal
                { fill: [232, 160,  76], glow: [232, 160,  76, 28] },  // amber
                { fill: [167, 139, 250], glow: [167, 139, 250, 28] },  // violet
                { fill: [244, 114, 182], glow: [244, 114, 182, 28] },  // pink
                { fill: [52,  211, 153], glow: [52,  211, 153, 28] },  // emerald
            ];

            let bodies = [];
            let draggedBody = null;
            let dragOffset  = { x: 0, y: 0 };
            let lastMPos    = { x: 0, y: 0 };
            let flashes     = [];       // collision flash events
            let energyHistory = [];
            let collisionCount = 0;
            let nextId = 3;

            // Body mass follows slider for ids 1 & 2, fixed 8 kg for spawned
            function massGetter(id) {
                if (id === 1) return () => ctx.params.mass1;
                if (id === 2) return () => ctx.params.mass2;
                return () => 8;
            }

            function makeBody(id, x, y, vx, vy, palIdx) {
                const col = PALETTE[palIdx % PALETTE.length];
                return {
                    id, x, y, vx, vy,
                    get mass()   { return massGetter(id)(); },
                    get radius() { return Math.max(16, Math.min(40, 12 + Math.sqrt(this.mass)*3.8)); },
                    fill: col.fill,
                    glow: col.glow,
                    trail: [],
                    trailRGB: null   // lazily initialised
                };
            }

            function createBodies() {
                collisionCount = 0; energyHistory = []; flashes = [];
                bodies = [
                    makeBody(1, p.width*0.3, p.height*0.45,  3.5, -1.2, 0),
                    makeBody(2, p.width*0.7, p.height*0.45, -2.8,  0.8, 1)
                ];
            }

            createBodies();
            ctx.onReset = createBodies;
            ctx.onResize = () => {
                bodies.forEach(b => {
                    b.x = p.constrain(b.x, b.radius, p.width  - b.radius);
                    b.y = p.constrain(b.y, b.radius, p.height - b.radius);
                    b.trail = [];
                });
            };

            const dragTracker = VisualKit.createDragTracker({ multiplier: 0.85, maxSpeed: 24 });

            p.draw = function() {
                p.background(7, 9, 15);

                // Subtle grid
                p.stroke(16, 21, 32); p.strokeWeight(1);
                for (let x = 0; x < p.width;  x += 50) p.line(x, 0, x, p.height);
                for (let y = 0; y < p.height; y += 50) p.line(0, y, p.width, y);
                // Floor rail
                p.stroke(40, 55, 80, 100); p.strokeWeight(1.5);
                p.line(0, p.height-1, p.width, p.height-1);

                const dt   = ctx.speed;
                const grav = ctx.params.gravity;
                const fric = Math.pow(ctx.params.friction, dt);
                const rest = ctx.params.restitution;
                const showF = ctx.params.showForces > 0.5;

                let totalKE=0, totalPx=0, totalPy=0, maxSpd=0;

                // ── Physics update ──────────────────────────────────────
                if (ctx.isPlaying) {
                    for (const b of bodies) {
                        if (b === draggedBody) continue;
                        b.vy += grav * dt;
                        b.vx *= fric; b.vy *= fric;
                        b.x  += b.vx * dt;
                        b.y  += b.vy * dt;

                        // Wall collisions
                        if (b.x - b.radius < 0)          { b.x = b.radius;           b.vx =  Math.abs(b.vx)*rest; }
                        else if (b.x + b.radius > p.width) { b.x = p.width-b.radius;  b.vx = -Math.abs(b.vx)*rest; }
                        if (b.y - b.radius < 0)           { b.y = b.radius;           b.vy =  Math.abs(b.vy)*rest; }
                        else if (b.y + b.radius > p.height) {
                            b.y = p.height - b.radius;
                            b.vy = -Math.abs(b.vy)*rest;
                            if (Math.abs(b.vy) < 0.3) b.vy = 0;
                        }

                        // Trail
                        if (p.frameCount % 2 === 0) {
                            b.trail.push({x:b.x, y:b.y});
                            if (b.trail.length > 40) b.trail.shift();
                        }
                    }

                    // Body–body elastic collisions (O(n²) fine for ≤6 bodies)
                    for (let i = 0; i < bodies.length; i++) {
                        for (let j = i+1; j < bodies.length; j++) {
                            const a = bodies[i], b = bodies[j];
                            const dx = b.x-a.x, dy = b.y-a.y;
                            const dist = Math.sqrt(dx*dx+dy*dy);
                            const minD = a.radius + b.radius;
                            if (dist < minD && dist > 0.001) {
                                const nx = dx/dist, ny = dy/dist;
                                const ov = (minD-dist)*0.5;
                                a.x -= nx*ov; a.y -= ny*ov;
                                b.x += nx*ov; b.y += ny*ov;
                                const dvx = a.vx-b.vx, dvy = a.vy-b.vy;
                                const dot = dvx*nx + dvy*ny;
                                if (dot > 0) {   // only resolve approaching pairs
                                    const imp = (1+rest)*dot/(a.mass+b.mass);
                                    a.vx -= imp*b.mass*nx; a.vy -= imp*b.mass*ny;
                                    b.vx += imp*a.mass*nx; b.vy += imp*a.mass*ny;
                                    collisionCount++;
                                    const fcx = (a.x+b.x)*0.5, fcy = (a.y+b.y)*0.5;
                                    flashes.push(VisualKit.createCollisionFlash(fcx, fcy, minD*0.75, 24));
                                }
                            }
                        }
                    }

                    flashes = VisualKit.updateCollisionFlashes(p, flashes);
                }

                // ── Fading trails ───────────────────────────────────────
                for (const b of bodies) {
                    VisualKit.drawFadingTrail(p, b.trail, b.fill, { exponent: 1.8, maxAlpha: 115, minWeight: 1.0, maxWeight: 2.6 });
                }

                // ── Collision flashes (rendered by updateCollisionFlashes) ─

                // ── Bodies ───────────────────────────────────────────────
                for (const b of bodies) {
                    const spd = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
                    totalKE  += 0.5*b.mass*spd*spd;
                    totalPx  += b.mass*b.vx;
                    totalPy  += b.mass*b.vy;
                    if (spd > maxSpd) maxSpd = spd;

                    const ga = b.glow[3];
                    VisualKit.drawGlowBody(p, b.x, b.y, b.radius, b.fill, {
                        outerMult: 1.8,
                        innerMult: 1.2,
                        outerAlpha: ga * 1.2,
                        innerAlpha: ga * 3.0,
                        specularAlpha: 52
                    });

                    // Mass label
                    p.fill(8, 12, 20); p.textAlign(p.CENTER, p.CENTER); p.textSize(11);
                    p.text(`${b.mass.toFixed(0)}kg`, b.x, b.y);

                    if (showF && b !== draggedBody) {
                        // Velocity arrow (white)
                        if (spd > 0.2) {
                            VisualKit.drawArrow(p, b.x, b.y, b.x+b.vx*5, b.y+b.vy*5, [241, 245, 249], 215, 2, 7);
                        }
                        // Gravity arrow (sky blue, downward)
                        const gF = b.mass * grav;
                        if (gF > 0.15) {
                            const gLen = Math.min(gF*3.5, 52);
                            VisualKit.drawArrow(p, b.x-b.radius-7, b.y,
                                  b.x-b.radius-7, b.y+gLen,
                                  [56, 189, 248], 200, 1.5, 6);
                        }
                        // Normal force (emerald green, upward) when resting on floor
                        const onFloor = b.y+b.radius > p.height-8 && Math.abs(b.vy) < 2.5;
                        if (onFloor) {
                            const nLen = Math.min(gF*3.5, 52);
                            VisualKit.drawArrow(p, b.x+b.radius+7, b.y,
                                  b.x+b.radius+7, b.y-nLen,
                                  [52, 211, 153], 200, 1.5, 6);
                        }
                    }
                }

                // ── Energy sparkline ────────────────────────────────────
                if (ctx.isPlaying) {
                    energyHistory.push(totalKE);
                    if (energyHistory.length > 180) energyHistory.shift();
                }
                if (p.width > 480) {
                    VisualKit.drawSparkline(p, p.width - 185, 12, 182, 60, energyHistory, [45, 212, 191], {
                        label: 'Total KE',
                        zeroFloor: true,
                        cornerRadius: 5
                    });
                }

                // ── Telemetry ────────────────────────────────────────────
                const totalP = Math.sqrt(totalPx*totalPx + totalPy*totalPy);
                ctx._telemetry = {
                    'Total KE':   `${totalKE.toFixed(1)} J`,
                    'Momentum':   `${totalP.toFixed(1)} kg m/s`,
                    'Max Speed':  `${maxSpd.toFixed(1)} m/s`,
                    'Collisions': `${collisionCount}`
                };
                ctx.updateTelemetry();

                // ── Caption ──────────────────────────────────────────────
                p.noStroke(); p.fill(55, 75, 115); p.textSize(11);
                p.textAlign(p.LEFT, p.BOTTOM);
                const leg = showF
                    ? 'White = velocity  |  Blue = gravity (mg)  |  Green = normal force  |  Drag to fling'
                    : 'Drag bodies to fling  |  Click empty space to add a body (max 6)';
                p.text(leg, 14, p.height - 10);
            };

            // ── Interaction ───────────────────────────────────────────────
            function ptr() {
                return p.touches && p.touches.length > 0
                    ? { x: p.touches[0].x, y: p.touches[0].y }
                    : { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = ptr();
                for (let i = bodies.length-1; i >= 0; i--) {
                    const b = bodies[i];
                    if (Math.hypot(pos.x-b.x, pos.y-b.y) <= b.radius+12) {
                        draggedBody    = b;
                        dragOffset.x   = b.x - pos.x;
                        dragOffset.y   = b.y - pos.y;
                        dragTracker.start(pos.x, pos.y);
                        b.vx = 0; b.vy = 0;
                        return false;
                    }
                }
                // Empty click: spawn new body
                if (bodies.length < 6) {
                    const palIdx = bodies.length % PALETTE.length;
                    bodies.push(makeBody(nextId++, pos.x, pos.y,
                        (Math.random()-0.5)*5, (Math.random()-0.5)*4, palIdx));
                }
            };

            p.mouseDragged = function() {
                if (!draggedBody) return;
                const pos = ptr();
                draggedBody.x  = p.constrain(pos.x+dragOffset.x, draggedBody.radius, p.width -draggedBody.radius);
                draggedBody.y  = p.constrain(pos.y+dragOffset.y, draggedBody.radius, p.height-draggedBody.radius);
                const vel = dragTracker.drag(pos.x, pos.y);
                draggedBody.vx = vel.vx;
                draggedBody.vy = vel.vy;
                return false;
            };

            p.mouseReleased = function() {
                if (!draggedBody) return;
                const vel = dragTracker.release();
                draggedBody.vx = vel.vx;
                draggedBody.vy = vel.vy;
                draggedBody = null;
            };

            p.touchStarted = p.mousePressed;
            p.touchMoved   = p.mouseDragged;
            p.touchEnded   = p.mouseReleased;
        }
    });

    sim.mount();
    return sim;
};
