// ===== EXOPLANET DETECTION =====
// Transit photometry and radial velocity methods for detecting planets around distant stars
// Astronomy: Kepler mission technique, light curve dip, Doppler wobble, habitable zone

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'exoplanet-detection',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            planetRadius:   { value: 0.4, min: 0.05, max: 1.2,  step: 0.05, label: 'Planet Radius',   unit: 'R★' },
            orbitalPeriod:  { value: 8.0, min: 2.0,  max: 20.0, step: 0.5,  label: 'Orbital Period',  unit: 'days' },
            orbitalTilt:    { value: 0,   min: -12,  max: 12,   step: 1,    label: 'Orbital Tilt',    unit: '°' }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Transit Depth':  '0.00%',
                'Period':         '8.0 days',
                'Hab. Zone':      'No',
                'Planet Type':    'Super-Earth'
            };
        },
        setup(p, ctx) {
            let lightCurve = [];        // brightness samples
            let rvCurve = [];           // radial velocity samples
            let orbitalAngle = 0;       // planet's current angle (radians)
            let time = 0;

            function reset() {
                lightCurve = [];
                rvCurve = [];
                orbitalAngle = 0;
                time = 0;
            }

            ctx.onReset = reset;
            ctx.onResize = reset;
            ctx.onParamChange = reset;

            p.draw = function() {
                p.background(7, 9, 15);
                const W = p.width;
                const H = p.height;
                const pR = ctx.params.planetRadius;      // in stellar radii
                const period = ctx.params.orbitalPeriod;
                const tilt = ctx.params.orbitalTilt * (Math.PI / 180);

                // Angular speed based on period
                const angSpeed = (2 * Math.PI / period) / 60;  // radians per frame (scaled to days)

                // ── Left panel: star system view ──
                const sysX = W * 0.30;
                const sysY = H * 0.38;
                const sysR = Math.min(W * 0.22, H * 0.30);

                // Habitable zone ring (0.95–1.37 AU scaled to sysR * 0.7–1.1)
                p.noFill();
                p.stroke(80, 160, 80, 50);
                p.strokeWeight(8);
                p.circle(sysX, sysY, sysR * 1.9);
                p.stroke(80, 160, 80, 30);
                p.strokeWeight(14);
                p.circle(sysX, sysY, sysR * 1.65);
                p.fill('#4ade8020'); p.noStroke();
                p.ellipse(sysX, sysY, sysR * 2.2, sysR * 2.2 * 0.25); // Edge-on HZ hint

                // Orbital path (ellipse for tilt)
                p.noFill();
                p.stroke('#94a3b840');
                p.strokeWeight(1);
                p.ellipse(sysX, sysY, sysR * 2, sysR * 2 * Math.abs(Math.cos(tilt)) + 4);

                // Star glow
                const starR = sysR * 0.14;
                for (let r = 5; r > 0; r--) {
                    p.fill(255, 210, 120, 20 * r);
                    p.noStroke();
                    p.circle(sysX, sysY, starR * 2 + r * 8);
                }
                p.fill(255, 220, 140);
                p.noStroke();
                p.circle(sysX, sysY, starR * 2);

                // Planet position
                const px = sysX + Math.cos(orbitalAngle) * sysR;
                const py = sysY + Math.sin(orbitalAngle) * sysR * Math.cos(tilt);
                const planetScreenR = Math.max(2, pR * starR);

                // Planet shadow (behind star?)
                const behindStar = Math.cos(orbitalAngle) < 0 && Math.abs(Math.sin(orbitalAngle) * Math.cos(tilt)) < 0.15;
                const inTransit = Math.cos(orbitalAngle) > 0.88 && Math.abs(Math.sin(orbitalAngle) * Math.cos(tilt)) < 0.22;

                // Draw planet (clipped if behind star)
                if (!behindStar) {
                    // Atmosphere glow
                    p.fill(100, 150, 220, 50);
                    p.noStroke();
                    p.circle(px, py, planetScreenR * 2 + 8);
                    // Planet body
                    const planetHue = pR < 0.2 ? p.color(180, 160, 140) :
                                      pR < 0.5 ? p.color(80, 140, 200) :
                                      pR < 0.9 ? p.color(200, 140, 80) :
                                                  p.color(200, 60, 40);
                    p.fill(planetHue);
                    p.circle(px, py, planetScreenR * 2);
                }

                // ── In-transit indicator ──
                if (inTransit) {
                    p.stroke('#fbbf24'); p.strokeWeight(2); p.noFill();
                    p.circle(sysX, sysY, starR * 2 + 12);
                }

                // ── Update simulation ──
                if (ctx.isPlaying) {
                    orbitalAngle += angSpeed * ctx.speed;
                    time += ctx.speed / 60;

                    // Transit depth: (planet area / star area)
                    const depth = inTransit ? Math.pow(pR, 2) * (behindStar ? 0 : 1) : 0;
                    const flux = 1.0 - depth;
                    lightCurve.push(flux);
                    if (lightCurve.length > 200) lightCurve.shift();

                    // RV wobble: star wobbles toward us when planet is approaching
                    const rv = Math.sin(orbitalAngle) * pR * 15;  // km/s scale
                    rvCurve.push(rv);
                    if (rvCurve.length > 200) rvCurve.shift();
                }

                // ── Light curve panel ──
                const lcX = W * 0.02;
                const lcY = H * 0.58;
                const lcW = W * 0.96;
                const lcH = H * 0.17;
                p.stroke('#1e293b');
                p.strokeWeight(1);
                p.fill('rgba(10,12,20,0.85)');
                p.rect(lcX, lcY, lcW, lcH, 4);
                p.fill('#94a3b8'); p.noStroke(); p.textSize(9); p.textAlign(p.LEFT, p.TOP);
                p.text('Flux (Transit Photometry)', lcX + 4, lcY + 2);

                // Grid lines
                p.stroke('#283150'); p.strokeWeight(0.5);
                p.line(lcX, lcY + lcH * 0.5, lcX + lcW, lcY + lcH * 0.5);

                if (lightCurve.length > 1) {
                    p.stroke('#fbbf24');
                    p.strokeWeight(2);
                    p.noFill();
                    p.beginShape();
                    for (let i = 0; i < lightCurve.length; i++) {
                        const lx = lcX + (i / 200) * lcW;
                        const ly = lcY + lcH * 0.1 + (1 - lightCurve[i]) * lcH * 0.8;
                        p.vertex(lx, ly);
                    }
                    p.endShape();
                }
                // Transit dip annotation
                const minFlux = Math.min(...lightCurve.slice(-60));
                if (minFlux < 0.99) {
                    p.fill('#fbbf24'); p.noStroke(); p.textSize(9); p.textAlign(p.LEFT, p.TOP);
                    p.text(`▼ ${((1 - minFlux) * 100).toFixed(2)}%`, lcX + 4, lcY + lcH - 18);
                }

                // ── RV panel ──
                const rvY = H * 0.78;
                const rvH = H * 0.13;
                p.stroke('#1e293b'); p.strokeWeight(1);
                p.fill('rgba(10,12,20,0.85)');
                p.rect(lcX, rvY, lcW, rvH, 4);
                p.fill('#94a3b8'); p.noStroke(); p.textSize(9); p.textAlign(p.LEFT, p.TOP);
                p.text('Radial Velocity (Doppler wobble) — km/s', lcX + 4, rvY + 2);
                p.stroke('#283150'); p.strokeWeight(0.5);
                p.line(lcX, rvY + rvH * 0.5, lcX + lcW, rvY + rvH * 0.5);

                if (rvCurve.length > 1) {
                    p.stroke('#60a5fa');
                    p.strokeWeight(1.5);
                    p.noFill();
                    p.beginShape();
                    for (let i = 0; i < rvCurve.length; i++) {
                        const rx = lcX + (i / 200) * lcW;
                        const ry = rvY + rvH * 0.5 - rvCurve[i] * (rvH * 0.38);
                        p.vertex(rx, ry);
                    }
                    p.endShape();
                }

                // ── Labels ──
                p.noStroke(); p.fill('#94a3b8'); p.textSize(10); p.textAlign(p.LEFT, p.TOP);
                p.text('Habitable Zone', sysX + sysR * 0.82, sysY - sysR * 0.07);
                p.fill('#fbbf24'); p.text('★ Host Star', sysX + 5, sysY - starR - 14);
                p.fill('#60a5fa'); p.text('Planet', px + planetScreenR + 4, py - 7);
                p.fill('#94a3b8'); p.textAlign(p.CENTER, p.TOP); p.textSize(11);
                p.text('Exoplanet Detection — Transit + Radial Velocity', W * 0.5, 12);

                // ── Telemetry ──
                const depthPct = (Math.pow(pR, 2) * 100).toFixed(2);
                const habitableZone = pR > 0.05 && pR < 2.5 && period > 180 && period < 730;
                const pType = pR < 0.12 ? 'Rocky' : pR < 0.4 ? 'Super-Earth' : pR < 0.8 ? 'Neptune-class' : 'Gas Giant';
                ctx._telemetry = {
                    'Transit Depth': `${depthPct}%`,
                    'Period':        `${period.toFixed(1)} days`,
                    'Hab. Zone':     habitableZone ? 'Yes' : 'No',
                    'Planet Type':   pType
                };
                ctx.updateTelemetry();

                p.fill('#94a3b8'); p.noStroke(); p.textAlign(p.LEFT, p.BOTTOM); p.textSize(10);
                p.text('Transit dip reveals planet size  •  RV wobble reveals mass  •  Green ring = habitable zone (~1 AU)', 14, H - 10);
            };
        }
    });

    sim.mount();
    return sim;
};
