// ===== NEWTON'S PLAYGROUND =====
// Interactive force, mass, and acceleration simulator
// Explores F = ma, momentum conservation, and kinetic energy

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'newton',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            gravity: { value: 0.4, min: 0.0, max: 1.5, step: 0.05, label: 'Gravity Acceleration', unit: 'm/s²' },
            friction: { value: 0.98, min: 0.90, max: 1.00, step: 0.005, label: 'Surface Friction', unit: 'coeff' },
            restitution: { value: 0.85, min: 0.2, max: 0.99, step: 0.05, label: 'Wall Restitution', unit: 'e' },
            mass1: { value: 6.0, min: 1.0, max: 20.0, step: 0.5, label: 'Teal Body Mass', unit: 'kg' },
            mass2: { value: 12.0, min: 1.0, max: 30.0, step: 0.5, label: 'Amber Body Mass', unit: 'kg' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Total Energy': '0.00 J',
                'Linear Momentum': '0.00 kg·m/s',
                'Active Forces': '0.00 N',
                'Fastest Body': '0.00 m/s'
            };
        },
        setup(p, ctx) {
            let bodies = [];
            let draggedBody = null;
            let dragOffset = { x: 0, y: 0 };
            let lastMousePos = { x: 0, y: 0 };

            function createBodies() {
                const w = p.width;
                const h = p.height;
                bodies = [
                    {
                        id: 1,
                        x: w * 0.3,
                        y: h * 0.45,
                        vx: 3.5,
                        vy: -1.2,
                        get mass() { return ctx.params.mass1; },
                        get radius() { return Math.max(16, Math.min(38, 12 + Math.sqrt(this.mass) * 4)); },
                        color: '#2dd4bf', // Teal mint
                        accent: 'rgba(45, 212, 191, 0.25)',
                        trail: []
                    },
                    {
                        id: 2,
                        x: w * 0.7,
                        y: h * 0.45,
                        vx: -2.8,
                        vy: 0.8,
                        get mass() { return ctx.params.mass2; },
                        get radius() { return Math.max(18, Math.min(44, 14 + Math.sqrt(this.mass) * 4)); },
                        color: '#e8a04c', // Warm amber
                        accent: 'rgba(232, 160, 76, 0.25)',
                        trail: []
                    }
                ];
            }

            createBodies();
            ctx.onReset = createBodies;
            ctx.onResize = () => {
                bodies.forEach(b => {
                    b.x = p.constrain(b.x, b.radius, p.width - b.radius);
                    b.y = p.constrain(b.y, b.radius, p.height - b.radius);
                });
            };

            p.draw = function() {
                p.background(7, 9, 15); // Obsidian background

                // Draw subtle grid lines
                p.stroke(22, 27, 39);
                p.strokeWeight(1);
                const gridSize = 40;
                for (let x = 0; x < p.width; x += gridSize) p.line(x, 0, x, p.height);
                for (let y = 0; y < p.height; y += gridSize) p.line(0, y, p.width, y);

                const dt = ctx.speed;
                const g = ctx.params.gravity;
                const f = Math.pow(ctx.params.friction, dt);
                const rest = ctx.params.restitution;

                let totalKE = 0;
                let totalP = 0;
                let maxSpeed = 0;
                let netForce = 0;

                // Update & draw bodies
                for (let i = 0; i < bodies.length; i++) {
                    const b = bodies[i];

                    if (ctx.isPlaying && b !== draggedBody) {
                        // Apply gravity: F = m * g -> delta_v = g * dt
                        b.vy += g * dt;

                        // Apply friction
                        b.vx *= f;
                        b.vy *= f;

                        // Position update
                        b.x += b.vx * dt;
                        b.y += b.vy * dt;

                        // Wall boundaries
                        if (b.x - b.radius < 0) {
                            b.x = b.radius;
                            b.vx = -b.vx * rest;
                        } else if (b.x + b.radius > p.width) {
                            b.x = p.width - b.radius;
                            b.vx = -b.vx * rest;
                        }

                        if (b.y - b.radius < 0) {
                            b.y = b.radius;
                            b.vy = -b.vy * rest;
                        } else if (b.y + b.radius > p.height) {
                            b.y = p.height - b.radius;
                            b.vy = -b.vy * rest;
                            // Dampen micro-bounces on ground
                            if (Math.abs(b.vy) < 0.2) b.vy = 0;
                        }

                        // Record trail (max 24 points to avoid memory churn)
                        if (p.frameCount % 2 === 0) {
                            b.trail.push({ x: b.x, y: b.y });
                            if (b.trail.length > 24) b.trail.shift();
                        }
                    }

                    // Inter-body elastic collision
                    for (let j = i + 1; j < bodies.length; j++) {
                        const other = bodies[j];
                        const dx = other.x - b.x;
                        const dy = other.y - b.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const minDist = b.radius + other.radius;

                        if (dist < minDist && dist > 0.001) {
                            // Normal vector
                            const nx = dx / dist;
                            const ny = dy / dist;

                            // Separate overlap
                            const overlap = (minDist - dist) * 0.5;
                            b.x -= nx * overlap;
                            b.y -= ny * overlap;
                            other.x += nx * overlap;
                            other.y += ny * overlap;

                            // 1D elastic collision along normal
                            const kx = b.vx - other.vx;
                            const ky = b.vy - other.vy;
                            const pRel = 2 * (nx * kx + ny * ky) / (b.mass + other.mass);

                            b.vx -= pRel * other.mass * nx * rest;
                            b.vy -= pRel * other.mass * ny * rest;
                            other.vx += pRel * b.mass * nx * rest;
                            other.vy += pRel * b.mass * ny * rest;
                        }
                    }

                    // Metrics calculation
                    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                    if (speed > maxSpeed) maxSpeed = speed;
                    totalKE += 0.5 * b.mass * speed * speed;
                    totalP += b.mass * speed;
                    netForce += b.mass * g;

                    // Draw motion trail
                    if (b.trail.length > 1) {
                        p.noFill();
                        p.stroke(b.accent);
                        p.strokeWeight(3);
                        p.beginShape();
                        for (let t = 0; t < b.trail.length; t++) {
                            p.vertex(b.trail[t].x, b.trail[t].y);
                        }
                        p.endShape();
                    }

                    // Draw glow halo
                    p.noStroke();
                    p.fill(b.accent);
                    p.circle(b.x, b.y, b.radius * 2.4);

                    // Draw body circle
                    p.fill(b.color);
                    p.stroke('#07090f');
                    p.strokeWeight(2);
                    p.circle(b.x, b.y, b.radius * 2);

                    // Draw mass label
                    p.fill('#07090f');
                    p.noStroke();
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(12);
                    p.text(`${b.mass.toFixed(1)}kg`, b.x, b.y);

                    // Draw velocity vector arrow
                    if (speed > 0.1) {
                        const arrowScale = 6;
                        const ax = b.x + b.vx * arrowScale;
                        const ay = b.y + b.vy * arrowScale;
                        p.stroke('#f1f5f9');
                        p.strokeWeight(2);
                        p.line(b.x, b.y, ax, ay);

                        // Arrowhead
                        const angle = Math.atan2(b.vy, b.vx);
                        const headLen = 6;
                        p.line(ax, ay, ax - headLen * Math.cos(angle - Math.PI / 6), ay - headLen * Math.sin(angle - Math.PI / 6));
                        p.line(ax, ay, ax - headLen * Math.cos(angle + Math.PI / 6), ay - headLen * Math.sin(angle + Math.PI / 6));
                    }
                }

                // Update live telemetry
                ctx._telemetry = {
                    'Total Energy': `${totalKE.toFixed(1)} J`,
                    'Linear Momentum': `${totalP.toFixed(1)} kg·m/s`,
                    'Active Forces': `${netForce.toFixed(1)} N`,
                    'Fastest Body': `${maxSpeed.toFixed(1)} m/s`
                };
                ctx.updateTelemetry();

                // Draw drag hint
                p.fill('#94a3b8');
                p.noStroke();
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                p.text('Drag bodies to fling • Space to pause • R to reset', 16, p.height - 14);
            };

            // Touch and mouse drag interaction
            function getPointerPos() {
                if (p.touches && p.touches.length > 0) {
                    return { x: p.touches[0].x, y: p.touches[0].y };
                }
                return { x: p.mouseX, y: p.mouseY };
            }

            p.mousePressed = function() {
                const pos = getPointerPos();
                for (let i = bodies.length - 1; i >= 0; i--) {
                    const b = bodies[i];
                    const d = Math.sqrt((pos.x - b.x) ** 2 + (pos.y - b.y) ** 2);
                    if (d <= b.radius + 12) { // 48px touch target padding
                        draggedBody = b;
                        dragOffset.x = b.x - pos.x;
                        dragOffset.y = b.y - pos.y;
                        lastMousePos = { x: pos.x, y: pos.y };
                        b.vx = 0;
                        b.vy = 0;
                        return false;
                    }
                }
            };

            p.mouseDragged = function() {
                if (draggedBody) {
                    const pos = getPointerPos();
                    draggedBody.x = p.constrain(pos.x + dragOffset.x, draggedBody.radius, p.width - draggedBody.radius);
                    draggedBody.y = p.constrain(pos.y + dragOffset.y, draggedBody.radius, p.height - draggedBody.radius);
                    draggedBody.vx = (pos.x - lastMousePos.x) * 0.8;
                    draggedBody.vy = (pos.y - lastMousePos.y) * 0.8;
                    lastMousePos = { x: pos.x, y: pos.y };
                    return false;
                }
            };

            p.mouseReleased = function() {
                if (draggedBody) {
                    // Clamp fling velocity to sensible limit
                    const maxV = 25;
                    draggedBody.vx = Math.max(-maxV, Math.min(maxV, draggedBody.vx));
                    draggedBody.vy = Math.max(-maxV, Math.min(maxV, draggedBody.vy));
                    draggedBody = null;
                }
            };
        }
    });

    sim.mount();
    return sim;
};