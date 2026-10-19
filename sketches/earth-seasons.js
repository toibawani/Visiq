// ===== 3D EARTH AND SEASONS =====
// One globe, lit by the Sun's real direction, leaning by the real axial tilt,
// with the day/night line computed from the Earth's position in the JPL element
// table. The point of the sim is the one that is usually taught wrong: the
// seasons are not caused by the Earth's distance from the Sun. The distance
// changes by 3.3 percent over the year and is at its smallest in early January,
// which is northern winter; the 23.44 degree lean is what does it.
//
// Geometry from assets/seasons.js (declination, hour angle, day length), motion
// from assets/orbital-elements.js (the Earth's position), rendering with the
// vendored three.js and the Solar System Scope maps (CC BY 4.0).
//
// Same contract as every other sketch: window.initSketch(config) returns a
// controller with destroy(), reset(), describe() and read-only probes.

(function () {
    'use strict';

    var OE = window.VisiqOrbitalElements;
    var Seasons = window.VisiqSeasons;
    var KM_PER_AU = 1.495978707e8;
    var RAD = Math.PI / 180;

    function hasWebGL2() {
        try {
            var c = document.createElement('canvas');
            return !!c.getContext('webgl2');
        } catch (e) {
            return false;
        }
    }

    function todayJulianDay() {
        var now = new Date();
        return OE.julianDay(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate())
            + now.getUTCHours() / 24;
    }

    function fmt(x, digits) {
        var d = digits === undefined ? 2 : digits;
        if (!isFinite(x)) return '-';
        var ax = Math.abs(x);
        if (ax !== 0 && (ax < 1e-3 || ax >= 1e6)) return x.toExponential(3);
        return x.toFixed(d);
    }

    function fmtDate(jd) {
        var c = OE.calendarFromJD(jd);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return c.day + ' ' + months[c.month - 1] + ' ' + c.year;
    }

    function fmtHours(h) {
        if (!isFinite(h) || h <= 0) return '0 h (polar night)';
        if (h >= 24) return '24 h (polar day)';
        var hours = Math.floor(h);
        var minutes = Math.round((h - hours) * 60);
        if (minutes === 60) { hours += 1; minutes = 0; }
        return hours + ' h ' + (minutes < 10 ? '0' : '') + minutes + ' m';
    }

    function latitudeName(lat) {
        var v = Math.abs(lat);
        if (v < 0.5) return 'equator';
        return v.toFixed(0) + ' degrees ' + (lat > 0 ? 'north' : 'south');
    }

    // ---- fallback: a flat daylight chart, drawn with canvas 2D ----
    function mount2D(config, note) {
        var sim = new SimBase({
            id: 'earth-seasons',
            containerId: config.containerId,
            controlsContainerId: config.controlsContainerId,
            params: {
                dayOffset: { value: 0, min: -365, max: 365, step: 1, label: 'Date offset from today', unit: 'd' },
                latitude: { value: 51.5, min: -90, max: 90, step: 0.5, label: 'Latitude', unit: 'deg' }
            },
            getReadouts(ctx) {
                return ctx._telemetry || { 'Date': '-', 'Sub-solar latitude': '-', 'Daylight': '-' };
            }
        });
        sim.renderControls();

        var container = document.getElementById(config.containerId || 'simulation-canvas');
        if (!container) return null;
        if (!container.style.position) container.style.position = 'relative';

        var canvas = document.createElement('canvas');
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'Flat chart of daylight hours against the date for the chosen latitude.');
        canvas.style.cssText = 'display:block;width:100%;height:100%;';
        container.appendChild(canvas);

        var live = document.createElement('p');
        live.className = 'sr-only';
        live.setAttribute('aria-live', 'polite');
        container.appendChild(live);

        var noteEl = null;
        if (note) {
            noteEl = document.createElement('p');
            noteEl.style.cssText = 'margin:8px 0 0;font-size:0.84rem;line-height:1.55;opacity:0.75;';
            noteEl.textContent = note;
            container.appendChild(noteEl);
        }

        var rafId = null;
        var last = 0;
        var jd = todayJulianDay();

        function draw(now) {
            rafId = requestAnimationFrame(draw);
            var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
            last = now;
            if (sim.isPlaying) jd += dt * Math.pow(10, sim.params.logDaysPerSec === undefined ? 0.5 : sim.params.logDaysPerSec) * 2;

            var w = Math.max(320, container.clientWidth || 640);
            var h = Math.max(240, container.clientHeight || 420);
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.height = h + 'px';
            var c = canvas.getContext('2d');
            c.setTransform(dpr, 0, 0, dpr, 0, 0);
            c.clearRect(0, 0, w, h);

            var padL = 46, padR = 16, padT = 26, padB = 30;
            var plotW = w - padL - padR, plotH = h - padT - padB;
            var lat = sim.params.latitude;

            // 0 to 24 hours of daylight across a year of dates.
            c.strokeStyle = 'rgba(148,163,184,0.35)';
            c.beginPath();
            for (var v = 0; v <= 24; v += 6) {
                var y = padT + plotH * (1 - v / 24);
                c.moveTo(padL, y);
                c.lineTo(padL + plotW, y);
                c.stroke();
                c.fillStyle = 'rgba(226,232,240,0.7)';
                c.font = '10px "JetBrains Mono", monospace';
                c.fillText(v + 'h', 8, y + 3);
            }

            c.strokeStyle = 'rgba(45,212,191,0.95)';
            c.lineWidth = 1.8;
            c.beginPath();
            var base = jd - 182;
            for (var k = 0; k <= 365; k++) {
                var p = OE.positionAt('embary', base + k);
                var dec = Seasons.solarDeclination(p);
                var day = Seasons.daylightHours(lat, dec);
                var x = padL + plotW * (k / 365);
                var y2 = padT + plotH * (1 - day / 24);
                if (k === 0) c.moveTo(x, y2); else c.lineTo(x, y2);
            }
            c.stroke();

            var todayX = padL + plotW * ((jd - base) / 365);
            c.strokeStyle = 'rgba(248,113,113,0.9)';
            c.beginPath();
            c.moveTo(todayX, padT);
            c.lineTo(todayX, padT + plotH);
            c.stroke();
            c.fillStyle = 'rgba(226,232,240,0.9)';
            c.font = '11px "JetBrains Mono", monospace';
            c.fillText('Daylight hours at ' + latitudeName(lat) + ' | today ' + fmtDate(jd), padL, 16);

            if (now - (live._t || 0) > 4000) {
                live._t = now;
                var dec2 = Seasons.solarDeclination(OE.positionAt('embary', jd));
                live.textContent = 'Flat daylight chart. On ' + fmtDate(jd) + ' the sub-solar latitude is '
                    + fmt(dec2, 1) + ' degrees and ' + latitudeName(lat) + ' gets '
                    + fmtHours(Seasons.daylightHours(lat, dec2)) + ' of daylight.';
            }
        }

        sim.onParamChange = function (key) {
            if (key === 'dayOffset') jd = todayJulianDay() + sim.params.dayOffset;
        };
        rafId = requestAnimationFrame(draw);

        return {
            mode: '2d',
            sim: sim,
            destroy: function () {
                if (rafId !== null) cancelAnimationFrame(rafId);
                rafId = null;
                if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
                if (live.parentNode) live.parentNode.removeChild(live);
                if (noteEl && noteEl.parentNode) noteEl.parentNode.removeChild(noteEl);
                sim.destroy();
            },
            reset: function () { jd = todayJulianDay(); sim.reset(); },
            describe: function () { return 'Flat daylight chart for ' + fmtDate(jd) + '.'; }
        };
    }

    function mount3D(config) {
        var container = document.getElementById(config.containerId || 'simulation-canvas');
        var controls = document.getElementById(config.controlsContainerId || 'controls-section');
        if (!container) {
            console.error('[earth-seasons] no canvas container');
            return null;
        }
        if (!OE || !Seasons) {
            console.error('[earth-seasons] assets/orbital-elements.js or assets/seasons.js is not loaded');
            return null;
        }

        var reducedMotion = false;
        try {
            reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) { /* keep animating */ }

        var sim = new SimBase({
            id: 'earth-seasons',
            containerId: config.containerId,
            controlsContainerId: config.controlsContainerId,
            params: {
                dayOffset: {
                    value: 0, min: -365, max: 365, step: 1,
                    label: 'Date offset from today', unit: 'd'
                },
                latitude: {
                    value: 51.5, min: -90, max: 90, step: 0.5,
                    label: 'Latitude (click the globe to move it)', unit: 'deg'
                },
                logDaysPerSec: {
                    value: 0.7, min: -0.4, max: 1.8, step: 0.05,
                    label: 'Time rate, log10(days per second)', unit: 'dex'
                },
                spin: {
                    value: 1, min: 0, max: 1, step: 1,
                    label: 'Show the daily spin', unit: ''
                },
                exposure: {
                    value: 1.0, min: 0.2, max: 3.0, step: 0.05,
                    label: 'Exposure', unit: ''
                }
            },
            // SimBase builds the readout DOM from this first call, so every key
            // the sim writes has to be listed here.
            getReadouts(ctx) {
                return ctx._telemetry || {
                    'Date': '-', 'Sub-solar latitude': '-', 'Daylight at this latitude': '-',
                    'Solar noon altitude': '-', 'Earth-Sun distance': '-',
                    'Distance rank in the year': '-', 'Sunlight relative to the annual mean': '-',
                    'Daylight at the equator': '-'
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
                ctx.perf.quality = 'default';
            }
        });

        if (reducedMotion) sim.isPlaying = false;
        sim.renderControls();

        // ---- DOM ----
        var canvas = document.createElement('canvas');
        canvas.className = 'es-canvas';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label',
            'Three-dimensional Earth lit by the Sun from the correct direction, leaning by 23.44 degrees, with the day and night line moving as the date changes and the chosen latitude marked.');
        canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
        container.appendChild(canvas);

        var overlay = document.createElement('canvas');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.cssText = 'position:absolute;left:12px;bottom:12px;width:236px;height:118px;pointer-events:none;';
        if (!container.style.position) container.style.position = 'relative';
        container.appendChild(overlay);

        var qualityNote = document.createElement('div');
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
        appendNote('What to notice: drag the date slider across the year and watch the day and night line. In June the north pole leans into the sunlight and the Arctic is lit all day; in December it leans away and the Arctic is dark all day. Now watch the distance readout while you do it: the Earth is closest to the Sun in early January, in northern winter, and the distance changes by only 3 percent across the whole year. The lean is what makes the seasons.', {});
        appendNote('Predict: set the latitude to 51 degrees north and compare daylight hours on 21 June with 21 December. Is the ratio closer to 2 to 1, or 4 to 1?', {});
        var limitsNote = appendNote('', { faint: true });
        appendNote('Planet map: Solar System Scope, CC BY 4.0, via Wikimedia Commons.', { faint: true });

        // ---- state ----
        var state = {
            jd: todayJulianDay() + sim.params.dayOffset,
            autoScale: 1,
            manualReduced: false,
            frameMs: 16.7,
            dirtyGraph: true,
            disposed: false,
            spinAngle: 0,
            starCount: 1200,
            sunDistance: 1
        };

        var three = null, renderer = null, scene = null, camera = null;
        var earth = null, earthPivot = null, clouds = null, sunLight = null, sunSprite = null;
        var axisLine = null, latRing = null, subSolarDot = null, starPoints = null;
        var textures = [];

        var cam = { azimuth: 0.9, polar: 1.15, distance: 3.4, velAz: 0, velPol: 0 };
        var CAM_DEFAULT = { azimuth: 0.9, polar: 1.15, distance: 3.4 };

        // The opening view has to be built from where the Sun is, not from a fixed
        // angle. The first version used a fixed azimuth and polar, and on
        // 14 October that put the camera on the night side: the capture showed a
        // mostly black globe with a faint lit sliver (brightest cell 51 of 255).
        // This puts the camera 42 degrees around from the Sun direction and 18
        // degrees above the ecliptic plane, so the lit hemisphere and the
        // day/night line are both in frame.
        var SUN_AZIMUTH_OFFSET = 42 * RAD;
        var SUN_ELEVATION = 18 * RAD;

        function frameFromSun() {
            var pos = earthPosition(state.jd);
            var r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) || 1;
            var sx = -pos.x / r, sy = -pos.y / r, sz = -pos.z / r;
            var ca = Math.cos(SUN_AZIMUTH_OFFSET), sa = Math.sin(SUN_AZIMUTH_OFFSET);
            var rx = sx * ca - sy * sa;
            var ry = sx * sa + sy * ca;
            var rz = sz;
            var ce = Math.cos(SUN_ELEVATION), se = Math.sin(SUN_ELEVATION);
            var cx = rx * ce, cy = ry * ce, cz = rz * ce + se;
            var len = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1;
            cx /= len; cy /= len; cz /= len;
            CAM_DEFAULT = {
                azimuth: Math.atan2(cy, cx),
                polar: Math.acos(Math.max(-1, Math.min(1, cz))),
                distance: 3.4
            };
            cam.azimuth = CAM_DEFAULT.azimuth;
            cam.polar = CAM_DEFAULT.polar;
            cam.distance = CAM_DEFAULT.distance;
            cam.velAz = 0;
            cam.velPol = 0;
        }

        // Scratch objects reused every frame. Building a Vector3 and a Matrix4
        // per frame was showing up as long frames in the frame-rate run (worst
        // frame 83 ms, median still 16.7), which is garbage collection rather
        // than shading cost.
        var scratchSunWorld = null;
        var scratchSubSolar = null;
        var pivotInverse = null;
        var Y_AXIS = null;

        function clampPolar(p) {
            var lim = Math.PI * 0.5 - 0.02;
            return Math.max(0.02, Math.min(lim, p));
        }
        function clampDistance(d) {
            return Math.max(1.15, Math.min(14, d));
        }

        var controller = {
            mode: '3d',
            sim: sim,
            inner: null,
            destroy: function () {
                if (controller.inner) {
                    try { controller.inner.destroy(); } catch (e) { /* gone */ }
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
                    stars: state.starCount,
                    dayOffset: sim.params.dayOffset
                };
            },
            camera: function () {
                return { azimuth: cam.azimuth, polar: cam.polar, distance: cam.distance };
            },
            // Read-only probe for the verification script: the geometry the sim
            // is actually using, and where the Sun and the sub-solar point are,
            // so the picture can be checked against the numbers.
            geometryProbe: function () {
                var pos = earthPosition(state.jd);
                var dec = Seasons.solarDeclination(pos);
                var lat = sim.params.latitude;
                return {
                    jd: state.jd,
                    date: fmtDate(state.jd),
                    earthPosition: { x: +pos.x.toFixed(9), y: +pos.y.toFixed(9), z: +pos.z.toFixed(9) },
                    distanceAu: +Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z).toFixed(9),
                    declinationDeg: +dec.toFixed(4),
                    latitudeDeg: lat,
                    daylightHours: +Seasons.daylightHours(lat, dec).toFixed(4),
                    tiltDeg: Seasons.AXIAL_TILT_DEG,
                    axisWorld: (function () {
                        var a = Seasons.axisVector();
                        return { x: a.x, y: +a.y.toFixed(6), z: +a.z.toFixed(6) };
                    })(),
                    // The pivot rotation is (90 - tilt) about x, so the tilt from
                    // the ecliptic pole is 90 degrees minus it. Reported this way so
                    // the probe can be compared with the module's 23.44 directly.
                    measuredAxisDeg: three && earthPivot
                        ? +(90 - earthPivot.rotation.x * 180 / Math.PI).toFixed(4)
                        : null,
                    sunLightDirection: sunLight
                        ? { x: +sunLight.position.x.toFixed(6), y: +sunLight.position.y.toFixed(6), z: +sunLight.position.z.toFixed(6) }
                        : null,
                    // Where the sub-solar marker actually landed, in the globe's
                    // frame. Its latitude has to equal declinationDeg, otherwise
                    // the marker and the readout disagree about the physics.
                    subSolarMarkerLatDeg: subSolarDot
                        ? +(Math.asin(Math.max(-1, Math.min(1,
                            subSolarDot.position.clone().normalize().y))) * 180 / Math.PI).toFixed(4)
                        : null,
                    cameraDistance: +cam.distance.toFixed(4)
                };
            }
        };

        function earthPosition(jd) {
            return OE.positionAt('embary', jd);
        }

        function describeState() {
            var pos = earthPosition(state.jd);
            var r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
            var dec = Seasons.solarDeclination(pos);
            var lat = sim.params.latitude;
            return 'Earth on ' + fmtDate(state.jd) + '. The sub-solar latitude is '
                + fmt(dec, 1) + ' degrees, so the Sun is overhead at ' + latitudeName(dec) + '. '
                + latitudeName(lat) + ' gets ' + fmtHours(Seasons.daylightHours(lat, dec))
                + ' of daylight. The Earth is ' + fmt(r, 4) + ' AU from the Sun, '
                + fmt(100 * (r / 1.00000261 - 1), 2) + ' percent from its mean distance. '
                + (sim.isPlaying ? '' : 'Paused.');
        }

        // ---- three.js ----
        function makeGlowTexture() {
            var c = document.createElement('canvas');
            c.width = c.height = 64;
            var g = c.getContext('2d');
            var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(0.3, 'rgba(255,240,200,0.5)');
            grad.addColorStop(1, 'rgba(255,240,200,0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, 64, 64);
            return c;
        }

        function loadTexture(file) {
            var url;
            try {
                url = new URL('assets/textures/planets/' + file + '.webp', document.baseURI).href;
            } catch (e) {
                url = 'assets/textures/planets/' + file + '.webp';
            }
            var tex = new three.TextureLoader().load(url, function () { state.dirtyGraph = true; }, undefined,
                function () { console.warn('[earth-seasons] texture failed to load: ' + url); });
            tex.colorSpace = three.SRGBColorSpace;
            tex.anisotropy = 4;
            textures.push(tex);
            return tex;
        }

        function buildScene() {
            scene = new three.Scene();

            var starGeo = new three.BufferGeometry();
            var starPos = new Float32Array(state.starCount * 3);
            for (var i = 0; i < state.starCount; i++) {
                var u = Math.random() * 2 - 1;
                var th = Math.random() * Math.PI * 2;
                var s = Math.sqrt(1 - u * u);
                starPos[i * 3] = Math.cos(th) * s * 90;
                starPos[i * 3 + 1] = Math.sin(th) * s * 90;
                starPos[i * 3 + 2] = u * 90;
            }
            starGeo.setAttribute('position', new three.BufferAttribute(starPos, 3));
            starPoints = new three.Points(starGeo, new three.PointsMaterial({
                size: 1.8, sizeAttenuation: false, color: 0xffffff,
                map: new three.CanvasTexture(makeGlowTexture()), transparent: true, depthWrite: false
            }));
            scene.add(starPoints);

            // The Earth's position is the origin of this view (the camera orbits
            // the Earth), so the Sun is a light coming from the real direction
            // plus a bright sprite at 40 scene units that way.
            // Intensity picked by measurement, not by taste: at 3.2 the sunlit
            // hemisphere of the capture topped out at 166 of 255 with a p90 of 66,
            // which reads as a grey disc rather than a lit planet. 4.6 puts the
            // sunlit side in the 200s and leaves the night side black.
            sunLight = new three.DirectionalLight(0xffffff, 4.6);
            scene.add(sunLight);
            scene.add(sunLight.target);

            // The globe. The night-side emissive patch is the same trick the
            // solar system uses: the city-light map is multiplied by the night
            // factor computed per fragment from the light direction, so it never
            // paints the day side.
            var surfaceMat = new three.MeshStandardMaterial({
                map: loadTexture('earth-day'), roughness: 0.85, metalness: 0,
                emissiveMap: loadTexture('earth-night'), emissive: new three.Color(0xffc46b),
                emissiveIntensity: 1.1
            });
            surfaceMat.onBeforeCompile = function (shader) {
                shader.uniforms.uSunDir = { value: new three.Vector3(0, 0, 1) };
                shader.fragmentShader = 'uniform vec3 uSunDir;\n\n' + shader.fragmentShader.replace(
                    '#include <emissivemap_fragment>',
                    '#include <emissivemap_fragment>\n' +
                    '  {\n' +
                    '    float day = dot(normalize(vNormal), normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz));\n' +
                    '    totalEmissiveRadiance *= 1.0 - smoothstep(-0.05, 0.15, day);\n' +
                    '  }'
                );
                surfaceMat.userData.shader = shader;
                state.dirtyGraph = true;
            };

            // 64x32 rather than 96x48: measured at 1440x900, the denser sphere
            // plus the cloud sphere cost enough to push the frame rate to 56 fps
            // unthrottled and 48 fps at 4x CPU throttle, with the governor
            // already at its scale floor. The limb is smooth at 64 segments.
            var earthGeo = new three.SphereGeometry(1, 64, 32);
            earth = new three.Mesh(earthGeo, surfaceMat);
            earth.name = 'earth-surface';

            var cloudMat = new three.MeshStandardMaterial({
                color: 0xcfd8e0, alphaMap: loadTexture('earth-clouds'), transparent: true,
                opacity: 0.9, depthWrite: false, roughness: 1, metalness: 0
            });
            clouds = new three.Mesh(new three.SphereGeometry(1.004, 48, 24), cloudMat);
            clouds.name = 'earth-clouds';

            earthPivot = new three.Object3D();
            // The globe mesh uses +y as its north pole and the scene uses +z as the
            // ecliptic pole, so the pivot rotation that puts the pole at the real
            // axis direction (0, sin eps, cos eps) is a rotation about x by
            // (90 - eps), not by -eps. The first version used -eps, which leaned
            // the pole 66 degrees the wrong way: the readouts stayed right because
            // they come from the seasons module, but the lit hemisphere would have
            // been the wrong one in June. scripts/verify-3d.mjs seasoncheck caught
            // it by comparing the sub-solar marker's latitude with the declination.
            earthPivot.rotation.x = (90 - Seasons.AXIAL_TILT_DEG) * RAD;
            earthPivot.add(earth);
            earthPivot.add(clouds);
            scene.add(earthPivot);

            // The axis, drawn well past both poles so the lean is visible. It is a
            // child of the pivot, so it points along the pivot's own +y, which is
            // the tilt direction.
            var axisGeo = new three.BufferGeometry().setFromPoints([
                new three.Vector3(0, 0, -1.7), new three.Vector3(0, 0, 1.7)
            ]);
            axisLine = new three.Line(axisGeo, new three.LineBasicMaterial({
                color: 0xfacc15, transparent: true, opacity: 0.75
            }));
            earthPivot.add(axisLine);

            // The marked latitude: a thin ring around the globe.
            latRing = new three.Mesh(
                new three.TorusGeometry(1.002, 0.004, 6, 96),
                new three.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 })
            );
            earth.add(latRing);

            // The point where the Sun is overhead.
            subSolarDot = new three.Mesh(
                new three.SphereGeometry(0.02, 12, 8),
                new three.MeshBasicMaterial({ color: 0xfff3c4 })
            );
            earth.add(subSolarDot);

            // The pivot's rotation is constant, so its inverse is a constant
            // rotation by -(90 - eps) about x and costs nothing to reuse. With
            // this, the marker's latitude works out to asin(sin eps sin lambda),
            // which is the declination the module computes and the tests assert.
            scratchSunWorld = new three.Vector3();
            scratchSubSolar = new three.Vector3();
            Y_AXIS = new three.Vector3(0, 1, 0);
            pivotInverse = new three.Matrix4().makeRotationX(-(90 - Seasons.AXIAL_TILT_DEG) * RAD);

            sunSprite = new three.Sprite(new three.SpriteMaterial({
                map: new three.CanvasTexture(makeGlowTexture()), color: 0xffe9bb,
                transparent: true, blending: three.AdditiveBlending, depthWrite: false
            }));
            scene.add(sunSprite);
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

        // ---- readouts and graph ----
        function refreshReadouts() {
            var pos = earthPosition(state.jd);
            var r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
            var dec = Seasons.solarDeclination(pos);
            var lat = sim.params.latitude;
            var day = Seasons.daylightHours(lat, dec);
            // Solar noon altitude: 90 degrees minus the difference between the
            // latitude and the declination.
            var noonAlt = 90 - Math.abs(lat - dec);
            var mean = 1.00000261;
            var rows = {
                'Date': fmtDate(state.jd),
                'Sub-solar latitude': fmt(dec, 2) + ' deg (' + (dec >= 0 ? 'north' : 'south') + ')',
                'Daylight at this latitude': fmtHours(day),
                'Solar noon altitude': fmt(noonAlt, 1) + ' deg above the horizon',
                'Earth-Sun distance': fmt(r, 5) + ' AU',
                'Distance rank in the year': r < mean ? 'nearer than average' : 'further than average',
                'Sunlight relative to the annual mean': fmt(Math.pow(mean / r, 2), 3) + ' x',
                'Daylight at the equator': fmtHours(Seasons.daylightHours(0, dec)),
                'Daylight change per day here': fmt(
                    Math.abs(Seasons.daylightHours(lat, dec + 0.25) - Seasons.daylightHours(lat, dec - 0.25)) * 2, 1) + ' min',
                'Axial tilt': fmt(Seasons.AXIAL_TILT_DEG, 2) + ' deg, fixed in space',
                'Orbital distance change this year': fmt(100 * (1.016714 / 0.983292 - 1), 1) + ' percent across the year'
            };
            sim._telemetry = rows;
            sim.updateTelemetry();
        }

        function refreshLimits() {
            limitsNote.textContent =
                'What this model leaves out: daylight hours use the geometric definition, so there is no '
                + 'atmospheric refraction and the Sun is treated as a point. That makes each day about 6 to 15 '
                + 'minutes shorter than a sunrise-to-sunset table gives, depending on latitude; at 51.5 degrees '
                + 'north the model says 16 h 24 m at the June solstice against about 16 h 38 m published. '
                + 'The Earth is a smooth sphere: no terrain, no mountains, no time zones, and the globe turns at '
                + 'the sidereal rate with an arbitrary starting phase, so the longitude under the Sun is not the '
                + 'real one for a given clock time even though the latitude of the sub-solar point is. '
                + 'The Sun is a parallel light source, so its angular size, the twilight band and eclipses are '
                + 'absent. The orbit is the two-body approximation from the JPL table: the distance, the '
                + 'declination and the date of perihelion are from that table, and the table is only valid from '
                + '1800 to 2050.';
        }

        function drawGraph() {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            var w = 236, h = 118;
            var c = overlay.getContext('2d');
            overlay.width = Math.floor(w * dpr);
            overlay.height = Math.floor(h * dpr);
            c.setTransform(dpr, 0, 0, dpr, 0, 0);
            c.clearRect(0, 0, w, h);
            c.fillStyle = 'rgba(2,6,23,0.55)';
            c.beginPath();
            c.moveTo(8, 0);
            c.lineTo(w - 8, 0);
            c.quadraticCurveTo(w, 0, w, 8);
            c.lineTo(w, h - 8);
            c.quadraticCurveTo(w, h, w - 8, h);
            c.lineTo(8, h);
            c.quadraticCurveTo(0, h, 0, h - 8);
            c.lineTo(0, 8);
            c.quadraticCurveTo(0, 0, 8, 0);
            c.closePath();
            c.fill();

            var padL = 10, padR = 10, padT = 20, padB = 18;
            var plotW = w - padL - padR, plotH = h - padT - padB;
            var lat = sim.params.latitude;

            c.fillStyle = 'rgba(226,232,240,0.86)';
            c.font = '9px "JetBrains Mono", monospace';
            c.fillText('Daylight at ' + latitudeName(lat), padL, 12);

            // A year of daylight for this latitude, with today marked.
            var base = state.jd - 182;
            c.strokeStyle = 'rgba(45,212,191,0.95)';
            c.lineWidth = 1.5;
            c.beginPath();
            for (var k = 0; k <= 90; k++) {
                var jd = base + k * 4;
                var dec = Seasons.solarDeclination(earthPosition(jd));
                var day = Seasons.daylightHours(lat, dec);
                var x = padL + plotW * (k / 180);
                var y = padT + plotH * (1 - day / 24);
                if (k === 0) c.moveTo(x, y); else c.lineTo(x, y);
            }
            c.stroke();

            var todayX = padL + plotW * 0.5;
            c.strokeStyle = 'rgba(248,113,113,0.9)';
            c.beginPath();
            c.moveTo(todayX, padT - 2);
            c.lineTo(todayX, padT + plotH);
            c.stroke();

            c.fillStyle = 'rgba(226,232,240,0.7)';
            c.fillText('0 h', padL, h - 5);
            c.fillText('24 h', w - padR - 22, h - 5);
        }

        // ---- interaction ----
        var pointers = new Map();
        var dragging = false, lastX = 0, lastY = 0, dragMoved = 0;
        var pinchStart = 0, pinchDist = 0;

        function onPointerDown(e) {
            if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
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
            if (e.type === 'pointerup' && dragMoved < 6) pickLatitude(e);
        }

        function onWheel(e) {
            e.preventDefault();
            cam.distance = clampDistance(cam.distance * (1 + Math.sign(e.deltaY) * 0.1));
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
                case '+': case '=': cam.distance = clampDistance(cam.distance * 0.92); break;
                case '-': case '_': cam.distance = clampDistance(cam.distance * 1.08); break;
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

        // Click a point on the globe: its latitude becomes the marked latitude.
        function pickLatitude(e) {
            if (!renderer || !earth) return;
            var rect = canvas.getBoundingClientRect();
            var ndc = new three.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            var ray = new three.Raycaster();
            ray.setFromCamera(ndc, camera);
            var hits = ray.intersectObject(earth, false);
            if (!hits.length) return;
            var local = earth.worldToLocal(hits[0].point.clone());
            // The geometry's y axis is the spin axis, so the latitude is the
            // angle above the equatorial plane.
            var lat = Math.asin(Math.max(-1, Math.min(1, local.y / local.length()))) * 180 / Math.PI;
            var snapped = Math.round(lat * 2) / 2;
            sim.params.latitude = snapped;
            var input = document.getElementById('sim-param-earth-seasons-latitude');
            var badge = document.getElementById('sim-param-earth-seasons-latitude-val');
            if (input) { input.value = String(snapped); input.setAttribute('aria-valuenow', String(snapped)); }
            if (badge) badge.textContent = snapped + ' deg';
            sim.syncUrlParams();
            state.dirtyGraph = true;
            refreshReadouts();
        }

        function onWindowResize() {
            if (state.disposed) return;
            applySize();
        }

        function onContextLost(e) {
            e.preventDefault();
            console.warn('[earth-seasons] WebGL context lost');
            fallbackTo2D('The graphics context was lost, so the flat daylight chart is shown instead of a blank canvas.');
        }

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
                        if (obj.material.alphaMap && textures.indexOf(obj.material.alphaMap) === -1) obj.material.alphaMap.dispose();
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
            earth = null;
            earthPivot = null;
            clouds = null;
            sunLight = null;
            sunSprite = null;
            axisLine = null;
            latRing = null;
            subSolarDot = null;
            starPoints = null;
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (qualityNote.parentNode) qualityNote.parentNode.removeChild(qualityNote);
            if (reduceBtn.parentNode) reduceBtn.parentNode.removeChild(reduceBtn);
        }

        function fallbackTo2D(reason) {
            if (controller.mode === '2d') return;
            teardown3D();
            try { sim.destroy(); } catch (e) { /* nothing mounted */ }
            controller.inner = mount2D(config, reason);
            controller.mode = '2d';
        }

        // ---- per frame ----
        var rafId = null, lastFrameTime = 0, frameCount = 0, lastLiveUpdate = 0, lastGraphFrame = 0;

        function updateScene(dtDays) {
            var pos = earthPosition(state.jd);
            var r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
            state.sunDistance = r;

            // Sun direction in the ecliptic frame, normalised, as the light's
            // position (the Earth sits at the origin of this scene).
            var sx = -pos.x / r, sy = -pos.y / r, sz = -pos.z / r;
            sunLight.position.set(sx, sy, sz);
            sunLight.target.position.set(0, 0, 0);
            sunLight.target.updateMatrixWorld();
            sunSprite.position.set(sx * 40, sy * 40, sz * 40);
            // The sprite is an additive quad, so its area is fill cost: 5 scene
            // units at 40 away is about 7 degrees across, which reads as a bright
            // Sun without covering a quarter of the screen.
            sunSprite.scale.setScalar(5);

            if (earth && earth.material.userData.shader) {
                scratchSunWorld.set(sx, sy, sz).normalize();
                earth.material.userData.shader.uniforms.uSunDir.value.copy(scratchSunWorld);
            }

            // The daily spin: sidereal rotation, 0.99727 days per turn. The
            // starting phase is arbitrary, which the limits line states.
            if (sim.params.spin > 0.5) {
                state.spinAngle = (2 * Math.PI / 0.99726968) * (state.jd - OE.J2000_JD);
            }
            earth.rotation.y = state.spinAngle;
            clouds.rotation.y = state.spinAngle * 1.02;

            // The marked latitude ring and the sub-solar point, both in the
            // globe's own frame so they follow the tilt and the spin.
            var lat = sim.params.latitude * RAD;
            latRing.position.set(0, Math.sin(lat) * 0.999, 0);
            latRing.scale.setScalar(Math.cos(lat));
            latRing.rotation.x = Math.PI / 2;

            // Sub-solar point: the Sun's direction carried into the globe's own
            // frame, so it lands on the right latitude and rides the spin. The
            // pivot's tilt never changes, so its inverse rotation is a constant
            // and is precomputed once; only the spin is applied per frame. The
            // marker's latitude is the declination by construction, and
            // geometryProbe() reports both so a script can check that they agree.
            scratchSunWorld.set(sx, sy, sz).normalize();
            scratchSubSolar.copy(scratchSunWorld)
                .applyMatrix4(pivotInverse)
                .applyAxisAngle(Y_AXIS, -state.spinAngle)
                .normalize()
                .multiplyScalar(1.005);
            subSolarDot.position.copy(scratchSubSolar);

            updateNetworkNote();
        }

        function computeCamera() {
            var sp = Math.sin(cam.polar), cp = Math.cos(cam.polar);
            var sa = Math.sin(cam.azimuth), ca = Math.cos(cam.azimuth);
            var d = cam.distance;
            camera.position.set(d * sp * ca, d * sp * sa, d * cp);
            camera.up.set(0, 0, 1);
            camera.lookAt(0, 0, 0);
        }

        function updateNetworkNote() {
            var m = measure();
            qualityNote.textContent = 'Render ' + Math.round(state.autoScale * m.w) + 'x' +
                Math.round(state.autoScale * m.h) + ' upscaled to ' + m.w + 'x' + m.h +
                ' | ' + state.frameMs.toFixed(1) + ' ms/frame' +
                (state.autoScale < 0.999 && !state.manualReduced ? ' | auto-reduced to hold 60 fps' : '') +
                (state.manualReduced ? ' | reduced effects on' : '');
        }

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
            if (sim.isPlaying) {
                state.jd += dtWall * daysPerSec;
                // Keep the date slider pointing at the clock so the control, the
                // readout and the picture never disagree.
                var offset = Math.round(state.jd - todayJulianDay());
                if (offset !== sim.params.dayOffset && offset >= -365 && offset <= 365) {
                    sim.params.dayOffset = offset;
                    var input = document.getElementById('sim-param-earth-seasons-dayOffset');
                    var badge = document.getElementById('sim-param-earth-seasons-dayOffset-val');
                    if (input) { input.value = String(offset); input.setAttribute('aria-valuenow', String(offset)); }
                    if (badge) badge.textContent = offset + ' d';
                }
            }

            updateScene(dtWall * daysPerSec);
            computeCamera();
            renderer.toneMappingExposure = sim.params.exposure;
            renderer.render(scene, camera);

            var ms = dtWall * 1000;
            if (ms > 0 && ms < 200) state.frameMs = state.frameMs * 0.9 + ms * 0.1;
            frameCount++;
            if (frameCount % 20 === 0) govern();
            // Readouts and the graph are DOM and 2D-canvas work, so they run far
            // less often than the render loop: every 10th and 12th frame, which
            // is still faster than a person can read them.
            if (frameCount % 10 === 0) { refreshReadouts(); state.dirtyGraph = true; }
            if (state.dirtyGraph && frameCount - lastGraphFrame >= 12) {
                drawGraph();
                state.dirtyGraph = false;
                lastGraphFrame = frameCount;
            }
            if (now - lastLiveUpdate > 4000) {
                lastLiveUpdate = now;
                live.textContent = describeState();
            }
        }

        // The climb threshold is 0.8 of the budget, not 1.06, and it takes ten
        // calm periods to act. The first version treated a vsync-locked 16.7 ms
        // frame as "headroom", so once the globe had pushed the scale down the
        // governor climbed 5 percent every two seconds and the frame time
        // immediately pushed it back 10 percent. Each of those steps reallocates
        // the drawing buffer, which is what produced the 83 ms worst frame in
        // the frame-rate run.
        function govern() {
            var budget = 1000 / 60;
            var over = state.frameMs > budget * 1.25;
            var under = state.frameMs < budget * 0.8;
            var changed = false;

            if (over) state.calm = 0;
            else if (under) state.calm = (state.calm || 0) + 1;
            else state.calm = 0;

            if (state.manualReduced) {
                if (state.autoScale !== 0.68) { state.autoScale = 0.68; changed = true; }
                if (state.starCount !== 400) { state.starCount = 400; applyStarCount(400); }
            } else if (over) {
                if (state.autoScale > 0.55) { state.autoScale = Math.max(0.55, state.autoScale * 0.9); changed = true; }
                else if (state.starCount > 300) { state.starCount = 300; applyStarCount(300); }
            } else if (under && state.calm >= 10) {
                state.calm = 0;
                if (state.starCount < 1200) { state.starCount = Math.min(1200, state.starCount + 200); applyStarCount(state.starCount); }
                else if (state.autoScale < 1) { state.autoScale = Math.min(1, state.autoScale * 1.05); changed = true; }
            }
            if (changed) applySize();
        }

        function applyStarCount(n) {
            if (starPoints) starPoints.geometry.setDrawRange(0, Math.min(n, starPoints.geometry.attributes.position.count));
        }

        // ---- boot ----
        function startRenderer() {
            try {
                renderer = new three.WebGLRenderer({
                    // Multisampling is off, and that is a measured decision rather
                    // than a default: with antialias on at 1440x900 this sim
                    // reported 54.6 fps with 31 frames longer than 25 ms, and with
                    // it off 58.8 fps with 4. A globe fills the frame, so its
                    // edges are where the samples go. The cost is a slightly
                    // harder limb on the globe, which the reduced-resolution
                    // render path softens anyway.
                    canvas: canvas, antialias: false, alpha: false,
                    powerPreference: 'high-performance'
                });
            } catch (e) {
                console.warn('[earth-seasons] WebGL renderer creation failed:', e);
                fallbackTo2D('This browser could not start a WebGL2 renderer, so the flat daylight chart is shown instead.');
                return;
            }
            renderer.toneMapping = three.ACESFilmicToneMapping;
            renderer.toneMappingExposure = sim.params.exposure;
            renderer.outputColorSpace = three.SRGBColorSpace;
            renderer.setClearColor(0x02040a, 1);

            camera = new three.PerspectiveCamera(42, 1, 0.002, 400);
            camera.up.set(0, 0, 1);

            buildScene();
            refreshLimits();

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

            frameFromSun();
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
                    console.warn('[earth-seasons] shader program failed to compile, falling back to the flat chart');
                    fallbackTo2D('The shaded view failed to build on this device, so the flat daylight chart is shown instead.');
                }
            });
        }

        sim.onParamChange = function (key) {
            if (key === 'dayOffset') {
                state.jd = todayJulianDay() + sim.params.dayOffset;
                refreshReadouts();
                state.dirtyGraph = true;
            }
            if (key === 'latitude') { refreshReadouts(); state.dirtyGraph = true; }
            if (key === 'exposure' || key === 'logDaysPerSec') refreshReadouts();
        };
        sim.onReset = function () {
            state.jd = todayJulianDay() + sim.params.dayOffset;
            // Re-frame from the Sun, so reset always brings back a lit globe
            // rather than a remembered angle from a different date.
            frameFromSun();
            refreshReadouts();
        };
        sim.onPause = function () { /* keep rendering so the view stays live */ };
        sim.onDestroy = function () { /* handled by controller.destroy */ };

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
            console.warn('[earth-seasons] three.js failed to load:', err);
            fallbackTo2D('The 3D library could not be loaded, so the flat daylight chart is shown instead.');
        });

        return controller;
    }

    window.initSketch = function (config) {
        config = config || {};
        if (!hasWebGL2()) {
            return mount2D(config, 'This browser or device has no WebGL2, so the flat daylight chart is shown instead of the globe.');
        }
        try {
            return mount3D(config);
        } catch (e) {
            console.warn('[earth-seasons] 3D view failed to start:', e);
            return mount2D(config, 'The globe could not start here, so the flat daylight chart is shown instead.');
        }
    };
})();
