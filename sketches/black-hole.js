// ===== BLACK HOLE SPACETIME =====
//
// Two implementations in one file:
//
//   3D  A backwards ray marcher that integrates null geodesics of the
//       Schwarzschild metric in the orbital plane of each pixel's ray, using
//       the standard form of the equation:
//
//           d2u/dphi2 = -u + (3/2) rs u^2,     u = 1/r
//
//       Rays that fall inside r = rs are the shadow. Rays that reach the
//       accretion disk plane are shaded with a thin-disk (Shakura-Sunyaev)
//       temperature profile, shifted by the combination of gravitational
//       redshift and relativistic Doppler from the true circular-orbit speed
//       at that radius, and brightened by g^4. Rays that escape sample a
//       procedural star field in their final, lensed direction, which is why
//       the star field stretches into an Einstein ring around the shadow.
//
//       Everything is in units of the Schwarzschild radius rs = 2GM/c^2. The
//       image of a Schwarzschild hole is scale-free: the mass slider changes
//       the numbers in the readouts, not the picture. The simulation says so
//       on screen rather than implying that the picture depends on mass.
//
//   2D  The original flat deflection sketch, kept verbatim as the fallback for
//       browsers and devices without WebGL2, or if the renderer fails to start.
//       It is never a blank canvas.
//
// Physics helpers (rs, photon sphere, ISCO, shadow impact parameter, time
// dilation, orbital speed, blackbody colour) live in assets/relativity.js and
// are unit tested in tests/relativity.test.js.

