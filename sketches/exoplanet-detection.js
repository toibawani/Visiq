// ===== EXOPLANET DETECTION =====
// Transit photometry and radial velocity methods for detecting planets around distant stars
// Astronomy: Kepler mission technique, light curve dip, Doppler wobble, habitable zone

window.initSketch = function(config) {
    const sim = new SimBase({
        id: 'exoplanet-detection',
        containerId: config.containerId,
        controlsContainerId: config.controlsContainerId,
        params: {
            planetRadius:  { value: 0.4, min: 0.05, max: 1.2,  step: 0.05, label: 'Planet Radius',  unit: 'R★'   },
            orbitalPeriod: { value: 8.0, min: 2.0,  max: 20.0, step: 0.5,  label: 'Orbital Period', unit: 'days' },
            orbitalTilt:   { value: 0,   min: -12,  max: 12,   step: 1,    label: 'Orbital Tilt',   unit: '°'    }
        },
        getReadouts(ctx) {
            return ctx._telemetry || {
                'Transit Depth': '0.00%',
                'Period':        '8.0 days',
                'Hab. Zone':     'No',
                'Planet Type':   'Super-Earth'
            };
        },

        setup(p, ctx) {
            // ── Color palette ──────────────────────────────────────────
            const ASTRO  = VisualKit.getCategoryRGB('astronomy'); // amber-gold
            const AMBER  = [255, 210, 120]; // host star
            const BLUE   = [ 96, 165, 250]; // planet / RV line
            const YELLOW = [251, 191,  36]; // transit indicator
            const GREEN  = [ 74, 222, 128]; // habitable zone

            // ── State ──────────────────────────────────────────────────
            let lightCurve   = [];
            let rvCurve      = [];
            let orbitalAngle = 0;
            let time         = 0;

            function reset() {
                lightCurve   = [];
                rvCurve      = [];
                orbitalAngle = 0;
                time         = 0;
            }

            ctx.onReset       = reset;
            ctx.onResize      = reset;
            ctx.onParamChange = reset;

            p.draw = function() {
                p.background(7, 9, 15);

                const W      = p.width;
                const H      = p.height;
                const pR     = ctx.params.planetRadius;
                const period = ctx.params.orbitalPeriod;
                const tilt   = ctx.params.orbitalTilt * (Math.PI / 180);
                const angSpeed = (2 * Math.PI / period) / 60;

                // ── Physics ────────────────────────────────────────────
                const behindStar = Math.cos(orbitalAngle) < 0 &&
                    Math.abs(Math.sin(orbitalAngle) * Math.cos(tilt)) < 0.15;
                const inTransit  = Math.cos(orbitalAngle) > 0.88 &&
                    Math.abs(Math.sin(orbitalAngle) * Math.cos(tilt)) < 0.22;

                if (ctx.isPlaying) {
                    orbitalAngle += angSpeed * ctx.speed;
                    time         += ctx.speed / 60;

                    const depth = inTransit ? Math.pow(pR, 2) : 0;
                    lightCurve.push(1.0 - depth);
                    if (lightCurve.length > 200) lightCurve.shift();

                    const rv = Math.sin(orbitalAngle) * pR * 15;
                    rvCurve.push(rv);
                    if (rvCurve.length > 200) rvCurve.shift();
                }

                // ── System layout ──────────────────────────────────────
                const sysX = W * 0.30;
                const sysY = H * 0.38;
                const sysR = Math.min(W * 0.22, H * 0.30);
                const starR = sysR * 0.14;

                // ── Habitable zone rings ───────────────────────────────
                p.push();
                p.noFill();
                p.stroke(GREEN[0], GREEN[1], GREEN[2], 18);
                p.strokeWeight(14);
                p.circle(sysX, sysY, sysR * 1.65);
                p.stroke(GREEN[0], GREEN[1], GREEN[2], 32);
                p.strokeWeight(7);
                p.circle(sysX, sysY, sysR * 1.9);
                p.pop();

                // HZ label
                p.push();
                p.noStroke();
                p.fill(GREEN[0], GREEN[1], GREEN[2], 140);
                p.textSize(9);
                p.textAlign(p.LEFT, p.CENTER);
                p.text('Habitable Zone', sysX + sysR * 0.82, sysY - sysR * 0.07);
                p.pop();

                // ── Orbital path ───────────────────────────────────────
                p.push();
                p.noFill();
                p.stroke(148, 163, 184, 50);
                p.strokeWeight(1);
                p.ellipse(sysX, sysY, sysR * 2, sysR * 2 * Math.abs(Math.cos(tilt)) + 4);
                p.pop();

                // ── Host Star (glow body) ──────────────────────────────
                // Multi-layer glow
                p.push();
                p.noStroke();
                for (let layer = 5; layer > 0; layer--) {
                    p.fill(AMBER[0], AMBER[1], AMBER[2], 18 * layer);
                    p.circle(sysX, sysY, starR * 2 + layer * 9);
                }
                p.fill(AMBER[0], AMBER[1], AMBER[2]);
                p.circle(sysX, sysY, starR * 2);
                p.pop();

                // In-transit ring indicator
                if (inTransit) {
                    p.push();
                    p.noFill();
                    p.stroke(YELLOW[0], YELLOW[1], YELLOW[2], 200);
                    p.strokeWeight(2.5);
                    p.circle(sysX, sysY, starR * 2 + 14);
                    // Outer soft glow
                    p.stroke(YELLOW[0], YELLOW[1], YELLOW[2], 45);
                    p.strokeWeight(10);
                    p.circle(sysX, sysY, starR * 2 + 14);
                    p.pop();
                }

                // ── Planet ─────────────────────────────────────────────
                const px          = sysX + Math.cos(orbitalAngle) * sysR;
                const py          = sysY + Math.sin(orbitalAngle) * sysR * Math.cos(tilt);
                const planetScreenR = Math.max(3, pR * starR);

                if (!behindStar) {
                    // Planet color by type
                    const pRgb = pR < 0.2 ? [180, 160, 140]
                               : pR < 0.5 ? [ 80, 140, 200]
                               : pR < 0.9 ? [200, 140,  80]
                                           : [200,  60,  40];

                    VisualKit.drawGlowBody(p, px, py, planetScreenR, pRgb, {
                        outerMult:  3.0,  innerMult:  1.8,
                        outerAlpha: 40,   innerAlpha: 80,
                        strokeWidth: 1.2, specular: true
                    });

                    // Planet label
                    p.push();
                    p.noStroke();
                    p.fill(96, 165, 250, 180);
                    p.textSize(9);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.text('Planet', px + planetScreenR + 5, py - 1);
                    p.pop();
                }

                // Star label
                p.push();
                p.noStroke();
                p.fill(YELLOW[0], YELLOW[1], YELLOW[2], 200);
                p.textSize(10);
                p.textAlign(p.LEFT, p.TOP);
                p.text('★ Host Star', sysX + 5, sysY - starR - 16);
                p.pop();

                // ── Light curve panel ──────────────────────────────────
                const lcX = W * 0.02;
                const lcY = H * 0.58;
                const lcW = W * 0.96;
                const lcH = H * 0.18;

                VisualKit.drawInsetPanel(p, lcX, lcY, lcW, lcH,
                    'Flux  (Transit Photometry)', { cornerRadius: 8, textSize: 9 });

                // Midline
                p.push();
                const midY = lcY + lcH * 0.5;
                if (p.drawingContext?.setLineDash) p.drawingContext.setLineDash([4, 6]);
                p.stroke(255, 255, 255, 18);
                p.strokeWeight(1);
                p.line(lcX + 8, midY, lcX + lcW - 8, midY);
                if (p.drawingContext?.setLineDash) p.drawingContext.setLineDash([]);
                p.pop();

                if (lightCurve.length > 1) {
                    p.push();
                    p.noFill();
                    p.stroke(YELLOW[0], YELLOW[1], YELLOW[2], 210);
                    p.strokeWeight(2);
                    p.beginShape();
                    for (let i = 0; i < lightCurve.length; i++) {
                        const lx = lcX + 6 + (i / 200) * (lcW - 12);
                        const ly = lcY + lcH * 0.1 + (1 - lightCurve[i]) * lcH * 0.8;
                        p.vertex(lx, ly);
                    }
                    p.endShape();
                    // Glow
                    p.stroke(YELLOW[0], YELLOW[1], YELLOW[2], 40);
                    p.strokeWeight(7);
                    p.beginShape();
                    for (let i = 0; i < lightCurve.length; i++) {
                        const lx = lcX + 6 + (i / 200) * (lcW - 12);
                        const ly = lcY + lcH * 0.1 + (1 - lightCurve[i]) * lcH * 0.8;
                        p.vertex(lx, ly);
                    }
                    p.endShape();
                    p.pop();
                }

                // Transit dip annotation
                const minFlux = lightCurve.length > 0 ? Math.min(...lightCurve.slice(-60)) : 1;
                if (minFlux < 0.99) {
                    p.push();
                    p.noStroke();
                    p.fill(YELLOW[0], YELLOW[1], YELLOW[2], 180);
                    p.textSize(9);
                    p.textAlign(p.LEFT, p.BOTTOM);
                    p.text(`▼ ${((1 - minFlux) * 100).toFixed(2)}% transit dip`, lcX + 8, lcY + lcH - 6);
                    p.pop();
                }

                // ── RV panel ──────────────────────────────────────────
                const rvY = H * 0.79;
                const rvH = H * 0.13;

                VisualKit.drawInsetPanel(p, lcX, rvY, lcW, rvH,
                    'Radial Velocity  (Doppler wobble) — km/s', { cornerRadius: 8, textSize: 9 });

                const rvMid = rvY + rvH * 0.5;
                p.push();
                if (p.drawingContext?.setLineDash) p.drawingContext.setLineDash([4, 6]);
                p.stroke(255, 255, 255, 14);
                p.strokeWeight(1);
                p.line(lcX + 8, rvMid, lcX + lcW - 8, rvMid);
                if (p.drawingContext?.setLineDash) p.drawingContext.setLineDash([]);
                p.pop();

                if (rvCurve.length > 1) {
                    p.push();
                    p.noFill();
                    p.stroke(BLUE[0], BLUE[1], BLUE[2], 210);
                    p.strokeWeight(1.8);
                    p.beginShape();
                    for (let i = 0; i < rvCurve.length; i++) {
                        const rx = lcX + 6 + (i / 200) * (lcW - 12);
                        const ry = rvMid - rvCurve[i] * (rvH * 0.38);
                        p.vertex(rx, ry);
                    }
                    p.endShape();
                    p.pop();
                }

                // ── Title ──────────────────────────────────────────────
                p.push();
                p.noStroke();
                p.fill(148, 163, 184, 180);
                p.textSize(11);
                p.textAlign(p.CENTER, p.TOP);
                p.text('Exoplanet Detection — Transit + Radial Velocity', W * 0.5, 10);
                p.pop();

                // ── Telemetry ──────────────────────────────────────────
                const depthPct     = (Math.pow(pR, 2) * 100).toFixed(2);
                const habitableZone = pR > 0.05 && pR < 2.5 && period > 180 && period < 730;
                const pType = pR < 0.12 ? 'Rocky'
                            : pR < 0.4  ? 'Super-Earth'
                            : pR < 0.8  ? 'Neptune-class'
                            :              'Gas Giant';

                ctx._telemetry = {
                    'Transit Depth': `${depthPct}%`,
                    'Period':        `${period.toFixed(1)} days`,
                    'Hab. Zone':     habitableZone ? 'Yes' : 'No',
                    'Planet Type':   pType
                };
                ctx.updateTelemetry();

                // ── Footer hint ────────────────────────────────────────
                p.push();
                p.noStroke();
                p.fill(70, 90, 120);
                p.textSize(10);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.text('Transit dip reveals planet size  ·  RV wobble reveals mass  ·  Green ring = habitable zone', 14, H - 8);
                p.pop();
            };
        }
    });

    sim.mount();
    return sim;
};
