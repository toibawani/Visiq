// ===== 3D SOLAR SYSTEM =====
// Heliocentric system built from NASA/JPL's published Keplerian element table
// (assets/orbital-elements.js, source ssd.jpl.nasa.gov/planets/approx_pos.html),
// then advanced by RK4 under the Sun's gravity alone. The ellipses, the speed-up
// at perihelion and the conservation of energy and angular momentum are
// consequences of the integration, not something drawn by hand.
//
// Rendering: three.js, one point light at the Sun, ACES filmic tone mapping,
// sRGB output, PBR spheres with the Solar System Scope maps (CC BY 4.0, see
// SOURCES.md and assets/textures/planets/PROVENANCE.json).
//
// Same contract as every other sketch: window.initSketch(config) returns a
// controller with destroy(), reset(), describe() and a few read-only probes
// used by scripts/verify-3d.mjs.

(function () {
    'use strict';

    var OE = window.VisiqOrbitalElements;
    var Integrators = window.VisiqIntegrators;

    // One astronomical unit in km (IAU 2012 definition), used for display.
    var KM_PER_AU = 1.495978707e8;

    // Effective temperatures (K) and sidereal rotation periods (days) for the
    // phase readouts. CHECK: these are textbook values (NASA planetary fact
    // sheets), quoted to give the rotation and illumination readouts something
    // real to show; none of them is recomputed from the elements.
    var BODY_FACTS = {
        mercury: { rotationDays: 58.646, tempK: 440 },
        venus:   { rotationDays: -243.025, tempK: 737 },
        embary:  { rotationDays: 0.99727, tempK: 288 },
        mars:    { rotationDays: 1.02596, tempK: 210 },
        jupiter: { rotationDays: 0.41354, tempK: 165 },
        saturn:  { rotationDays: 0.44401, tempK: 134 },
        uranus:  { rotationDays: -0.71833, tempK: 76 },
        neptune: { rotationDays: 0.67125, tempK: 72 }
    };

    // True axial tilts (degrees) and true mean radii in km.
    var AXIAL_TILT = {
        mercury: 0.034, venus: 177.36, embary: 23.44, mars: 25.19,
        jupiter: 3.13, saturn: 26.73, uranus: 97.77, neptune: 28.32
    };

    var SUN_RADIUS_KM = 695700;
    var MOON_RADIUS_KM = 1737.4;
    // Mean Earth-Moon distance in km, and the Moon's sidereal period in days.
    var MOON_DISTANCE_KM = 384400;
    var MOON_PERIOD_DAYS = 27.321661;

    var AU_TO_KM = KM_PER_AU;
    var kmToAu = function (km) { return km / AU_TO_KM; };

    function fmt(x, digits) {
        var d = digits === undefined ? 2 : digits;
        if (!isFinite(x)) return '-';
        var ax = Math.abs(x);
        if (ax !== 0 && (ax < 1e-3 || ax >= 1e6)) return x.toExponential(3);
        return x.toFixed(d);
    }

    function fmtDays(days) {
        if (!isFinite(days)) return '-';
        if (Math.abs(days) < 800) return fmt(days, 1) + ' d';
        return fmt(days / 365.25, 2) + ' yr';
    }

    function fmtDate(jd) {
        var c = OE.calendarFromJD(jd);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return c.day + ' ' + months[c.month - 1] + ' ' + c.year;
    }

    // The simulation opens on today's date, not on the table's epoch, so the
    // first frame shows where the planets actually are. The table is valid 1800
    // to 2050, and the sim flags it in the readouts when the clock leaves that
    // window.
    function todayJulianDay() {
        var now = new Date();
        return OE.julianDay(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate())
            + now.getUTCHours() / 24;
    }

    var EPOCH_JD = null;
    function epochJD() {
        if (EPOCH_JD === null) {
            EPOCH_JD = (OE && typeof OE.julianDay === 'function') ? todayJulianDay() : 2451545.0;
        }
        return EPOCH_JD;
    }

    function hasWebGL2() {
        try {
            var canvas = document.createElement('canvas');
            var gl = canvas.getContext('webgl2');
            return !!gl;
        } catch (e) {
            return false;
        }
    }

    // ---- fallback: a flat orbit plot drawn with canvas 2D ----
    // Not a blank canvas and not a lie: the same element table, projected onto
    // the ecliptic, with no lighting and no spin.
    function mount2D(config, note) {
        var sim = new SimBase({
            id: 'solar-system',
            containerId: config.containerId,
            controlsContainerId: config.controlsContainerId,
            params: {
                logDaysPerSec: { value: 1.0, min: 0, max: 4.56, step: 0.02, label: 'Time rate, log10(days/s)', unit: 'dex' },
                dayOffset: { value: 0, min: -7305, max: 7305, step: 1, label: 'Date offset from today', unit: 'd' },
                showOrbits: { value: 1, min: 0, max: 1, step: 1, label: 'Show orbit paths', unit: '' }
            },
            getReadouts(ctx) {
                return ctx._telemetry || { 'Date': '-', 'Time rate': '-' };
            }
        });
        sim.renderControls();

        var container = document.getElementById(config.containerId || 'simulation-canvas');
        if (!container) return null;

        if (container.style.position !== 'relative' && container.style.position !== 'absolute') {
            container.style.position = 'relative';
        }

        var canvas = document.createElement('canvas');
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'Flat top-down plot of the eight planetary orbits computed from the JPL element table.');
        canvas.style.cssText = 'display:block;width:100%;height:100%;';
        container.appendChild(canvas);

        var live = document.createElement('p');
        live.className = 'sr-only';
        live.setAttribute('aria-live', 'polite');
        container.appendChild(live);

        if (note) {
            var p = document.createElement('p');
            p.style.cssText = 'margin:8px 0 0;font-size:0.84rem;line-height:1.55;opacity:0.75;';
            p.textContent = note;
            container.appendChild(p);
        }

        var rafId = null;
        var jd = epochJD();
        var last = 0;

        function draw(now) {
            rafId = requestAnimationFrame(draw);
            var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
            last = now;
            var daysPerSec = Math.pow(10, sim.params.logDaysPerSec);
            if (sim.isPlaying) jd += dt * daysPerSec * sim.speed;

            var views = Math.max(320, container.clientWidth || 640);
            var vh = Math.max(240, container.clientHeight || 420);
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(views * dpr);
            canvas.height = Math.floor(vh * dpr);
            canvas.style.height = vh + 'px';
            var c = canvas.getContext('2d');
            c.setTransform(dpr, 0, 0, dpr, 0, 0);
            c.clearRect(0, 0, views, vh);

            var cx = views / 2, cy = vh / 2;
            var maxR = 31;
            var scale = (Math.min(views, vh) / 2 - 18) / maxR;

            c.strokeStyle = 'rgba(148,163,184,0.55)';
            c.fillStyle = 'rgba(226,232,240,0.9)';
            c.font = '11px "JetBrains Mono", monospace';

            for (var i = 0; i < OE.PLANET_ORDER.length; i++) {
                var id = OE.PLANET_ORDER[i];
                if (sim.params.showOrbits > 0.5) {
                    c.beginPath();
                    for (var k = 0; k <= 180; k++) {
                        var p = OE.positionAt(id, jd + k * (OE.periodDays(OE.elementsAt(id, jd).a) / 180));
                        var px = cx + p.x * scale;
                        var py = cy - p.y * scale;
                        if (k === 0) c.moveTo(px, py); else c.lineTo(px, py);
                    }
                    c.stroke();
                }
                var now2 = OE.positionAt(id, jd);
                c.beginPath();
                c.arc(cx + now2.x * scale, cy - now2.y * scale, 3, 0, Math.PI * 2);
                c.fill();
            }

            c.fillText(fmtDate(jd), 10, 18);
            if (now - (live._t || 0) > 4000) {
                live._t = now;
                live.textContent = 'Flat orbit plot for ' + fmtDate(jd) + '.';
            }
        }

        sim.onParamChange = function (key) {
            if (key === 'dayOffset') jd = epochJD() + sim.params.dayOffset;
        };
        jd = epochJD() + sim.params.dayOffset;
        rafId = requestAnimationFrame(draw);

        return {
            mode: '2d',
            sim: sim,
            destroy: function () {
                if (rafId !== null) cancelAnimationFrame(rafId);
                rafId = null;
                if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
                if (live.parentNode) live.parentNode.removeChild(live);
                if (p && p.parentNode) p.parentNode.removeChild(p);
                sim.destroy();
            },
            reset: function () { jd = epochJD(); sim.reset(); },
            describe: function () { return 'Flat orbit plot at ' + fmtDate(jd) + '.'; }
        };
    }

    function mount3D(config) {
        var container = document.getElementById(config.containerId || 'simulation-canvas');
        var controls = document.getElementById(config.controlsContainerId || 'controls-section');
        if (!container) {
            console.error('[solar-system] no canvas container');
            return null;
        }
        if (!OE || !Integrators) {
            console.error('[solar-system] assets/orbital-elements.js or assets/integrators.js is not loaded');
            return null;
        }

        var reducedMotion = false;
        try {
            reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) { /* keep animating */ }

        var sim = new SimBase({
            id: 'solar-system',
            containerId: config.containerId,
            controlsContainerId: config.controlsContainerId,
            params: {
                logDaysPerSec: {
                    value: 1.0, min: 0, max: 4.56, step: 0.02,
                    label: 'Time rate, log10(days per second)', unit: 'dex'
                },
                dayOffset: {
                    value: 0, min: -7305, max: 7305, step: 1,
                    label: 'Date offset from today', unit: 'd'
                },
                scaleMode: {
                    value: 1, min: 0, max: 1, step: 1,
                    label: 'Scale: 0 = true, 1 = readable', unit: ''
                },
                lightComp: {
                    value: 1, min: 0, max: 1, step: 1,
                    label: 'Compensate the 1/r^2 falloff (display only)', unit: ''
                },
                showOrbits: {
                    value: 1, min: 0, max: 1, step: 1,
                    label: 'Show orbit paths', unit: ''
                },
                exposure: {
                    value: 1.0, min: 0.2, max: 3.0, step: 0.05,
                    label: 'Exposure', unit: ''
                }
            },
            // SimBase builds the readout DOM from this first call and only ever
            // writes to keys that already had a span, so every row the sim
            // updates has to be listed here or it never appears on screen. The
            // first version of this listed eight and silently hid the other
            // eleven.
            getReadouts(ctx) {
                return ctx._telemetry || {
                    'Date': '-', 'Focused body': '-', 'Time rate': '-',
                    'Distance from Sun': '-', 'Heliocentric speed': '-',
                    'Orbital period': '-', 'Kepler III P^2/a^3': '-',
                    'Energy drift (RK4)': '-', 'Angular momentum drift': '-',
                    'Residual vs element table': '-', 'Element table valid': '-',
                    'Sunlight relative to Earth': '-', 'Axial tilt': '-',
                    'Rotation period': '-', 'True radius': '-',
                    'Mean surface temperature': '-',
                    'Earth distance from Sun': '-', 'Earth speed': '-',
                    'Earth sunlight': '-'
                };
            },
            perfProbe(ctx) {
                if (!renderer || !renderer.info) return;
                ctx.perf.renderer = renderer.info.renderer || 'WebGL2';
                ctx.perf.vendor = renderer.info.vendor || 'unknown';
                ctx.perf.draws = renderer.info.render.calls || 0;
                ctx.perf.tris = renderer.info.render.triangles || 0;
                ctx.perf.geos = renderer.info.memory.geometries || 0;
                ctx.perf.text = renderer.info.memory.textures || 0;
                ctx.perf.resolutionScale = renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
                ctx.perf.quality = state && state.autoScale ? 'auto' : 'manual';
                // Publish the live snapshot to the window so the leak check can
                // read it after the sim is unmounted.
                try {
                    if (!window.__visiqPerf) window.__visiqPerf = {};
                    window.__visiqPerf[ctx.id] = {
                        geometries: ctx.perf.geos,
                        textures: ctx.perf.text,
                        programs: renderer.info.programs ? renderer.info.programs.length : 0,
                        calls: ctx.perf.draws,
                        triangles: ctx.perf.tris
                    };
                } catch (e) { /* window not available */ }
            }
        });

        if (reducedMotion) sim.isPlaying = false;
        sim.renderControls();

        // ---- DOM ----
        var canvas = document.createElement('canvas');
        canvas.className = 'ss-canvas';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label',
            'Three-dimensional view of the solar system: the Sun as the only light source, eight planets on their computed elliptical orbits with true axial tilts, the rings of Saturn, and the Earth and Moon.');
        canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
        container.appendChild(canvas);

        var overlay = document.createElement('canvas');
        overlay.className = 'ss-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.cssText = 'position:absolute;left:12px;bottom:12px;width:236px;height:118px;pointer-events:none;';
        if (!container.style.position) container.style.position = 'relative';
        container.appendChild(overlay);

        var qualityNote = document.createElement('div');
        qualityNote.className = 'ss-quality-note';
        qualityNote.setAttribute('role', 'status');
        qualityNote.style.cssText = 'position:absolute;right:12px;top:12px;font-size:0.72rem;' +
            'font-family:"JetBrains Mono",monospace;font-variant-numeric:tabular-nums;' +
            'color:inherit;opacity:0.72;background:rgba(0,0,0,0.42);padding:5px 8px;' +
            'border-radius:6px;pointer-events:none;max-width:64%;line-height:1.45;';
        container.appendChild(qualityNote);

        var live = document.createElement('p');
        live.className = 'sr-only';
        live.setAttribute('aria-live', 'polite');
        live.setAttribute('aria-atomic', 'true');
        live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;';
        container.appendChild(live);

        // Keyboard-reachable follow control (the pointer raycast below is the
        // mouse path; a select is the keyboard path).
        var followRow = document.createElement('div');
        followRow.style.cssText = 'margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
        var followLabel = document.createElement('label');
        followLabel.textContent = 'Follow';
        followLabel.setAttribute('for', 'ss-follow-select');
        followLabel.style.cssText = 'font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;opacity:0.65;';
        var followSelect = document.createElement('select');
        followSelect.id = 'ss-follow-select';
        followSelect.style.cssText = 'min-height:48px;padding:8px 10px;font:inherit;color:inherit;' +
            'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);border-radius:8px;';
        var followOptions = [{ id: 'sun', label: 'Sun' }].concat(OE.PLANET_ORDER.map(function (id) {
            return { id: id, label: OE.ELEMENTS[id].label };
        }));
        followOptions.forEach(function (o) {
            var opt = document.createElement('option');
            opt.value = o.id;
            opt.textContent = o.label;
            followSelect.appendChild(opt);
        });
        followRow.appendChild(followLabel);
        followRow.appendChild(followSelect);
        if (controls) controls.appendChild(followRow);

        var reduceBtn = document.createElement('button');
        reduceBtn.type = 'button';
        reduceBtn.setAttribute('aria-pressed', 'false');
        reduceBtn.textContent = 'Reduced effects';
        reduceBtn.style.cssText = 'min-height:48px;min-width:48px;margin-top:10px;padding:10px 14px;' +
            'cursor:pointer;font:inherit;color:inherit;background:rgba(255,255,255,0.06);' +
            'border:1px solid rgba(255,255,255,0.18);border-radius:8px;';
        if (controls) controls.appendChild(reduceBtn);

        function appendNote(text, opts) {
            if (!controls) return null;
            var p = document.createElement('p');
            p.style.cssText = 'margin:8px 0 0;font-size:0.84rem;line-height:1.55;color:inherit;opacity:' +
                (opts && opts.faint ? '0.62' : '0.82') + ';';
            p.textContent = text;
            controls.appendChild(p);
            return p;
        }
        appendNote('What to notice: the Earth is moving fastest in early January, when it is closest to the Sun, and slowest in early July. The distance readout changes by only 3 percent, while the speed changes by 3 percent too, because the orbit is nearly circular. Tilt and spin are separate: the Earth leans by 23.4 degrees all year, and that lean is what makes the seasons, not the distance.', {});
        appendNote('Predict: compare the sunlight a planet receives with its distance from the Sun. Does Neptune, at 30 AU, receive roughly 1/30th of the Earth\u2019s sunlight, or 1/900th?', {});
        var limitsNote = appendNote('', { faint: true });
        appendNote('Planet maps: Solar System Scope, CC BY 4.0, via Wikimedia Commons.', { faint: true });

        // ---- scale handling ----
        // 1 scene unit = 1 AU for positions. At true scale the Earth is 4.3e-5 AU
        // across, which is well under one pixel from any camera distance that
        // also shows its orbit, so "readable" mode exaggerates the radii:
        //   - planets: 1500 times true, capped at 8 percent of their own orbit
        //     radius so Jupiter and Saturn cannot swallow their neighbourhoods;
        //   - the Sun: 13 times true, because 1500 times would put its surface
        //     outside Mercury's orbit.
        // Relative sizes are therefore NOT preserved in readable mode. The
        // readout gives the true radius in km, the mode is named on screen, and
        // the limits line says what the exaggeration is. True mode is exact.
        var READABLE_RADIUS_GAIN = 1500;
        var READABLE_SUN_GAIN = 8;
        var READABLE_ORBIT_CAP = 0.08;

        function trueRadiusAu(bodyId) {
            return bodyId === 'sun' ? kmToAu(SUN_RADIUS_KM) : kmToAu(OE.ELEMENTS[bodyId].radiusKm);
        }

        function radiusAu(bodyId) {
            var trueR = trueRadiusAu(bodyId);
            if (sim.params.scaleMode <= 0.5) return trueR;
            if (bodyId === 'sun') return trueR * READABLE_SUN_GAIN;
            var a = OE.elementsAt(bodyId, state.jd).a;
            return Math.min(trueR * READABLE_RADIUS_GAIN, READABLE_ORBIT_CAP * a);
        }

        // ---- state ----
        var state = {
            jd: epochJD() + sim.params.dayOffset,
            autoScale: 1,
            manualReduced: false,
            frameMs: 16.7,
            dtDays: 0.5,
            stepsPerFrame: 1,
            physicsLimited: false,
            dirtyGraph: true,
            history: [],
            drift: 0,
            driftH: 0,
            driftWorst: 0,
            lastDtWall: 1 / 60,
            achievedDaysPerSec: 10,
            disposed: false,
            focus: 'embary',
            starCount: 3000
        };

        // The Sun's GM as an integrator derivative, built once.
        var SUN_FORCE = Integrators.centralForce3(OE.MU_SUN);

        // Point-light intensity in three.js's units, chosen so that the Earth's
        // disc (albedo about 0.3) lands mid-grey at exposure 1 after ACES tone
        // mapping. Measured from the rendered frame, not guessed: see the
        // brightness check in evidence/solar-system/VERIFICATION.md.
        var SUN_LIGHT_INTENSITY = 4.0;

        var bodies = {};       // id -> { state:[x,y,z,vx,vy,vz], e0, h0, mesh, pivot, ring, orbitLine }
        var three = null, renderer = null, scene = null, camera = null;
        var sunLight = null, sunMesh = null, glowSprite = null, starPoints = null;
        var textures = [];
        var rafId = null, lastFrameTime = 0, frameCount = 0, lastLiveUpdate = 0;

        // ---- camera ----
        // The camera frames the body being followed, at a distance proportional
        // to how big that body is drawn. A fixed distance cannot work across
        // four orders of magnitude of radius: at 1.8 AU the Earth is a 10 pixel
        // disc, which is what the first render of this sim actually looked like.
        // Following the Sun means the system view, not a close-up of the Sun: the
        // Sun and the Earth are 1 AU apart, so from 0.5 AU away they are 63
        // degrees apart and cannot both fit in a 45 degree field. The opening
        // frame is therefore the Sun with the inner planets around it, and the
        // Earth's own numbers are always on screen whatever is being followed.
        function frameDistance(id) {
            if (id === 'sun') return 2.6;
            var factor = OE.ELEMENTS[id].hasRing ? 11 : 8;
            return Math.max(0.02, radiusAu(id) * factor);
        }

        var CAM_DEFAULT_AZIMUTH = 0.9;
        var CAM_DEFAULT_POLAR = 1.05;
        var cam = { azimuth: CAM_DEFAULT_AZIMUTH, polar: CAM_DEFAULT_POLAR, distance: 2.6, velAz: 0, velPol: 0, lookAt: [0, 0, 0] };

        function clampPolar(p) {
            var lim = Math.PI * 0.5 - 0.02;
            return Math.max(0.02, Math.min(lim, p));
        }
        function clampDistance(d) {
            return Math.max(0.0009, Math.min(160, d));
        }

        var controller = {
            mode: '3d',
            sim: sim,
            inner: null,
            destroy: function () {
                if (controller.inner) {
                    try { controller.inner.destroy(); } catch (e) { /* already gone */ }
                    controller.inner = null;
                }
                teardown3D();
                sim.destroy();
            },
            reset: function () {
                cam.azimuth = CAM_DEFAULT_AZIMUTH;
                cam.polar = CAM_DEFAULT_POLAR;
                cam.distance = frameDistance(state.focus);
                cam.velAz = 0;
                cam.velPol = 0;
                state.autoScale = 1;
                state.manualReduced = false;
                reduceBtn.setAttribute('aria-pressed', 'false');
                state.history.length = 0;
                reseed(epochJD());
                sim.reset();
            },
            describe: function () { return describeState(); },
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
                return {
                    scale: state.autoScale,
                    frameMs: state.frameMs,
                    dtDays: state.dtDays,
                    physicsLimited: state.physicsLimited,
                    stars: state.starCount
                };
            },
            camera: function () {
                return { azimuth: cam.azimuth, polar: cam.polar, distance: cam.distance };
            },
            // Read-only probe: the live integrated state of every body, so a
            // verification script can compare the integration against the
            // element table instead of trusting the picture.
            bodies: function () {
                var out = { jd: state.jd, mode: sim.params.scaleMode > 0.5 ? 'readable' : 'true', focus: state.focus };
                OE.PLANET_ORDER.forEach(function (id) {
                    var b = bodies[id];
                    if (!b) return;
                    var s = b.state;
                    var r = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
                    var v = Math.sqrt(s[3] * s[3] + s[4] * s[4] + s[5] * s[5]);
                    // Six digits are enough to compare against the table at the
                    // arcminute level the table itself claims.
                    out[id] = {
                        x: +s[0].toFixed(9), y: +s[1].toFixed(9), z: +s[2].toFixed(9),
                        r: +r.toFixed(9), v: +v.toFixed(9),
                        tableX: +OE.positionAt(id, state.jd).x.toFixed(9),
                        tableY: +OE.positionAt(id, state.jd).y.toFixed(9),
                        tableZ: +OE.positionAt(id, state.jd).z.toFixed(9)
                    };
                });
                return out;
            }
        };

        function describeState() {
            var b = bodies[state.focus];
            var label = state.focus === 'sun' ? 'the Sun' : OE.ELEMENTS[state.focus].label;
            if (!b) {
                var e = bodies.embary;
                if (!e) return 'Solar system at ' + fmtDate(state.jd) + '.';
                var es = e.state;
                var er = Math.sqrt(es[0] * es[0] + es[1] * es[1] + es[2] * es[2]);
                var ev = Math.sqrt(es[3] * es[3] + es[4] * es[4] + es[5] * es[5]);
                return 'Solar system view on ' + fmtDate(state.jd) + '. The Earth-Moon '
                    + 'barycentre is ' + fmt(er, 3) + ' AU from the Sun and moving at '
                    + fmt(ev * KM_PER_AU / 86400, 2) + ' kilometres per second.'
                    + (sim.isPlaying ? '' : ' Paused.');
            }
            var s = b.state;
            var r = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
            var v = Math.sqrt(s[3] * s[3] + s[4] * s[4] + s[5] * s[5]);
            return 'Solar system on ' + fmtDate(state.jd) + ', following ' + label + '. '
                + 'Distance from the Sun ' + fmt(r) + ' AU, heliocentric speed '
                + fmt(v * KM_PER_AU / 86400) + ' km/s. '
                + (sim.params.scaleMode > 0.5
                    ? 'Planet radii are exaggerated ' + READABLE_RADIUS_GAIN + ' times so they are visible.'
                    : 'True scale: planet radii are at their real size.')
                + (sim.isPlaying ? '' : ' Paused.');
        }

        // ---- reseed from the element table ----
        function reseed(jd) {
            state.jd = jd;
            state.history.length = 0;
            state.driftWorst = 0;
            OE.PLANET_ORDER.forEach(function (id) {
                var b = bodies[id];
                if (!b) return;
                var st = OE.stateAt(id, jd);
                b.state = [st.x, st.y, st.z, st.vx, st.vy, st.vz];
                b.e0 = Integrators.specificOrbitalEnergy3(b.state, OE.MU_SUN);
                b.h0 = Integrators.angularMomentum3(b.state);
                b.phase = 0;
            });
            rebuildOrbitLines();
            state.dirtyGraph = true;
        }

        function rebuildOrbitLines() {
            if (!three || !scene) return;
            OE.PLANET_ORDER.forEach(function (id) {
                var b = bodies[id];
                if (!b || !b.orbitLine) return;
                var period = OE.periodDays(OE.elementsAt(id, state.jd).a);
                var pts = 256;
                var arr = b.orbitLine.geometry.attributes.position.array;
                for (var k = 0; k < pts; k++) {
                    var p = OE.positionAt(id, state.jd + k * period / pts);
                    arr[k * 3 + 0] = p.x;
                    arr[k * 3 + 1] = p.y;
                    arr[k * 3 + 2] = p.z;
                }
                b.orbitLine.geometry.attributes.position.needsUpdate = true;
                b.orbitLine.geometry.computeBoundingSphere();
            });
        }

        // ---- three.js setup ----
        function makeStarTexture() {
            var c = document.createElement('canvas');
            c.width = c.height = 64;
            var g = c.getContext('2d');
            var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 64, 64);
            return c;
        }

        function makeRingGeometry(inner, outer, segments) {
            var geo = new three.RingGeometry(inner, outer, segments, 1);
            var pos = geo.attributes.position;
            var uv = geo.attributes.uv;
            var v = new three.Vector3();
            for (var i = 0; i < pos.count; i++) {
                v.fromBufferAttribute(pos, i);
                var t = (v.length() - inner) / (outer - inner);
                // The ring strip has radius along its x axis, so the radial
                // fraction of the mesh becomes the horizontal texture coordinate.
                uv.setXY(i, t, 0.5);
            }
            uv.needsUpdate = true;
            return geo;
        }

        function loadTexture(file) {
            var url;
            try {
                url = new URL('assets/textures/planets/' + file + '.webp', document.baseURI).href;
            } catch (e) {
                url = 'assets/textures/planets/' + file + '.webp';
            }
            var tex = new three.TextureLoader().load(url, function () {
                state.dirtyGraph = true;
            }, undefined, function () {
                console.warn('[solar-system] texture failed to load: ' + url);
            });
            tex.colorSpace = three.SRGBColorSpace;
            tex.anisotropy = 4;
            textures.push(tex);
            return tex;
        }

        function buildScene() {
            scene = new three.Scene();

            // Stars. CHECK: positions are random on a sphere, not a star
            // catalogue; the limits line says so.
            var starGeo = new three.BufferGeometry();
            var starPos = new Float32Array(state.starCount * 3);
            for (var i = 0; i < state.starCount; i++) {
                var u = Math.random() * 2 - 1;
                var th = Math.random() * Math.PI * 2;
                var s = Math.sqrt(1 - u * u);
                starPos[i * 3 + 0] = Math.cos(th) * s * 300;
                starPos[i * 3 + 1] = Math.sin(th) * s * 300;
                starPos[i * 3 + 2] = u * 300;
            }
            starGeo.setAttribute('position', new three.BufferAttribute(starPos, 3));
            starPoints = new three.Points(starGeo, new three.PointsMaterial({
                size: 2.0, sizeAttenuation: false, color: 0xffffff,
                map: new three.CanvasTexture(makeStarTexture()),
                transparent: true, depthWrite: false
            }));
            scene.add(starPoints);

            // The Sun is the only light. Physically the irradiance falls as
            // 1/r^2, which over 30 AU is a factor of 900; the lightComp control
            // rescales each body's received light for display and is labelled as
            // not physical.
            sunLight = new three.PointLight(0xffffff, 0, 0, 2);
            scene.add(sunLight);

            // The Sun is the light source, so it is unlit by construction: a
            // basic material showing the photosphere map, rather than a standard
            // material being lit by the point light at distance zero (which
            // would blow the disc out to pure white and hide the map).
            var sunGeo = new three.SphereGeometry(1, 48, 24);
            var sunMat = new three.MeshBasicMaterial({ map: loadTexture('sun') });
            // Pushed above 1 so ACES tone mapping takes the disc toward white
            // with a warm rim, the way an overexposed star reads, instead of
            // the flat orange the map alone gives.
            sunMat.color.setRGB(2.7, 2.3, 1.75);
            sunMesh = new three.Mesh(sunGeo, sunMat);
            sunMesh.name = 'body-sun';
            scene.add(sunMesh);

            var glowTex = new three.CanvasTexture(makeStarTexture());
            glowSprite = new three.Sprite(new three.SpriteMaterial({
                map: glowTex, color: 0xffe3b0, transparent: true,
                blending: three.AdditiveBlending, depthWrite: false
            }));
            scene.add(glowSprite);

            OE.PLANET_ORDER.forEach(function (id) {
                var body = OE.ELEMENTS[id];
                var geo = new three.SphereGeometry(1, 48, 24);
                var mat = new three.MeshStandardMaterial({
                    map: loadTexture(body.texture), roughness: 0.92, metalness: 0
                });
                if (body.nightTexture) {
                    // City lights emit rather than reflect, so they belong in the
                    // emissive channel. An emissive map alone would also paint
                    // the day side, so the material is patched to multiply the
                    // emissive term by the night factor, computed from the real
                    // Sun direction per fragment.
                    mat.emissiveMap = loadTexture(body.nightTexture);
                    mat.emissive = new three.Color(0xffc46b);
                    mat.emissiveIntensity = 0.9;
                    mat.onBeforeCompile = function (shader) {
                        shader.uniforms.uSunViewPos = { value: new three.Vector3() };
                        shader.uniforms.uBodyViewPos = { value: new three.Vector3() };
                        // The declarations have to be part of the source: adding
                        // an entry to shader.uniforms does not declare it in GLSL.
                        shader.fragmentShader = 'uniform vec3 uSunViewPos;\nuniform vec3 uBodyViewPos;\n\n' +
                            shader.fragmentShader.replace(
                                '#include <emissivemap_fragment>',
                                '#include <emissivemap_fragment>\n' +
                                '  {\n' +
                                '    vec3 sunDir = normalize(uSunViewPos - uBodyViewPos);\n' +
                                '    float day = dot(normalize(vNormal), sunDir);\n' +
                                '    totalEmissiveRadiance *= 1.0 - smoothstep(-0.05, 0.15, day);\n' +
                                '  }'
                            );
                        mat.userData.shader = shader;
                    };
                }
                var mesh = new three.Mesh(geo, mat);
                mesh.name = 'body-' + id;

                // A tilt pivot so the spin axis leans by the true obliquity and
                // stays fixed in space as the body moves around the Sun.
                var pivot = new three.Object3D();
                pivot.rotation.z = AXIAL_TILT[id] * Math.PI / 180;
                pivot.add(mesh);
                scene.add(pivot);

                var ring = null;
                if (body.hasRing) {
                    var rInner = radiusAu(id) * 1.24;
                    var rOuter = radiusAu(id) * 2.27;
                    var ringGeo = makeRingGeometry(rInner, rOuter, 128);
                    var ringMat = new three.MeshBasicMaterial({
                        map: loadTexture('saturn-ring'), transparent: true, opacity: 0.9,
                        side: three.DoubleSide, depthWrite: false
                    });
                    ring = new three.Mesh(ringGeo, ringMat);
                    ring.rotation.x = Math.PI / 2;
                    pivot.add(ring);
                }

                // Cloud layer: the same cloud map used as an alpha map on a
                // slightly larger sphere, so the clouds are lit by the Sun like
                // everything else and hide the surface below them. They turn a
                // little faster than the surface, which is what the real
                // atmosphere does (the jet stream outruns the ground).
                var clouds = null;
                if (body.nightTexture) {
                    var cloudGeo = new three.SphereGeometry(1.005, 48, 24);
                    var cloudMat = new three.MeshStandardMaterial({
                        // Slightly grey rather than pure white: at full white the
                        // sub-solar cloud tops clip after tone mapping and read
                        // as a blown highlight instead of cloud.
                        color: 0xcfd8e0, alphaMap: loadTexture('earth-clouds'),
                        transparent: true, opacity: 0.92, depthWrite: false,
                        roughness: 1, metalness: 0
                    });
                    clouds = new three.Mesh(cloudGeo, cloudMat);
                    clouds.name = 'clouds-' + id;
                    pivot.add(clouds);
                }

                var moon = null;
                if (body.hasMoon) {
                    var moonGeo = new three.SphereGeometry(1, 32, 16);
                    var moonMat = new three.MeshStandardMaterial({
                        map: loadTexture('moon'), roughness: 0.95, metalness: 0
                    });
                    moon = new three.Mesh(moonGeo, moonMat);
                    moon.name = 'body-moon';
                    scene.add(moon);
                }

                // Orbit path, computed from the elements at the current date.
                var pts = 256;
                var lineGeo = new three.BufferGeometry();
                lineGeo.setAttribute('position', new three.BufferAttribute(new Float32Array(pts * 3), 3));
                var line = new three.Line(lineGeo, new three.LineBasicMaterial({
                    color: 0x7dd3fc, transparent: true, opacity: 0.28
                }));
                line.frustumCulled = false;
                scene.add(line);

                bodies[id] = { state: [0, 0, 0, 0, 0, 0], e0: 0, h0: [0, 0, 0], mesh: mesh, pivot: pivot, ring: ring, moon: moon, clouds: clouds, orbitLine: line, phase: 0, cloudPhase: 0 };
            });
        }

        function pickInitialScale() {
            var m = measure();
            var px = m.w * m.h;
            if (px > 900000) state.autoScale = 0.72;
            else if (px > 420000) state.autoScale = 0.85;
            else state.autoScale = 1.0;
        }

        // ---- sizing ----
        var resizeObserver = null, resizeTimer = null;

        function measure() {
            var w = Math.max(320, container.clientWidth || 640);
            var h = Math.max(240, container.clientHeight || 420);
            return { w: w, h: h };
        }

        function applySize() {
            var m = measure();
            renderer.setPixelRatio(1);
            renderer.setSize(Math.max(160, Math.floor(m.w * state.autoScale)),
                Math.max(120, Math.floor(m.h * state.autoScale)), false);
            canvas.style.width = m.w + 'px';
            canvas.style.height = m.h + 'px';
            camera.aspect = m.w / m.h;
            camera.updateProjectionMatrix();
        }

        // ---- readouts ----
        function sunlightFactor(r) {
            return 1 / (r * r);
        }

        function refreshReadouts() {
            var id = state.focus;
            var b = bodies[id];
            var label = id === 'sun' ? 'Sun (system view)' : OE.ELEMENTS[id].label;
            var rows = { 'Date': fmtDate(state.jd), 'Focused body': label };

            var daysPerSec = Math.pow(10, sim.params.logDaysPerSec);
            var achieved = state.achievedDaysPerSec === undefined ? daysPerSec : state.achievedDaysPerSec;
            rows['Time rate'] = (daysPerSec < 400
                ? fmt(daysPerSec, 1) + ' days per second'
                : fmt(daysPerSec / 365.25, 1) + ' years per second')
                + (state.physicsLimited ? ' (physics-limited: ' + fmt(achieved / 365.25, 1) + ' yr/s)' : '');

            if (b) {
                var s = b.state;
                var r = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
                var v = Math.sqrt(s[3] * s[3] + s[4] * s[4] + s[5] * s[5]);
                var el = OE.elementsAt(id, state.jd);
                var period = OE.periodDays(el.a);
                rows['Distance from Sun'] = fmt(r, 3) + ' AU';
                rows['Heliocentric speed'] = fmt(v * KM_PER_AU / 86400, 2) + ' km/s';
                rows['Orbital period'] = fmtDays(period);
                // Kepler's third law, evaluated on the table's own semi-major
                // axis: (P/yr)^2 / (a/AU)^3, which is 1 by construction of the
                // table and is what the integration reproduces.
                rows['Kepler III P^2/a^3'] = fmt(Math.pow(period / 365.25, 2) / Math.pow(el.a, 3), 4) + ' yr^2/AU^3';
                rows['Energy drift (RK4)'] = state.drift.toExponential(2) + ' (worst ' + state.driftWorst.toExponential(2) + ')';
                rows['Angular momentum drift'] = state.driftH.toExponential(2);
                // The element table is a closed-form answer for the same two-body
                // problem, so the distance between the integration and the table
                // is the integration's own error. Shown live rather than only in
                // a test, because it grows with the time rate and the user is the
                // one choosing that rate.
                var tp = OE.positionAt(id, state.jd);
                var rdx = s[0] - tp.x, rdy = s[1] - tp.y, rdz = s[2] - tp.z;
                rows['Residual vs element table'] = fmt(Math.sqrt(rdx * rdx + rdy * rdy + rdz * rdz) * KM_PER_AU, 0) + ' km';
                rows['Element table valid'] = (state.jd > OE.julianDay(1800, 1, 1) && state.jd < OE.julianDay(2050, 1, 1))
                    ? 'yes, 1800 to 2050' : 'NO, extrapolated past 2050';
                rows['Sunlight relative to Earth'] = fmt(sunlightFactor(r), 4) + ' x Earth';
                rows['Axial tilt'] = fmt(AXIAL_TILT[id], 2) + ' deg';
                rows['Rotation period'] = fmt(BODY_FACTS[id].rotationDays, 3) + ' d';
                rows['True radius'] = fmt(trueRadiusAu(id) * KM_PER_AU, 1) + ' km';
                rows['Mean surface temperature'] = BODY_FACTS[id].tempK + ' K';
            } else {
                rows['Distance from Sun'] = '0 AU (the source of the light)';
                rows['Heliocentric speed'] = '-';
                rows['Kepler III P^2/a^3'] = '-';
                rows['Energy drift (RK4)'] = '-';
                rows['Residual vs element table'] = '-';
                rows['Sunlight relative to Earth'] = '-';
            }

            // The Earth's own numbers stay on screen whatever is being followed,
            // because the Earth is the body the perihelion speed-up is about and
            // following the Sun switches to the system view.
            var earth = bodies.embary;
            if (earth) {
                var es = earth.state;
                var er = Math.sqrt(es[0] * es[0] + es[1] * es[1] + es[2] * es[2]);
                var ev = Math.sqrt(es[3] * es[3] + es[4] * es[4] + es[5] * es[5]);
                rows['Earth distance from Sun'] = fmt(er, 3) + ' AU';
                rows['Earth speed'] = fmt(ev * KM_PER_AU / 86400, 2) + ' km/s';
                rows['Earth sunlight'] = fmt(sunlightFactor(er), 4) + ' x the value at 1 AU';
            }

            sim._telemetry = rows;
            sim.updateTelemetry();
        }

        function refreshLimits() {
            var el = OE.elementsAt('embary', state.jd);
            var period = OE.periodDays(el.a);
            limitsNote.textContent =
                'What this model leaves out: the planets move under the Sun\u2019s gravity alone, '
                + 'so there are no planet-planet perturbations and the table\u2019s own nominal '
                + 'longitude error applies (about 1/3 arcminute for the Earth, 10 arcminutes for '
                + 'Saturn over 1800 to 2050, which is the table\u2019s stated interval). The Earth '
                + 'row is the Earth-Moon barycentre, not the Earth: the two differ by up to '
                + '0.00257 AU, about 6 times the Earth\u2019s own radius, and the Moon here is a '
                + 'circular 27.32 day orbit at the mean distance rather than a real ephemeris. '
                + 'The Sun\u2019s light is treated as constant; a real star loses mass and brightens '
                + 'over these timescales. Planets are perfect spheres with a single albedo map: no '
                + 'topography. The cloud layer is one flat alpha map with no thickness, so '
                + 'no cloud casts a shadow and none changes shape; it turns 12 percent faster '
                + 'than the surface, which is a real effect but not this one. The '
                + 'rings cast no shadow on Saturn and nothing eclipses anything. The '
                + 'star field is random, not a catalogue. The model also cannot follow the '
                + 'table\u2019s own per-century element drift, which is where the real perturbations '
                + 'by the other planets live: measured 130 years from the epoch, the integration '
                + 'sits 32 arcminutes from the table for the Earth-Moon barycentre and 117 '
                + 'arcminutes for Jupiter, while repeating the same comparison with the elements '
                + 'held frozen at their epoch values gives 15 and 115 arcminutes. So for the giant '
                + 'planets almost the whole difference is the missing perturbation, not the '
                + 'arithmetic. The table is valid 1800 to 2050; outside that the readout says the '
                + 'elements are extrapolated. Nothing here is scaled in time: one '
                + 'second of wall clock is ' + fmt(Math.pow(10, sim.params.logDaysPerSec), 1) +
                ' days, and the Earth\u2019s year takes ' +
                fmt(Math.max(0.4, 365.25 / Math.pow(10, sim.params.logDaysPerSec)), 1) + ' seconds.';
        }

        // ---- graph: heliocentric speed of the focused body ----
        function drawGraph() {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            var w = 236, h = 118;
            var c = overlay.getContext('2d');
            overlay.width = Math.floor(w * dpr);
            overlay.height = Math.floor(h * dpr);
            c.setTransform(dpr, 0, 0, dpr, 0, 0);
            c.clearRect(0, 0, w, h);
            c.fillStyle = 'rgba(2,6,23,0.55)';
            roundRect(c, 0, 0, w, h, 8);
            c.fill();

            var padL = 10, padR = 10, padT = 20, padB = 18;
            var plotW = w - padL - padR, plotH = h - padT - padB;
            var hist = state.history;
            var label = state.focus === 'sun' ? 'Earth' : OE.ELEMENTS[state.focus].label;

            c.fillStyle = 'rgba(226,232,240,0.86)';
            c.font = '9px "JetBrains Mono", monospace';
            c.fillText(label + ' speed (km/s)', padL, 12);

            if (hist.length > 1) {
                var min = Infinity, max = -Infinity;
                for (var i = 0; i < hist.length; i++) {
                    if (hist[i] < min) min = hist[i];
                    if (hist[i] > max) max = hist[i];
                }
                var span = Math.max(1e-6, max - min);
                c.strokeStyle = 'rgba(45,212,191,0.95)';
                c.lineWidth = 1.6;
                c.beginPath();
                for (var j = 0; j < hist.length; j++) {
                    var x = padL + plotW * (j / (hist.length - 1));
                    var y = padT + plotH * (1 - (hist[j] - min) / span);
                    if (j === 0) c.moveTo(x, y); else c.lineTo(x, y);
                }
                c.stroke();
                c.fillStyle = 'rgba(226,232,240,0.7)';
                c.fillText(fmt(min, 1) + ' -> ' + fmt(max, 1), padL, h - 5);
            } else {
                c.fillStyle = 'rgba(226,232,240,0.6)';
                c.fillText('collecting...', padL, padT + 16);
            }
        }

        function roundRect(c, x, y, w, h, r) {
            c.beginPath();
            c.moveTo(x + r, y);
            c.lineTo(x + w - r, y);
            c.quadraticCurveTo(x + w, y, x + w, y + r);
            c.lineTo(x + w, y + h - r);
            c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            c.lineTo(x + r, y + h);
            c.quadraticCurveTo(x, y + h, x, y + h - r);
            c.lineTo(x, y + r);
            c.quadraticCurveTo(x, y, x + r, y);
            c.closePath();
        }

        // ---- pointer / keyboard ----
        var pointers = new Map();
        var dragging = false, lastX = 0, lastY = 0;
        var pinchStart = 0, pinchDist = 0;
        var dragMoved = 0;

        function onPointerDown(e) {
            canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.size === 1) {
                dragging = true;
                dragMoved = 0;
                lastX = e.clientX;
                lastY = e.clientY;
            } else if (pointers.size === 2) {
                var pts = Array.from(pointers.values());
                pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                pinchStart = cam.distance;
            }
        }

        function onPointerMove(e) {
            if (!pointers.has(e.pointerId)) return;
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.size >= 2) {
                var pts = Array.from(pointers.values());
                var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                if (pinchDist > 0) cam.distance = clampDistance(pinchStart * (pinchDist / Math.max(1, d)));
                return;
            }
            if (!dragging) return;
            var dx = e.clientX - lastX;
            var dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            dragMoved += Math.abs(dx) + Math.abs(dy);
            cam.azimuth -= dx * 0.005;
            cam.polar = clampPolar(cam.polar - dy * 0.005);
            cam.velAz = -dx * 0.0006;
            cam.velPol = -dy * 0.0006;
        }

        function onPointerUp(e) {
            pointers.delete(e.pointerId);
            if (pointers.size === 0) dragging = false;
            if (e.type === 'pointerup' && dragMoved < 6) pickAt(e);
        }

        function onWheel(e) {
            e.preventDefault();
            cam.distance = clampDistance(cam.distance * (1 + Math.sign(e.deltaY) * 0.12));
        }

        function onKeyDown(e) {
            var tag = (e.target && e.target.tagName) || '';
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
            var step = e.shiftKey ? 0.12 : 0.04;
            var handled = true;
            switch (e.key) {
                case 'ArrowLeft': cam.azimuth += step; break;
                case 'ArrowRight': cam.azimuth -= step; break;
                case 'ArrowUp': cam.polar = clampPolar(cam.polar + step); break;
                case 'ArrowDown': cam.polar = clampPolar(cam.polar - step); break;
                case '+': case '=': cam.distance = clampDistance(cam.distance * 0.9); break;
                case '-': case '_': cam.distance = clampDistance(cam.distance * 1.1); break;
                default: handled = false;
            }
            if (handled) e.preventDefault();
        }

        var pointerListeners = [
            ['pointerdown', onPointerDown, { passive: true }],
            ['pointermove', onPointerMove, { passive: true }],
            ['pointerup', onPointerUp, { passive: true }],
            ['pointercancel', onPointerUp, { passive: true }],
            ['wheel', onWheel, { passive: false }]
        ];
        function addPointerListeners() {
            pointerListeners.forEach(function (l) { canvas.addEventListener(l[0], l[1], l[2]); });
        }
        function removePointerListeners() {
            pointerListeners.forEach(function (l) { canvas.removeEventListener(l[0], l[1], l[2]); });
        }
        function addKeyListeners() { window.addEventListener('keydown', onKeyDown); }
        function removeKeyListeners() { window.removeEventListener('keydown', onKeyDown); }

        function pickAt(e) {
            if (!renderer || !camera) return;
            var rect = canvas.getBoundingClientRect();
            var ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            var ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            var ndc = new three.Vector2(ndcX, ndcY);
            var ray = new three.Raycaster();
            ray.setFromCamera(ndc, camera);
            var targets = [sunMesh];
            OE.PLANET_ORDER.forEach(function (id) { targets.push(bodies[id].mesh); });
            var hits = ray.intersectObjects(targets, false);
            if (!hits.length) return;
            var name = hits[0].object.name || '';
            var id = name.replace('body-', '');
            setFocus(id === 'sun' ? 'sun' : id);
        }

        function setFocus(id, reframe) {
            state.focus = id;
            followSelect.value = id;
            state.history.length = 0;
            state.dirtyGraph = true;
            if (reframe !== false) {
                cam.distance = frameDistance(id);
                cam.velAz = 0;
                cam.velPol = 0;
            }
            refreshReadouts();
            state.dirtyGraph = true;
        }

        // ---- resize / context ----
        function onWindowResize() {
            if (state.disposed) return;
            applySize();
        }

        function onContextLost(e) {
            e.preventDefault();
            console.warn('[solar-system] WebGL context lost');
            fallbackTo2D('The graphics context was lost, so the flat orbit plot is shown instead of a blank canvas.');
        }

        // ---- teardown ----
        function teardown3D() {
            state.disposed = true;
            if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
            removePointerListeners();
            removeKeyListeners();
            if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
            canvas.removeEventListener('webglcontextlost', onContextLost, false);
            window.removeEventListener('resize', onWindowResize);

            if (scene) {
                scene.traverse(function (obj) {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (obj.material.map && textures.indexOf(obj.material.map) === -1) obj.material.map.dispose();
                        if (obj.material.emissiveMap && textures.indexOf(obj.material.emissiveMap) === -1) obj.material.emissiveMap.dispose();
                        obj.material.dispose();
                    }
                });
            }
            textures.forEach(function (t) { t.dispose(); });
            textures.length = 0;
            if (renderer) {
                renderer.forceContextLoss();
                renderer.dispose();
                renderer = null;
            }
            scene = null;
            camera = null;
            sunLight = null;
            sunMesh = null;
            glowSprite = null;
            starPoints = null;
            bodies = {};
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (qualityNote.parentNode) qualityNote.parentNode.removeChild(qualityNote);
            if (reduceBtn.parentNode) reduceBtn.parentNode.removeChild(reduceBtn);
            if (followRow.parentNode) followRow.parentNode.removeChild(followRow);
        }

        function fallbackTo2D(reason) {
            if (controller.mode === '2d') return;
            teardown3D();
            try { sim.destroy(); } catch (e) { /* nothing mounted */ }
            controller.inner = mount2D(config, reason);
            controller.mode = '2d';
        }

        // ---- physics ----
        // The step is bounded by the fastest orbit in the system, not by the
        // wall-clock rate. Two earlier versions failed here and both failures
        // are the reason for the numbers below:
        //   - letting the step follow the time rate reached a 4.93 relative
        //     energy error on Mercury (the orbit was being destroyed), so the
        //     step is now capped by Mercury's 88 day period instead;
        //   - at 80 steps per Mercury orbit the energy stayed fine but the
        //     orbital phase drifted 55 degrees over 276 years, which the live
        //     residual readout now exposes instead of hiding.
        // The step below is 150 steps per Mercury orbit. The cost is that the
        // fastest clock setting advances less than it asked for, which the
        // quality note and the time-rate readout both state. The residual this
        // step produces is measured by scripts/verify-3d.mjs orbitcheck and
        // quoted in evidence/solar-system/VERIFICATION.md.
        var MIN_PERIOD_DAYS = 88;
        var STEPS_PER_FASTEST_ORBIT = 150;
        var MAX_STEPS_PER_FRAME = 360;
        var MAX_STEP_DAYS = MIN_PERIOD_DAYS / STEPS_PER_FASTEST_ORBIT;

        function advance(days) {
            var dt = Math.max(0.02, Math.min(MAX_STEP_DAYS, days / MAX_STEPS_PER_FRAME));
            var steps = Math.max(1, Math.ceil(days / dt));
            var limited = false;
            if (steps > MAX_STEPS_PER_FRAME) {
                // Ask for more than the step limit allows: advance less than the
                // clock asked for and say so, rather than coarsening the step.
                steps = MAX_STEPS_PER_FRAME;
                limited = true;
            }
            var actualDt = (limited ? steps * dt : days) / steps;
            var advanced = steps * actualDt;
            state.dtDays = actualDt;
            state.stepsPerFrame = steps;
            state.physicsLimited = limited;

            var worst = 0, worstH = 0;
            OE.PLANET_ORDER.forEach(function (id) {
                var b = bodies[id];
                if (!b) return;
                for (var i = 0; i < steps; i++) b.state = Integrators.rk4(SUN_FORCE, b.state, actualDt);
                var e = Integrators.specificOrbitalEnergy3(b.state, OE.MU_SUN);
                var h = Integrators.angularMomentum3(b.state);
                var h0 = Math.sqrt(b.h0[0] * b.h0[0] + b.h0[1] * b.h0[1] + b.h0[2] * b.h0[2]);
                var hn = Math.sqrt(h[0] * h[0] + h[1] * h[1] + h[2] * h[2]);
                var dE = Math.abs((e - b.e0) / b.e0);
                var dH = Math.abs(hn / h0 - 1);
                if (id === state.focus) { state.drift = dE; state.driftH = dH; }
                if (dE > worst) worst = dE;
                if (dH > worstH) worstH = dH;
            });
            state.driftWorst = Math.max(state.driftWorst, worst);
            state.jd += advanced;
            if (limited) {
                // The clock ran ahead of the physics; the readouts and the date
                // follow the physics, so the displayed rate is the achieved one.
                state.achievedDaysPerSec = advanced / Math.max(1e-6, state.lastDtWall);
            } else {
                state.achievedDaysPerSec = Math.pow(10, sim.params.logDaysPerSec) * sim.speed;
            }
        }

        function updateMeshes(dtDays) {
            var readable = sim.params.scaleMode > 0.5;

            var sunR = radiusAu('sun');
            sunMesh.scale.setScalar(sunR);
            glowSprite.scale.setScalar(sunR * 5);
            glowSprite.position.set(0, 0, 0);

            var focusPos = [0, 0, 0];
            OE.PLANET_ORDER.forEach(function (id) {
                var b = bodies[id];
                if (!b) return;
                var s = b.state;
                var r = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
                b.pivot.position.set(s[0], s[1], s[2]);
                b.mesh.scale.setScalar(radiusAu(id));
                if (b.clouds) b.clouds.scale.setScalar(radiusAu(id));
                var rot = BODY_FACTS[id].rotationDays;
                b.phase += (2 * Math.PI / rot) * dtDays;
                b.mesh.rotation.y = b.phase;
                if (b.clouds) {
                    b.cloudPhase = (b.cloudPhase || 0) + (2 * Math.PI / rot) * dtDays * 1.12;
                    b.clouds.rotation.y = b.cloudPhase;
                }
                if (id === state.focus) focusPos = [s[0], s[1], s[2]];

                // Sunlight with the real 1/r^2 falloff. Compensation is applied
                // as an albedo scale of r^2, which cancels the real falloff so
                // every body renders as if it sat at 1 AU. It changes what the
                // viewer sees, not what the physics computes, and the control is
                // labelled "display only" for that reason.
                var base = sunlightFactor(r);
                var boost = sim.params.lightComp > 0.5 ? Math.min(1200, 1 / base) : 1;
                if (b._boost !== boost) {
                    b._boost = boost;
                    b.mesh.material.color.setScalar(boost);
                }
                if (b.moon) b.moon.material.color.setScalar(Math.min(1200, 1 / Math.max(1e-9, base)));

                if (b.moon) {
                    // Circular Moon orbit at the mean distance. In readable mode
                    // the Moon cannot keep its true distance: the Earth's radius
                    // is enlarged 1500 times while the Earth-Moon distance is 60
                    // Earth radii, so an honest 1500 times that distance would put
                    // the Moon 3.9 AU away, further from the Earth than Mars is
                    // from the Sun. It is placed 3.2 Earth radii out instead, and
                    // the limits line says the ratio is not preserved.
                    var moonDist = kmToAu(MOON_DISTANCE_KM);
                    if (readable) moonDist = Math.max(moonDist, 3.2 * radiusAu(id));
                    var ang = (2 * Math.PI / MOON_PERIOD_DAYS) * (state.jd - OE.J2000_JD);
                    b.moon.position.set(
                        s[0] + Math.cos(ang) * moonDist,
                        s[1] + Math.sin(ang) * moonDist * 0.17,
                        s[2] + Math.sin(ang) * moonDist
                    );
                    b.moon.scale.setScalar(kmToAu(MOON_RADIUS_KM) * (readable ? READABLE_RADIUS_GAIN : 1));
                }
                if (b.orbitLine) b.orbitLine.visible = sim.params.showOrbits > 0.5;
            });

            // One point light at the Sun with decay 2, so the irradiance really
            // does fall as 1/r^2. This is the only light in the scene: there is
            // no ambient term, which is why a body's unlit side is black.
            sunLight.position.set(0, 0, 0);
            sunLight.intensity = SUN_LIGHT_INTENSITY;
            sunLight.distance = 0;

            // The night-side light patch needs the Sun and the body in view
            // space; the renderer's view matrix is current after the last frame,
            // which is close enough for a terminator that moves at most a pixel
            // per frame.
            var earth = bodies.embary;
            if (earth && earth.mesh.material.userData.shader) {
                var sh = earth.mesh.material.userData.shader;
                sh.uniforms.uSunViewPos.value.set(0, 0, 0).applyMatrix4(camera.matrixWorldInverse);
                sh.uniforms.uBodyViewPos.value.set(earth.pivot.position.x, earth.pivot.position.y, earth.pivot.position.z)
                    .applyMatrix4(camera.matrixWorldInverse);
            }

            cam.lookAt = focusPos;
        }

        function computeCamera() {
            var sp = Math.sin(cam.polar), cp = Math.cos(cam.polar);
            var sa = Math.sin(cam.azimuth), ca = Math.cos(cam.azimuth);
            var d = cam.distance;
            var lx = cam.lookAt[0], ly = cam.lookAt[1], lz = cam.lookAt[2];
            camera.position.set(
                lx + d * sp * ca,
                ly + d * sp * sa,
                lz + d * cp
            );
            camera.up.set(0, 0, 1);
            camera.lookAt(lx, ly, lz);
        }

        // ---- frame loop ----
        function frame(now) {
            if (state.disposed) return;
            rafId = requestAnimationFrame(frame);

            var dtWall = Math.min(0.1, (now - lastFrameTime) / 1000);
            lastFrameTime = now;

            if (!dragging && (Math.abs(cam.velAz) > 1e-4 || Math.abs(cam.velPol) > 1e-4)) {
                cam.azimuth += cam.velAz;
                cam.polar = clampPolar(cam.polar + cam.velPol);
                cam.velAz *= 0.92;
                cam.velPol *= 0.92;
            }

            var daysPerSec = Math.pow(10, sim.params.logDaysPerSec) * sim.speed;
            var days = 0;
            if (sim.isPlaying) {
                days = dtWall * daysPerSec;
                state.lastDtWall = dtWall;
                advance(days);
            } else {
                state.achievedDaysPerSec = 0;
            }

            updateMeshes(days);
            computeCamera();
            renderer.toneMappingExposure = sim.params.exposure;
            renderer.render(scene, camera);

            var ms = dtWall * 1000;
            if (ms > 0 && ms < 200) state.frameMs = state.frameMs * 0.9 + ms * 0.1;
            frameCount++;
            if (frameCount % 20 === 0) govern();

            if (frameCount % 10 === 0) {
                var graphId = state.focus === 'sun' ? 'embary' : state.focus;
                var b = bodies[graphId];
                if (b) {
                    var s = b.state;
                    var v = Math.sqrt(s[3] * s[3] + s[4] * s[4] + s[5] * s[5]);
                    state.history.push(v * KM_PER_AU / 86400);
                    if (state.history.length > 120) state.history.shift();
                }
            }
            if (frameCount % 6 === 0) { refreshReadouts(); state.dirtyGraph = true; }
            if (state.dirtyGraph) { drawGraph(); state.dirtyGraph = false; }
            if (now - lastLiveUpdate > 4000) {
                lastLiveUpdate = now;
                live.textContent = describeState();
            }
        }

        function govern() {
            var budget = 1000 / 60;
            var over = state.frameMs > budget * 1.25;
            var under = state.frameMs < budget * 1.06;
            var changed = false;

            if (over) state.calm = 0;
            else if (under) state.calm = (state.calm || 0) + 1;
            else state.calm = 0;

            if (state.manualReduced) {
                if (state.autoScale !== 0.62) { state.autoScale = 0.62; changed = true; }
                if (state.starCount !== 900) { applyStarCount(900); changed = true; }
            } else if (over) {
                if (state.autoScale > 0.5) { state.autoScale = Math.max(0.5, state.autoScale * 0.9); changed = true; }
                else if (state.starCount > 700) { applyStarCount(700); changed = true; }
            } else if (under && state.calm >= 6) {
                state.calm = 0;
                if (state.starCount < 3000) { applyStarCount(Math.min(3000, state.starCount + 400)); }
                else if (state.autoScale < 1) { state.autoScale = Math.min(1, state.autoScale * 1.05); changed = true; }
            }
            if (changed) applySize();

            var m = measure();
            qualityNote.textContent = 'Render ' + Math.round(state.autoScale * m.w) + 'x' +
                Math.round(state.autoScale * m.h) + ' upscaled to ' + m.w + 'x' + m.h +
                ' | ' + fmt(state.dtDays, 3) + ' day RK4 step, ' +
                Math.round(MIN_PERIOD_DAYS / state.dtDays) + ' steps per Mercury orbit' +
                (state.physicsLimited ? ' | clock limited by physics' : '') +
                ' | ' + state.frameMs.toFixed(1) + ' ms/frame' +
                (state.autoScale < 0.999 && !state.manualReduced ? ' | auto-reduced to hold 60 fps' : '') +
                (state.manualReduced ? ' | reduced effects on' : '');
        }

        function applyStarCount(n) {
            state.starCount = n;
            var pos = starPoints.geometry.attributes.position;
            var used = Math.min(n, pos.count);
            starPoints.geometry.setDrawRange(0, used);
        }

        // ---- boot ----
        function startRenderer() {
            var m = measure();
            try {
                renderer = new three.WebGLRenderer({
                    canvas: canvas, antialias: true, alpha: false,
                    powerPreference: 'high-performance', logarithmicDepthBuffer: true
                });
            } catch (e) {
                console.warn('[solar-system] WebGL renderer creation failed:', e);
                fallbackTo2D('This browser could not start a WebGL2 renderer, so the flat orbit plot is shown instead.');
                return;
            }
            renderer.toneMapping = three.ACESFilmicToneMapping;
            renderer.toneMappingExposure = sim.params.exposure;
            renderer.outputColorSpace = three.SRGBColorSpace;
            renderer.setClearColor(0x02040a, 1);

            camera = new three.PerspectiveCamera(45, 1, 0.0002, 700);
            camera.up.set(0, 0, 1);

            buildScene();
            reseed(state.jd);
            refreshLimits();
            cam.distance = frameDistance(state.focus);

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

            pickInitialScale();
            applySize();
            refreshReadouts();

            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(function () { state.dirtyGraph = true; }).catch(function () {});
            }

            lastFrameTime = performance.now();
            rafId = requestAnimationFrame(frame);

            requestAnimationFrame(function () {
                if (state.disposed) return;
                var programs = (renderer && renderer.info && renderer.info.programs) || [];
                var broken = programs.some(function (p) {
                    return p && p.diagnostics && p.diagnostics.runnable === false;
                });
                if (broken) {
                    console.warn('[solar-system] shader program failed to compile, falling back to the flat plot');
                    fallbackTo2D('The shaded view failed to build on this device, so the flat orbit plot is shown instead.');
                }
            });
        }

        sim.onParamChange = function (key) {
            if (key === 'dayOffset') {
                reseed(epochJD() + sim.params.dayOffset);
                refreshReadouts();
                state.dirtyGraph = true;
            }
            if (key === 'logDaysPerSec') { refreshReadouts(); refreshLimits(); }
            if (key === 'scaleMode') {
                // Changing scale changes how big the followed body is drawn, so
                // the framing has to follow or the view becomes empty (true
                // scale) or fills the screen (readable).
                cam.distance = frameDistance(state.focus);
                refreshReadouts();
            }
            if (key === 'exposure') { refreshReadouts(); }
        };
        sim.onReset = function () { reseed(epochJD() + sim.params.dayOffset); };
        sim.onPause = function () { /* keep rendering so the view stays live */ };
        sim.onDestroy = function () { /* handled by controller.destroy */ };

        followSelect.addEventListener('change', function () { setFocus(followSelect.value); });
        reduceBtn.addEventListener('click', function () {
            state.manualReduced = !state.manualReduced;
            reduceBtn.setAttribute('aria-pressed', state.manualReduced ? 'true' : 'false');
            if (!state.manualReduced) state.autoScale = 1;
            govern();
        });

        var url = new URL('assets/vendor/three/build/three.module.js', document.baseURI).href;
        import(url).then(function (mod) {
            three = mod;
            startRenderer();
        }).catch(function (err) {
            console.warn('[solar-system] three.js failed to load:', err);
            fallbackTo2D('The 3D library could not be loaded, so the flat orbit plot is shown instead.');
        });

        return controller;
    }

    window.initSketch = function (config) {
        config = config || {};
        if (!hasWebGL2()) {
            return mount2D(config, 'This browser or device has no WebGL2, so the flat orbit plot is shown instead of the shaded one.');
        }
        try {
            return mount3D(config);
        } catch (e) {
            console.warn('[solar-system] 3D view failed to start:', e);
            return mount2D(config, 'The shaded view could not start here, so the flat orbit plot is shown instead.');
        }
    };
})();