(function () {
    'use strict';

    var Rel = window.VisiqRelativity;

    var RS_UNIT = 1.0;                 // geometry is expressed in rs
    var DISK_INNER_RS = 3.0;           // ISCO = 3 rs = 6 GM/c^2
    var ORBIT_SECONDS_PER_ISCO = 6.0;  // wall-clock seconds per one ISCO orbit

    function hasWebGL2() {
        try {
            var canvas = document.createElement('canvas');
            if (!window.WebGL2RenderingContext) return false;
            var gl = canvas.getContext('webgl2');
            if (!gl) return false;
            return true;
        } catch {
            return false;
        }
    }

    // =====================================================================
    // 2D fallback: the original sketch, unchanged apart from a note
    // =====================================================================
    function mount2D(config, note) {
        var sim = new SimBase({
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

                    if (Math.hypot(vx, vy) > 0.1) {
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

        if (note) {
            var container = document.getElementById(config.containerId);
            if (container) {
                var noteEl = document.createElement('p');
                noteEl.className = 'bh-flat-note';
                noteEl.style.cssText = 'margin:10px 0 0;font-size:0.82rem;line-height:1.5;color:inherit;opacity:0.75;';
                noteEl.textContent = note;
                container.appendChild(noteEl);
            }
        }

        return {
            sim: sim,
            mode: '2d',
            destroy: function () { sim.destroy(); },
            reset: function () { sim.reset(); },
            describe: function () { return 'Flat black hole view. WebGL2 is not available in this browser, so the raytraced view is not shown.'; }
        };
    }

    // =====================================================================
    // 3D ray marcher
    // =====================================================================

    var VERTEX_SHADER = [
        'varying vec2 vUv;',
        'void main() {',
        '    vUv = uv;',
        '    gl_Position = vec4(position.xy, 0.0, 1.0);',
        '}'
    ].join('\n');

    // The fragment shader. MAX_STEPS is a compile-time bound because GLSL ES
    // 1.00 requires it; uSteps picks the actual budget at runtime.
    var FRAGMENT_SHADER = [
        'precision highp float;',
        '',
        'varying vec2 vUv;',
        '',
        'uniform vec2  uResolution;',
        'uniform vec3  uCamPos;',
        'uniform vec3  uCamRight;',
        'uniform vec3  uCamUp;',
        'uniform vec3  uCamFwd;',
        'uniform float uTanHalfFov;',
        'uniform int   uSteps;',
        'uniform float uRs;',
        'uniform float uDiskInner;',
        'uniform float uDiskOuter;',
        'uniform float uDiskTemp;',
        'uniform float uTempNorm;',
        'uniform float uFluxNorm;',
        'uniform float uOrbitPhase;',
        'uniform float uStarBright;',
        'uniform float uDiskBright;',
        'uniform sampler2D uBlackbody;',
        '',
        '#define MAX_STEPS 420',
        '#define PI 3.141592653589793',
        '',
        'float hash11(float p) {',
        '    p = fract(p * 0.1031);',
        '    p *= p + 33.33;',
        '    p *= p + p;',
        '    return fract(p);',
        '}',
        '',
        'float hash31(vec3 p) {',
        '    p = fract(p * vec3(0.1031, 0.1030, 0.0973));',
        '    p += dot(p, p.yxz + 33.33);',
        '    return fract((p.x + p.y) * p.z);',
        '}',
        '',
        'vec3 hash33(vec3 p) {',
        '    p = fract(p * vec3(0.1031, 0.1030, 0.0973));',
        '    p += dot(p, p.yxz + 33.33);',
        '    return fract((p.xxy + p.yxx) * p.zyx);',
        '}',
        '',
        '// Blackbody colour, looked up from a table built on the CPU by',
        '// assets/relativity.js blackbodyRGB(), which the unit tests cover. The',
        '// table is indexed by log10 of temperature and linearly interpolated. It',
        '// is stored sRGB-encoded in 8 bits, which keeps about 1 per cent relative',
        '// precision in the darks and avoids needing a floating point texture (and',
        '// the capability probe that goes with one) on older mobile GPUs.',
        'const float BB_LOG_MIN = 2.4771213;  // log10(300)',
        'const float BB_LOG_MAX = 9.0;        // log10(1e9)',
        'vec3 srgbToLinear(vec3 c) {',
        '    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));',
        '}',
        'vec3 blackbody(float temperatureK) {',
        '    float t = clamp(temperatureK, 300.0, 1.0e9);',
        '    float x = (log(t) / 2.302585093 - BB_LOG_MIN) / (BB_LOG_MAX - BB_LOG_MIN);',
        '    return srgbToLinear(texture2D(uBlackbody, vec2(clamp(x, 0.0, 1.0), 0.5)).rgb);',
        '}',
        '',
        '// Procedural star field and a faint galactic band. Sampling by direction',
        '// on the unit sphere avoids the seam and pole artefacts a uv mapping would',
        '// introduce when the camera orbits.',
        'vec3 sampleSky(vec3 dir) {',
        '    vec3 col = vec3(0.0);',
        '    for (int layer = 0; layer < 2; layer++) {',
        '        float scale = (layer == 0) ? 260.0 : 520.0;',
        '        float threshold = (layer == 0) ? 0.900 : 0.880;',
        '        vec3 p = dir * scale;',
        '        vec3 cell = floor(p);',
        '        vec3 f = fract(p) - 0.5;',
        '        float h = hash31(cell + float(layer) * 19.7);',
        '        if (h > threshold) {',
        '            vec3 offset = (hash33(cell + 3.1) - 0.5) * 0.7;',
        '            float d = length(f - offset);',
        '            float mag = (h - threshold) / (1.0 - threshold);',
        '            float core = pow(smoothstep(0.5, 0.0, d), (layer == 0) ? 16.0 : 26.0);',
        '            float tint = hash11(h * 91.7);',
        '            vec3 colour = mix(vec3(0.78, 0.85, 1.0), vec3(1.0, 0.86, 0.68), tint);',
        '            col += colour * core * (0.35 + 0.95 * mag) * ((layer == 0) ? 0.85 : 1.3);',
        '        }',
        '    }',
        '    vec3 bandNormal = normalize(vec3(0.32, 0.55, 0.77));',
        '    float bd = dot(dir, bandNormal);',
        '    col += exp(-bd * bd / 0.045) * vec3(0.020, 0.024, 0.040);',
        '    return col * uStarBright;',
        '}',
        '',
        'void main() {',
        '    vec2 ndc = vUv * 2.0 - 1.0;',
        '    float aspect = uResolution.x / max(uResolution.y, 1.0);',
        '    vec3 rd = normalize(uCamFwd',
        '        + uCamRight * (ndc.x * aspect * uTanHalfFov)',
        '        + uCamUp * (ndc.y * uTanHalfFov));',
        '',
        '    vec3 P = uCamPos;',
        '    float r0 = length(P);',
        '    vec3 rhat = P / r0;',
        '    float rs = uRs;',
        '    float t0 = sqrt(max(1.0e-4, 1.0 - rs / r0));',
        '',
        '    // Split the ray into radial and transverse parts. The transverse part',
        '    // defines the plane the photon travels in, and the plane is fixed',
        '    // because Schwarzschild angular momentum is conserved.',
        '    float nr = dot(rd, rhat);',
        '    vec3 perp = rd - nr * rhat;',
        '    float nt = length(perp);',
        '    vec3 t1;',
        '    if (nt > 1.0e-5) {',
        '        t1 = perp / nt;',
        '    } else {',
        '        t1 = normalize(cross(rhat, vec3(0.0, 0.0, 1.0)) + vec3(1.0e-4, 0.0, 0.0));',
        '    }',
        '    float ntC = max(nt, 1.0e-5);',
        '',
        '    // Geodesic initial conditions in the plane.',
        '    float u = 1.0 / r0;',
        '    float du = -(nr * t0) / (r0 * ntC);',
        '',
        '    // Disk plane crossings: pos.z = r (cos(phi) Az + sin(phi) Bz) = 0,',
        '    // so the crossing angles are delta + pi/2 + k pi. Precomputing them',
        '    // removes two trig calls from every march step.',
        '    float Az = rhat.z;',
        '    float Bz = t1.z;',
        '    float delta = atan(Bz, Az);',
        '    float phiFirst = delta + PI * 0.5;',
        '    for (int k = 0; k < 4; k++) {',
        '        if (phiFirst > 0.0) break;',
        '        phiFirst += PI;',
        '    }',
        '    bool degenerateEdge = (abs(Az) + abs(Bz)) < 1.0e-6;',
        '',
        '    float escapeR = max(40.0, r0 * 1.8);',
        '    float phi = 0.0;',
        '    float nextCross = phiFirst;',
        '    int crossIndex = 0;',
        '    float uPrev = u;',
        '',
        '    bool captured = false;',
        '    bool hitDisk = false;',
        '    bool escaped = false;',
        '    float hitR = 0.0;',
        '    float hitPhi = 0.0;',
        '    vec3 skyDir = vec3(0.0);',
        '',
        '    for (int i = 0; i < MAX_STEPS; i++) {',
        '        if (i >= uSteps) break;',
        '',
        '        float r = 1.0 / u;',
        '        float h = clamp(0.045 * r / rs, 0.0035, 0.085);',
        '',
        '        // Classic RK4 on (u, du).',
        '        float k1u = du;',
        '        float k1d = -u + 1.5 * rs * u * u;',
        '        float u2 = u + 0.5 * h * k1u;',
        '        float d2 = du + 0.5 * h * k1d;',
        '        float k2u = d2;',
        '        float k2d = -u2 + 1.5 * rs * u2 * u2;',
        '        float u3 = u + 0.5 * h * k2u;',
        '        float d3 = du + 0.5 * h * k2d;',
        '        float k3u = d3;',
        '        float k3d = -u3 + 1.5 * rs * u3 * u3;',
        '        float u4 = u + h * k3u;',
        '        float d4 = du + h * k3d;',
        '        float k4u = d4;',
        '        float k4d = -u4 + 1.5 * rs * u4 * u4;',
        '',
        '        uPrev = u;',
        '        float uNew = u + h * (k1u + 2.0 * k2u + 2.0 * k3u + k4u) / 6.0;',
        '        float duNew = du + h * (k1d + 2.0 * k2d + 2.0 * k3d + k4d) / 6.0;',
        '        float phiPrev = phi;',
        '        phi += h;',
        '        float rNew = 1.0 / max(uNew, 1.0e-6);',
        '',
        '        // Disk: first crossing along this ray wins, because the disk is',
        '        // opaque and this is the part of it nearest the camera.',
        '        if (!degenerateEdge && crossIndex < 3 && phi >= nextCross) {',
        '            float frac = (nextCross - phiPrev) / h;',
        '            float uCross = mix(uPrev, uNew, frac);',
        '            float rCross = 1.0 / max(uCross, 1.0e-6);',
        '            if (rCross > uDiskInner && rCross < uDiskOuter) {',
        '                hitDisk = true;',
        '                hitR = rCross;',
        '                hitPhi = nextCross;',
        '                break;',
        '            }',
        '            crossIndex++;',
        '            nextCross = phiFirst + float(crossIndex) * PI;',
        '        }',
        '',
        '        u = uNew;',
        '        du = duNew;',
        '',
        '        if (rNew <= rs * 1.0005) { captured = true; break; }',
        '        if (rNew > escapeR && du < 0.0) { escaped = true; break; }',
        '    }',
        '',
        '    // Final direction for a ray that ran out of steps without resolving.',
        '    float rEnd = 1.0 / max(u, 1.0e-6);',
        '    float tEnd = sqrt(max(1.0e-4, 1.0 - min(rs / max(rEnd, rs), 0.999)));',
        '    float drdphiEnd = -du / (u * u);',
        '    vec3 eREnd = cos(phi) * rhat + sin(phi) * t1;',
        '    vec3 ePEnd = -sin(phi) * rhat + cos(phi) * t1;',
        '    vec3 marchDirEnd = normalize((drdphiEnd / tEnd) * eREnd + rEnd * ePEnd);',
        '    skyDir = marchDirEnd;',
        '',
        '    vec3 col = vec3(0.0);',
        '    if (!captured) {',
        '        if (hitDisk) {',
        '            float r = hitR;',
        '            float x = r / uDiskInner;',
        '            float invSqrtX = inversesqrt(x);',
        '',
        '            // Temperature profile T ~ x^-3/4 (1 - x^-1/2)^1/4, normalised.',
        '            float tempProfile = uTempNorm * pow(x, -0.75) * pow(max(0.0, 1.0 - invSqrtX), 0.25);',
        '            float emitT = uDiskTemp * tempProfile;',
        '',
        '            // Flux profile, which is the fourth power of the above.',
        '            float flux = uFluxNorm * pow(x, -3.0) * max(0.0, 1.0 - invSqrtX);',
        '',
        '            vec3 pos = r * (cos(hitPhi) * rhat + sin(hitPhi) * t1);',
        '            vec3 posDir = normalize(pos);',
        '            vec3 vhat = normalize(cross(vec3(0.0, 0.0, 1.0), posDir));',
        '            float beta = sqrt(0.5 / r) / sqrt(max(1.0e-4, 1.0 - rs / r));',
        '            beta = min(beta, 0.999);',
        '            float gamma = 1.0 / sqrt(max(1.0e-6, 1.0 - beta * beta));',
        '',
        '            // The photon travels toward the camera, which is the reverse of',
        '            // the direction this backwards ray marches.',
        '            vec3 eRh = cos(hitPhi) * rhat + sin(hitPhi) * t1;',
        '            vec3 ePh = -sin(hitPhi) * rhat + cos(hitPhi) * t1;',
        '            float drdphi = -du / (u * u);',
        '            float th = sqrt(max(1.0e-4, 1.0 - min(rs / r, 0.999)));',
        '            vec3 marchDir = normalize((drdphi / th) * eRh + r * ePh);',
        '            vec3 photonDir = -marchDir;',
        '',
        '            float mu = dot(vhat, photonDir);',
        '            float grav = sqrt(max(0.0, 1.0 - rs / r));',
        '            float g = grav / (gamma * max(1.0e-4, 1.0 - beta * mu));',
        '',
        '            // Observed intensity: bolometric flux scaled by the fourth power',
        '            // of the shift factor, and colour from the shifted temperature.',
        '            float intensity = flux * g * g * g * g;',
        '            vec3 tint = blackbody(g * emitT);',
        '',
        '            // Slow turbulent variation, so the disk is not a perfect ring.',
        '            float omega = sqrt(0.5 / (r * r * r));',
        '            float omegaIso = sqrt(0.5 / 27.0);',
        '            float azimuth = atan(pos.y, pos.x);',
        '            float patternPhase = uOrbitPhase * (omega / omegaIso);',
        '            float arms = 0.84 + 0.16 * sin(2.0 * azimuth - 2.0 * patternPhase);',
        '            float flicker = hash31(vec3(floor(x * 5.0), floor(azimuth * 6.0), floor(uOrbitPhase * 10.0)));',
        '            float turbulence = 0.93 + 0.07 * flicker;',
        '',
        '            col = tint * intensity * arms * turbulence * uDiskBright;',
        '        } else {',
        '            col = sampleSky(skyDir);',
        '        }',
        '    }',
        '',
        '',
        '    // A fully black shadow is correct here: no light reaches the camera from',
        '    // inside the photon capture radius. Rays that graze it produce the',
        '    // bright photon ring by themselves, from genuine disk emission.',
        '    gl_FragColor = vec4(max(col, 0.0), 1.0);',
        '',
        '    #include <tonemapping_fragment>',
        '    #include <colorspace_fragment>',
        '}'
    ].join('\n');

    function fmtKm(km) {
        if (!isFinite(km)) return '-';
        if (km >= 1e6) return (km / 1e6).toFixed(2) + ' million km';
        if (km >= 1000) return km.toFixed(0) + ' km';
        if (km >= 1) return km.toFixed(1) + ' km';
        return (km * 1000).toFixed(0) + ' m';
    }

    function fmtTime(seconds) {
        if (!isFinite(seconds)) return '-';
        if (seconds >= 86400) return (seconds / 86400).toFixed(2) + ' days';
        if (seconds >= 3600) return (seconds / 3600).toFixed(2) + ' h';
        if (seconds >= 60) return (seconds / 60).toFixed(2) + ' min';
        if (seconds >= 1) return seconds.toFixed(2) + ' s';
        return (seconds * 1000).toFixed(2) + ' ms';
    }

    function fmtTemp(kelvin) {
        if (!isFinite(kelvin)) return '-';
        if (kelvin >= 1e6) return (kelvin / 1e6).toFixed(2) + ' MK';
        if (kelvin >= 1e3) return (kelvin / 1e3).toFixed(1) + ' kK';
        return kelvin.toFixed(0) + ' K';
    }

    function mount3D(config) {
        var container = document.getElementById(config.containerId || 'simulation-canvas');
        var controls = document.getElementById(config.controlsContainerId || 'controls-section');
        if (!container) {
            console.error('[black-hole] no canvas container');
            return null;
        }

        var reducedMotion = false;
        try {
            reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch { /* matchMedia missing: keep animating */ }

        var sim = new SimBase({
            id: 'black-hole',
            containerId: config.containerId,
            controlsContainerId: config.controlsContainerId,
            params: {
                massExp: {
                    value: 1.0, min: 0.0, max: 8.0, step: 0.1,
                    label: 'Mass, log10(M / M_sun)', unit: 'dex'
                },
                inclination: {
                    value: 84, min: 0, max: 89.5, step: 0.5,
                    label: 'Inclination (0 = face-on)', unit: 'deg'
                },
                diskOuter: {
                    value: 22, min: 6, max: 40, step: 1,
                    label: 'Disk outer edge', unit: 'r_s'
                },
                observerR: {
                    value: 6, min: 1.05, max: 20, step: 0.05,
                    label: 'Observer radius r', unit: 'r_s'
                },
                exposure: {
                    value: 1.0, min: 0.2, max: 3.0, step: 0.05,
                    label: 'Exposure', unit: ''
                }
            },
            getReadouts(ctx) {
                return ctx._telemetry || {
                    'Mass': '-',
                    'Schwarzschild r_s': '-',
                    'Photon sphere 1.5 r_s': '-',
                    'ISCO 3 r_s': '-',
                    'Shadow diameter 5.20 r_s': '-',
                    'Time dilation sqrt(1 - rs/r)': '-',
                    'Disk peak T': '-',
                    'ISCO orbital period': '-'
                };
            }
        });

        // prefers-reduced-motion: start paused with a visible Play button.
        if (reducedMotion) sim.isPlaying = false;
        sim.renderControls();

        // ---- blackbody lookup table, built from the tested JS function ----
        var LUT_SIZE = 512;
        var LUT_LOG_MIN = Math.log10(300);
        var LUT_LOG_MAX = 9.0;
        var lutData = new Uint8Array(LUT_SIZE * 4);
        // The sRGB transfer function, so the 8-bit table spends its precision
        // where the eye needs it. The shader applies the inverse.
        function encodeSrgb(v) {
            var c = Math.max(0, Math.min(1, v));
            var s = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
            return Math.max(0, Math.min(255, Math.round(s * 255)));
        }
        for (var i = 0; i < LUT_SIZE; i++) {
            var frac = i / (LUT_SIZE - 1);
            var kelvin = Math.pow(10, LUT_LOG_MIN + frac * (LUT_LOG_MAX - LUT_LOG_MIN));
            var rgb = Rel.blackbodyRGB(kelvin);
            var peak = Math.max(1e-6, Math.max(rgb[0], Math.max(rgb[1], rgb[2])));
            lutData[i * 4 + 0] = encodeSrgb(rgb[0] / peak);
            lutData[i * 4 + 1] = encodeSrgb(rgb[1] / peak);
            lutData[i * 4 + 2] = encodeSrgb(rgb[2] / peak);
            lutData[i * 4 + 3] = 255;
        }

        // ---- DOM ----
        var canvas = document.createElement('canvas');
        canvas.className = 'bh-canvas';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label',
            'Ray traced view of a Schwarzschild black hole: a thin accretion disk whose far side is lensed over the top and under the bottom of a black shadow, with the side rotating toward the viewer brighter and bluer.');
        canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
        container.appendChild(canvas);

        var overlay = document.createElement('canvas');
        overlay.className = 'bh-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.cssText = 'position:absolute;left:12px;bottom:12px;width:236px;height:118px;pointer-events:none;';
        if (!container.style.position) container.style.position = 'relative';
        container.appendChild(overlay);

        var qualityNote = document.createElement('div');
        qualityNote.className = 'bh-quality-note';
        qualityNote.setAttribute('role', 'status');
        qualityNote.style.cssText = 'position:absolute;right:12px;top:12px;font-size:0.72rem;' +
            'font-family:"JetBrains Mono",monospace;font-variant-numeric:tabular-nums;' +
            'color:inherit;opacity:0.72;background:rgba(0,0,0,0.42);padding:5px 8px;' +
            'border-radius:6px;pointer-events:none;max-width:62%;line-height:1.45;';
        container.appendChild(qualityNote);

        var live = document.createElement('p');
        live.className = 'sr-only';
        live.setAttribute('aria-live', 'polite');
        live.setAttribute('aria-atomic', 'true');
        live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;' +
            'clip:rect(0,0,0,0);white-space:nowrap;';
        container.appendChild(live);

        var reduceBtn = document.createElement('button');
        reduceBtn.type = 'button';
        reduceBtn.className = 'bh-reduce-btn';
        reduceBtn.setAttribute('aria-pressed', 'false');
        reduceBtn.textContent = 'Reduced effects';
        reduceBtn.style.cssText = 'min-height:48px;min-width:48px;margin-top:10px;padding:10px 14px;' +
            'cursor:pointer;font:inherit;color:inherit;background:rgba(255,255,255,0.06);' +
            'border:1px solid rgba(255,255,255,0.18);border-radius:8px;';
        if (controls) controls.appendChild(reduceBtn);

        // Notes the brief requires: what to notice, a predict prompt, and limits.
        function appendNote(text, opts) {
            if (!controls) return;
            var p = document.createElement('p');
            p.style.cssText = 'margin:8px 0 0;font-size:0.84rem;line-height:1.55;color:inherit;opacity:' +
                (opts && opts.faint ? '0.62' : '0.82') + ';';
            p.textContent = text;
            controls.appendChild(p);
            return p;
        }
        appendNote('What to notice: the disk looks like it bends over the top of the shadow and under the bottom. That is the far side of the same disk, whose light is lensed around the hole. The left and right halves are not equally bright either; the half rotating toward you is brighter and bluer.', {});
        appendNote('Predict: if you increase the inclination toward edge-on, does the shadow get bigger, smaller, or stay the same size? Set the slider and check the shadow diameter readout.', {});
        var limitsNote = appendNote('', { faint: true });

        // ---- camera state ----
        function inclinationToPolar(deg) {
            return Math.max(0, Math.min(Math.PI * 0.5 - 0.0087, deg));
        }

        var cam = {
            azimuth: 0.6,
            polar: 0,
            // The disk runs out to 22 rs by default. At distance 20 the camera
            // sat INSIDE the disk's radial span, 6 degrees above the plane, so
            // the near disk filled the lower half of the frame like a floor.
            // 40 rs puts the camera outside the disk: the classic band-across-
            // the-shadow composition with the lensed far side arcing over.
            distance: 40,
            velAz: 0,
            velPol: 0
        };
        cam.polar = inclinationToPolar(sim.params.inclination * Math.PI / 180);
        var CAM_DEFAULT = { azimuth: 0.6, polar: cam.polar, distance: 40 };

        var state = {
            steps: 240,
            autoScale: 1,
            manualReduced: false,
            frameMs: 16.7,
            orbitPhase: 0,
            dirtyGraph: true,
            disposed: false
        };

        // ---- three.js ----
        var three = null;
        var renderer = null;
        var scene = null;
        var camera = null;
        var material = null;
        var mesh = null;
        var geometry = null;
        var lutTexture = null;
        var rafId = null;
        var lastFrameTime = 0;

        var controller = {
            mode: '3d',
            sim: sim,
            inner: null,
            destroy: function () {
                if (controller.inner) {
                    try { controller.inner.destroy(); } catch { /* already gone */ }
                    controller.inner = null;
                }
                teardown3D();
                sim.destroy();
            },
            reset: function () {
                cam.azimuth = CAM_DEFAULT.azimuth;
                cam.polar = CAM_DEFAULT.polar;
                cam.distance = CAM_DEFAULT.distance;
                cam.velAz = 0;
                cam.velPol = 0;
                state.autoScale = 1;
                state.manualReduced = false;
                reduceBtn.setAttribute('aria-pressed', 'false');
                sim.reset();
            },
            describe: function () { return describeState(); },
            // GPU resource counts, so the open/close leak check has something
            // real to read. Nothing in the simulation calls this.
            rendererInfo: function () {
                if (!renderer || !renderer.info) return null;
                return {
                    geometries: renderer.info.memory.geometries,
                    textures: renderer.info.memory.textures,
                    programs: renderer.info.programs ? renderer.info.programs.length : null,
                    calls: renderer.info.render.calls,
                    triangles: renderer.info.render.triangles
                };
            },
            quality: function () {
                return { scale: state.autoScale, steps: state.steps, frameMs: state.frameMs };
            },
            camera: function () {
                return { azimuth: cam.azimuth, polar: cam.polar, distance: cam.distance };
            }
        };

        function fallbackTo2D(reason) {
            if (state.disposed) return;
            teardown3D();
            try { sim.destroy(); } catch { /* nothing mounted */ }
            controller.inner = mount2D(config, reason);
            controller.mode = '2d';
        }

        function teardown3D() {
            state.disposed = true;
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            removePointerListeners();
            removeKeyListeners();
            if (resizeObserver) {
                resizeObserver.disconnect();
                resizeObserver = null;
            }
            // Drop the context-lost handler before forcing the loss, or our own
            // teardown looks like a crash and logs a false warning.
            canvas.removeEventListener('webglcontextlost', onContextLost, false);
            window.removeEventListener('resize', onWindowResize);
            if (renderer) {
                renderer.forceContextLoss();
            }
            if (geometry) { geometry.dispose(); geometry = null; }
            if (material) { material.dispose(); material = null; }
            if (lutTexture) { lutTexture.dispose(); lutTexture = null; }
            if (renderer) {
                renderer.dispose();
                renderer = null;
            }
            scene = null;
            camera = null;
            mesh = null;
            three = null;
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (qualityNote.parentNode) qualityNote.parentNode.removeChild(qualityNote);
            if (reduceBtn.parentNode) reduceBtn.parentNode.removeChild(reduceBtn);
        }

        function describeState() {
            var mass = Math.pow(10, sim.params.massExp);
            var rsKm = Rel.schwarzschildRadiusKm(mass);
            var dilation = Rel.timeDilation(sim.params.observerR * RS_UNIT, RS_UNIT);
            return 'Black hole of ' + mass.toPrecision(3) + ' solar masses, Schwarzschild radius ' +
                fmtKm(rsKm) + ', inclination ' + sim.params.inclination.toFixed(1) +
                ' degrees, disk from 3 to ' + sim.params.diskOuter + ' rs. Time dilation at ' +
                sim.params.observerR + ' rs is ' + dilation.toFixed(3) + '.';
        }

        // ---- pointer and keyboard ----
        var pointers = new Map();
        var dragging = false;
        var lastX = 0, lastY = 0;
        var pinchStart = 0, pinchDist = 0;

        function onPointerDown(e) {
            canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.size === 1) {
                dragging = true;
                lastX = e.clientX;
                lastY = e.clientY;
                cam.velAz = 0;
                cam.velPol = 0;
            } else if (pointers.size === 2) {
                dragging = false;
                var pts = Array.from(pointers.values());
                pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                pinchStart = cam.distance;
            }
            e.preventDefault();
        }

        function onPointerMove(e) {
            if (!pointers.has(e.pointerId)) return;
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.size === 2) {
                var pts = Array.from(pointers.values());
                var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                if (pinchDist > 0) {
                    cam.distance = clampDistance(pinchStart * (pinchDist / Math.max(1, d)));
                }
                e.preventDefault();
                return;
            }
            if (!dragging) return;
            var dx = e.clientX - lastX;
            var dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            cam.velAz = -dx * 0.005;
            cam.velPol = dy * 0.005;
            cam.azimuth += cam.velAz;
            cam.polar = clampPolar(cam.polar + cam.velPol);
            e.preventDefault();
        }

        function onPointerUp(e) {
            pointers.delete(e.pointerId);
            if (pointers.size < 2) pinchDist = 0;
            if (pointers.size === 0) dragging = false;
        }

        function onWheel(e) {
            e.preventDefault();
            cam.distance = clampDistance(cam.distance * Math.exp(e.deltaY * 0.0012));
        }

        // The camera can only sit above the disk plane, matching the slider,
        // which runs from face-on (0) to just short of exactly edge-on, where a
        // zero-thickness disk is a degenerate case.
        function clampPolar(p) {
            var sinLim = Math.PI * 0.5 - 0.0087;
            return Math.max(0, Math.min(sinLim, p));
        }

        function clampDistance(d) {
            return Math.max(4, Math.min(140, d));
        }

        function onKeyDown(e) {
            var tag = (e.target && e.target.tagName) || '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            var step = e.shiftKey ? 0.12 : 0.04;
            var handled = true;
            switch (e.key) {
                case 'ArrowLeft': cam.azimuth -= step; break;
                case 'ArrowRight': cam.azimuth += step; break;
                case 'ArrowUp': cam.polar = clampPolar(cam.polar - step); break;
                case 'ArrowDown': cam.polar = clampPolar(cam.polar + step); break;
                case '+': case '=': cam.distance = clampDistance(cam.distance * 0.92); break;
                case '-': case '_': cam.distance = clampDistance(cam.distance * 1.08); break;
                case '0': cam.azimuth = CAM_DEFAULT.azimuth; cam.polar = CAM_DEFAULT.polar; cam.distance = CAM_DEFAULT.distance; break;
                case ' ': sim.togglePlay(); break;
                case 'r': case 'R': controller.reset(); break;
                default: handled = false;
            }
            if (handled) e.preventDefault();
        }

        var pointerListeners = [
            ['pointerdown', onPointerDown], ['pointermove', onPointerMove], ['pointerup', onPointerUp],
            ['pointercancel', onPointerUp], ['wheel', onWheel]
        ];
        function addPointerListeners() {
            pointerListeners.forEach(function (pair) { canvas.addEventListener(pair[0], pair[1], { passive: false }); });
        }
        function removePointerListeners() {
            pointerListeners.forEach(function (pair) { canvas.removeEventListener(pair[0], pair[1]); });
        }
        function addKeyListeners() { window.addEventListener('keydown', onKeyDown); }
        function removeKeyListeners() { window.removeEventListener('keydown', onKeyDown); }

        reduceBtn.addEventListener('click', function () {
            state.manualReduced = !state.manualReduced;
            reduceBtn.setAttribute('aria-pressed', state.manualReduced ? 'true' : 'false');
            reduceBtn.textContent = state.manualReduced ? 'Reduced effects: on' : 'Reduced effects';
            state.autoScale = 1;
        });

        var resizeObserver = null;
        var resizeTimer = null;

        function measure() {
            var w = Math.max(320, container.clientWidth || 640);
            var h = Math.max(240, container.clientHeight || 420);
            return { w: w, h: h };
        }

        function applySize() {
            if (!renderer) return;
            var m = measure();
            var scale = state.autoScale;
            var rw = Math.max(160, Math.floor(m.w * scale));
            var rh = Math.max(120, Math.floor(m.h * scale));
            renderer.setSize(rw, rh, false);
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            if (material) material.uniforms.uResolution.value.set(rw, rh);
            var odpr = Math.min(window.devicePixelRatio || 1, 2);
            overlay.width = Math.floor(236 * odpr);
            overlay.height = Math.floor(118 * odpr);
            state.dirtyGraph = true;
        }

        // ---- the disk flux graph ----
        function drawGraph() {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            var w = 236, h = 118;
            var ctx2d = overlay.getContext('2d');
            if (!ctx2d) return;
            ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx2d.clearRect(0, 0, w, h);
            ctx2d.fillStyle = 'rgba(4, 6, 12, 0.55)';
            roundRect(ctx2d, 0.5, 0.5, w - 1, h - 1, 7);
            ctx2d.fill();

            var padL = 10, padR = 10, padT = 20, padB = 18;
            var plotW = w - padL - padR;
            var plotH = h - padT - padB;
            var rIn = DISK_INNER_RS;
            var rOut = sim.params.diskOuter;

            ctx2d.fillStyle = 'rgba(255,255,255,0.80)';
            ctx2d.font = '11px "IBM Plex Sans", sans-serif';
            ctx2d.fillText('Disk flux (relative)', padL, 14);

            // axes
            ctx2d.strokeStyle = 'rgba(255,255,255,0.22)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(padL, padT + plotH);
            ctx2d.lineTo(padL + plotW, padT + plotH);
            ctx2d.stroke();

            // curve
            ctx2d.strokeStyle = 'rgba(255,178,102,0.95)';
            ctx2d.lineWidth = 1.6;
            ctx2d.beginPath();
            var SAMPLES = 90;
            for (var i = 0; i < SAMPLES; i++) {
                var t = i / (SAMPLES - 1);
                var r = rIn + (rOut - rIn) * t;
                var v = Rel.diskFlux(r, rIn);
                var px = padL + t * plotW;
                var py = padT + plotH * (1 - Math.max(0, Math.min(1, v)));
                if (i === 0) ctx2d.moveTo(px, py);
                else ctx2d.lineTo(px, py);
            }
            ctx2d.stroke();

            // marker at the peak radius, and at the marked 12 rs reference
            var peakR = Rel.DISK_PEAK_R_OVER_RIN * rIn;
            var tp = (peakR - rIn) / (rOut - rIn);
            if (tp >= 0 && tp <= 1) {
                ctx2d.strokeStyle = 'rgba(255,255,255,0.45)';
                ctx2d.setLineDash([2, 3]);
                ctx2d.beginPath();
                ctx2d.moveTo(padL + tp * plotW, padT);
                ctx2d.lineTo(padL + tp * plotW, padT + plotH);
                ctx2d.stroke();
                ctx2d.setLineDash([]);
            }

            ctx2d.fillStyle = 'rgba(255,255,255,0.62)';
            ctx2d.font = '10px "JetBrains Mono", monospace';
            ctx2d.fillText(rIn.toFixed(0) + ' rs', padL, h - 5);
            ctx2d.fillText(rOut.toFixed(0) + ' rs', padL + plotW - 26, h - 5);
            // Right-aligned so it can never collide with the left-aligned
            // title on the same baseline (they used to overlap at padL+60).
            ctx2d.textAlign = 'right';
            ctx2d.fillText('peak at ' + peakR.toFixed(1) + ' rs', padL + plotW, 14);
            ctx2d.textAlign = 'left';
        }

        function roundRect(c, x, y, w, h, r) {
            c.beginPath();
            c.moveTo(x + r, y);
            c.arcTo(x + w, y, x + w, y + h, r);
            c.arcTo(x + w, y + h, x, y + h, r);
            c.arcTo(x, y + h, x, y, r);
            c.arcTo(x, y, x + w, y, r);
            c.closePath();
        }

        // ---- readouts ----
        var lastLiveUpdate = 0;

        function refreshReadouts() {
            var mass = Math.pow(10, sim.params.massExp);
            var rsKm = Rel.schwarzschildRadiusKm(mass);
            var rs = RS_UNIT;
            var rObs = sim.params.observerR;
            var dilation = Rel.timeDilation(rObs, rs);
            var tPeak = Rel.diskPeakTemperature(mass);
            var iscoPeriod = 2 * Math.PI / Rel.keplerianOmega(DISK_INNER_RS * rs, rs);
            var massTxt = mass >= 1e4 ? mass.toExponential(2) : mass.toPrecision(3);

            sim._telemetry = {
                'Mass': massTxt + ' M_sun',
                'Schwarzschild r_s': fmtKm(rsKm),
                'Photon sphere 1.5 r_s': fmtKm(1.5 * rsKm),
                'ISCO 3 r_s': fmtKm(3 * rsKm),
                'Shadow diameter 5.20 r_s': fmtKm(Rel.shadowDiameter(rs) * rsKm),
                'Time dilation sqrt(1 - rs/r)': dilation.toFixed(4) + ' at ' + rObs.toFixed(2) + ' r_s',
                'Disk peak T': fmtTemp(tPeak),
                'ISCO orbital period': fmtTime(iscoPeriod * rsKm * 1000 / Rel.C)
            };
            sim.updateTelemetry();
        }

        function refreshLimits() {
            var mass = Math.pow(10, sim.params.massExp);
            var tPeak = Rel.diskPeakTemperature(mass);
            limitsNote.textContent =
                'What this model leaves out: the hole does not spin (no Kerr frame dragging), ' +
                'the image is scale-free so the mass slider changes the readouts and not the shape, ' +
                'the disk is infinitely thin with no self-shadowing, and the spectral peak for this mass is ' +
                fmtTemp(tPeak) + ', which is X-ray for stellar-mass holes and not what a camera would ' +
                'collect. The animation shows the disk at one orbit per ' +
                ORBIT_SECONDS_PER_ISCO.toFixed(0) + ' seconds at the ISCO rather than at the real period of ' +
                fmtTime(2 * Math.PI / Rel.keplerianOmega(DISK_INNER_RS, RS_UNIT) * Rel.schwarzschildRadiusKm(mass) * 1000 / Rel.C) + '.';
        }

        // ---- boot three.js ----
        (function boot() {
            var url;
            try {
                url = new URL('assets/vendor/three/build/three.module.js', document.baseURI).href;
            } catch {
                fallbackTo2D('The raytraced view could not load its renderer, so the flat view is shown instead.');
                return;
            }

            import(url).then(function (THREE) {
                if (state.disposed) return;
                three = THREE;
                startRenderer();
            }).catch(function (err) {
                console.warn('[black-hole] three.js failed to load, falling back to the flat sketch:', err);
                fallbackTo2D('The raytraced view could not load its renderer, so the flat view is shown instead.');
            });
        })();

        function startRenderer() {
            var m = measure();
            try {
                renderer = new three.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
            } catch {
                console.warn('[black-hole] WebGL renderer creation failed:', e);
                fallbackTo2D('This browser could not start a WebGL2 renderer, so the flat view is shown instead.');
                return;
            }
            renderer.setPixelRatio(1);
            renderer.toneMapping = three.ACESFilmicToneMapping;
            renderer.toneMappingExposure = sim.params.exposure;
            renderer.outputColorSpace = three.SRGBColorSpace;
            renderer.setClearColor(0x000000, 1);

            scene = new three.Scene();
            camera = new three.OrthographicCamera(-1, 1, 1, -1, 0, 1);

            lutTexture = new three.DataTexture(lutData, LUT_SIZE, 1, three.RGBAFormat, three.UnsignedByteType);
            lutTexture.minFilter = three.LinearFilter;
            lutTexture.magFilter = three.LinearFilter;
            lutTexture.wrapS = three.ClampToEdgeWrapping;
            lutTexture.wrapT = three.ClampToEdgeWrapping;
            lutTexture.needsUpdate = true;

            material = new three.ShaderMaterial({
                uniforms: {
                    uResolution: { value: new three.Vector2(m.w, m.h) },
                    uCamPos: { value: new three.Vector3() },
                    uCamRight: { value: new three.Vector3() },
                    uCamUp: { value: new three.Vector3() },
                    uCamFwd: { value: new three.Vector3() },
                    uTanHalfFov: { value: Math.tan(15 * Math.PI / 180) },
                    uSteps: { value: state.steps },
                    uRs: { value: RS_UNIT },
                    uDiskInner: { value: DISK_INNER_RS },
                    uDiskOuter: { value: sim.params.diskOuter },
                    uDiskTemp: { value: 1e7 },
                    uTempNorm: { value: Rel.DISK_PROFILE_NORM },
                    uFluxNorm: { value: Rel.DISK_FLUX_NORM },
                    uOrbitPhase: { value: 0 },
                    uStarBright: { value: 1.0 },
                    uDiskBright: { value: 1.0 },
                    uBlackbody: { value: lutTexture }
                },
                vertexShader: VERTEX_SHADER,
                fragmentShader: FRAGMENT_SHADER,
                depthTest: false,
                depthWrite: false
            });

            geometry = new three.PlaneGeometry(2, 2);
            mesh = new three.Mesh(geometry, material);
            mesh.frustumCulled = false;
            scene.add(mesh);

            canvas.addEventListener('webglcontextlost', onContextLost, false);
            addPointerListeners();
            addKeyListeners();

            if (typeof ResizeObserver !== 'undefined') {
                resizeObserver = new ResizeObserver(function () {
                    clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(function () {
                        if (state.disposed) return;
                        applySize();
                    }, 120);
                });
                resizeObserver.observe(container);
            }
            window.addEventListener('resize', onWindowResize);

            // Start conservative on small screens and then let the governor work.
            state.steps = m.w < 900 ? 180 : 300;
            material.uniforms.uSteps.value = state.steps;

            pickInitialScale();
            applySize();
            refreshReadouts();
            refreshLimits();

            if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
                document.fonts.ready.then(function () { state.dirtyGraph = true; }).catch(function () {});
            }

            lastFrameTime = performance.now();
            rafId = requestAnimationFrame(frame);

            // Shader compile failures are reported on the program, not thrown.
            requestAnimationFrame(function () {
                if (state.disposed) return;
                var programs = (renderer && renderer.info && renderer.info.programs) || [];
                var broken = programs.some(function (p) {
                    return p && p.diagnostics && p.diagnostics.runnable === false;
                });
                if (broken) {
                    console.warn('[black-hole] shader program failed to compile, falling back to the flat sketch');
                    fallbackTo2D('The raytraced shader failed to build on this device, so the flat view is shown instead.');
                }
            });
        }

        function pickInitialScale() {
            var m = measure();
            var px = m.w * m.h;
            if (px > 900000) state.autoScale = 0.68;
            else if (px > 420000) state.autoScale = 0.82;
            else state.autoScale = 1.0;
        }

        function onWindowResize() {
            if (state.disposed) return;
            applySize();
        }

        function onContextLost(e) {
            e.preventDefault();
            console.warn('[black-hole] WebGL context lost');
            fallbackTo2D('The graphics context was lost, so the flat view is shown instead of a blank canvas.');
        }

        function computeCamera() {
            var pos = material.uniforms.uCamPos.value;
            var right = material.uniforms.uCamRight.value;
            var up = material.uniforms.uCamUp.value;
            var fwd = material.uniforms.uCamFwd.value;

            var sp = Math.sin(cam.polar), cp = Math.cos(cam.polar);
            var sa = Math.sin(cam.azimuth), ca = Math.cos(cam.azimuth);
            var d = cam.distance;
            pos.set(d * sp * ca, d * sp * sa, d * cp);
            fwd.copy(pos).multiplyScalar(-1 / d);

            var up0 = new three.Vector3(0, 0, 1);
            right.crossVectors(up0, fwd);
            if (right.lengthSq() < 1e-8) {
                right.set(sa > 0 ? 1 : -1, 0, 0);
            } else {
                right.normalize();
            }
            up.crossVectors(fwd, right).normalize();
        }

        var frameCount = 0;

        function frame(now) {
            if (state.disposed) return;
            rafId = requestAnimationFrame(frame);

            var dt = Math.min(0.1, (now - lastFrameTime) / 1000);
            lastFrameTime = now;

            // Inertia on the orbit.
            if (!dragging && (Math.abs(cam.velAz) > 1e-4 || Math.abs(cam.velPol) > 1e-4)) {
                cam.azimuth += cam.velAz;
                cam.polar = clampPolar(cam.polar + cam.velPol);
                cam.velAz *= 0.93;
                cam.velPol *= 0.93;
            }

            var playing = sim.isPlaying;
            if (playing) {
                state.orbitPhase += dt * sim.speed * (2 * Math.PI / ORBIT_SECONDS_PER_ISCO);
            }

            // Keep the inclination slider pointing at what the camera is really
            // doing, so the control, the readout and the URL never disagree
            // with the picture. Writing only when the rounded value changes
            // avoids a write every frame.
            var inclinationDeg = cam.polar * 180 / Math.PI;
            if (Math.abs(Math.round(inclinationDeg * 2) / 2 - sim.params.inclination) >= 0.5) {
                var snapped = Math.round(inclinationDeg * 2) / 2;
                sim.params.inclination = snapped;
                var input = document.getElementById('sim-param-black-hole-inclination');
                var badge = document.getElementById('sim-param-black-hole-inclination-val');
                if (input) { input.value = String(snapped); input.setAttribute('aria-valuenow', String(snapped)); }
                if (badge) badge.textContent = snapped + ' deg';
                sim.syncUrlParams();
            }

            computeCamera();
            material.uniforms.uDiskOuter.value = sim.params.diskOuter;
            material.uniforms.uDiskTemp.value = Rel.diskPeakTemperature(Math.pow(10, sim.params.massExp));
            material.uniforms.uOrbitPhase.value = state.orbitPhase;
            material.uniforms.uSteps.value = state.steps;
            renderer.toneMappingExposure = sim.params.exposure;

            renderer.render(scene, camera);

            // Frame-time governor.
            var ms = dt * 1000;
            if (ms > 0 && ms < 200) {
                state.frameMs = state.frameMs * 0.9 + ms * 0.1;
            }
            frameCount++;
            if (frameCount % 20 === 0) govern();

            if (frameCount % 6 === 0) {
                sim.updateTelemetry();
                state.dirtyGraph = true;
            }
            if (state.dirtyGraph) {
                drawGraph();
                state.dirtyGraph = false;
            }
            if (now - lastLiveUpdate > 4000) {
                lastLiveUpdate = now;
                live.textContent = describeState();
            }
        }

        function govern() {
            var budgetMs = 1000 / 60;
            var over = state.frameMs > budgetMs * 1.25;
            // A vsync-locked 60 fps sits at 16.7 ms, which is above the old
            // 0.82 band: any one-time dip (shader compile) used to reduce the
            // scale and the dead band meant it NEVER came back. 1.06 puts a
            // steady 60 fps on the "can afford more" side of the hysteresis.
            var under = state.frameMs < budgetMs * 1.06;
            var changed = false;

            if (over) state.calm = 0;
            else if (under) state.calm = (state.calm || 0) + 1;
            else state.calm = 0;

            if (state.manualReduced) {
                var targetScale = 0.6;
                var targetSteps = 150;
                if (state.autoScale !== targetScale) { state.autoScale = targetScale; changed = true; }
                if (state.steps !== targetSteps) { state.steps = targetSteps; changed = true; }
            } else if (over) {
                if (state.autoScale > 0.42) { state.autoScale = Math.max(0.42, state.autoScale * 0.88); changed = true; }
                else if (state.steps > 140) { state.steps = Math.max(140, state.steps - 24); changed = true; }
            } else if (under && state.calm >= 6) {
                // Six calm govern periods (~2 s at 60 fps) before climbing
                // again, so a borderline machine settles instead of flapping.
                state.calm = 0;
                if (state.steps < 340) { state.steps = Math.min(340, state.steps + 12); changed = true; }
                else if (state.autoScale < 1) { state.autoScale = Math.min(1, state.autoScale * 1.06); changed = true; }
            }

            if (changed) applySize();

            var m = measure();
            var autoReduced = state.autoScale < 0.999 && !state.manualReduced;
            qualityNote.textContent = 'Render ' + Math.round(state.autoScale * m.w) + 'x' + Math.round(state.autoScale * m.h) +
                ' upscaled to ' + m.w + 'x' + m.h + ' | ' + state.steps + ' march steps | ' +
                state.frameMs.toFixed(1) + ' ms/frame' +
                (autoReduced ? ' | auto-reduced to hold 60 fps' : (state.manualReduced ? ' | reduced effects on' : ''));
        }

        // ---- param and lifecycle wiring ----
        sim.onParamChange = function (key, value) {
            if (key === 'massExp') { refreshReadouts(); refreshLimits(); state.dirtyGraph = true; }
            if (key === 'diskOuter') { state.dirtyGraph = true; }
            if (key === 'observerR') { refreshReadouts(); }
            if (key === 'inclination') {
                cam.polar = inclinationToPolar(value * Math.PI / 180);
                cam.velPol = 0;
            }
        };
        sim.onReset = function () {
            state.orbitPhase = 0;
        };
        sim.onPause = function () { /* the loop keeps rendering so the view stays live */ };
        sim.onDestroy = function () { /* handled by controller.destroy */ };

        return controller;
    }

    window.initSketch = function (config) {
        config = config || {};

        if (!window.VisiqRelativity) {
            console.error('[black-hole] assets/relativity.js is not loaded; cannot compute the geometry');
        }
        if (!hasWebGL2()) {
            return mount2D(config, 'This browser or device has no WebGL2, so the flat deflection view is shown instead of the raytraced one.');
        }
        try {
            return mount3D(config);
        } catch {
            console.warn('[black-hole] 3D view failed to start:', e);
            return mount2D(config, 'The raytraced view could not start here, so the flat view is shown instead.');
        }
    };
})();
