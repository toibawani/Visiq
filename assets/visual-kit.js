// ===== VISIQ VISUAL KIT (assets/visual-kit.js) =====
// Standardized visual instrumentation helpers for simulation depth,
// glowing bodies, fading trails, vector arrows, collision bursts,
// inset chrome, and sparklines.

(function() {
    'use strict';

    const VisualKit = window.VisualKit || {};

    /**
     * Draw a per-segment fading polyline trail using power-curve alpha and weight scaling.
     * @param {object} p - p5 instance
     * @param {Array<{x: number, y: number}>} trail - Array of points
     * @param {Array<number>} rgb - [r, g, b] color array
     * @param {object} [options]
     * @param {number} [options.exponent=1.7] - Power-curve exponent for alpha ramp
     * @param {number} [options.maxAlpha=200] - Alpha at the newest point (head)
     * @param {number} [options.minWeight=1.0] - Stroke weight at the oldest point (tail)
     * @param {number} [options.maxWeight=2.4] - Stroke weight at the newest point (head)
     */
    function drawFadingTrail(p, trail, [r, g, b], options = {}) {
        if (!trail || trail.length < 2) return;
        const exponent  = options.exponent  !== undefined ? options.exponent  : 1.7;
        const maxAlpha  = options.maxAlpha  !== undefined ? options.maxAlpha  : 200;
        const minWeight = options.minWeight !== undefined ? options.minWeight : 1.0;
        const maxWeight = options.maxWeight !== undefined ? options.maxWeight : 2.4;
        const len = trail.length;

        p.noFill();
        for (let i = 1; i < len; i++) {
            const t = i / len;
            p.stroke(r, g, b, Math.pow(t, exponent) * maxAlpha);
            p.strokeWeight(minWeight + t * (maxWeight - minWeight));
            p.line(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y);
        }
    }

    /**
     * Draw a two-layer glow halo + core disc + specular highlight on a body or bob.
     * @param {object} p - p5 instance
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Body core radius
     * @param {Array<number>} rgb - [r, g, b] color array
     * @param {object} [options]
     * @param {number} [options.outerMult=1.8] - Multiplier on diameter for outer glow
     * @param {number} [options.innerMult=1.25] - Multiplier on diameter for inner glow
     * @param {number} [options.outerOffset] - Additive offset for outer halo radius (takes precedence if given)
     * @param {number} [options.innerOffset] - Additive offset for inner halo radius (takes precedence if given)
     * @param {number} [options.outerAlpha=30] - Outer halo alpha
     * @param {number} [options.innerAlpha=75] - Inner halo alpha
     * @param {boolean} [options.specular=true] - Whether to draw top-left specular highlight
     * @param {number} [options.specularAlpha=52] - Specular highlight alpha
     * @param {number} [options.strokeWidth=2] - Body boundary stroke weight
     * @param {Array<number>} [options.strokeColor=[7,9,15]] - Body boundary stroke RGB
     */
    function drawGlowBody(p, x, y, radius, [r, g, b], options = {}) {
        const outerAlpha = options.outerAlpha !== undefined ? options.outerAlpha : 30;
        const innerAlpha = options.innerAlpha !== undefined ? options.innerAlpha : 75;
        const outerDiam = options.outerOffset !== undefined
            ? (radius + options.outerOffset) * 2
            : radius * 2 * (options.outerMult !== undefined ? options.outerMult : 1.8);
        const innerDiam = options.innerOffset !== undefined
            ? (radius + options.innerOffset) * 2
            : radius * 2 * (options.innerMult !== undefined ? options.innerMult : 1.25);
        const specular = options.specular !== false;
        const specularAlpha = options.specularAlpha !== undefined ? options.specularAlpha : 52;
        const strokeWidth = options.strokeWidth !== undefined ? options.strokeWidth : 2;
        const sc = options.strokeColor || [7, 9, 15];

        // Outer glow
        p.noStroke();
        p.fill(r, g, b, outerAlpha);
        p.circle(x, y, outerDiam);

        // Inner glow
        p.fill(r, g, b, innerAlpha);
        p.circle(x, y, innerDiam);

        // Core disc
        p.fill(r, g, b);
        p.stroke(sc[0], sc[1], sc[2]);
        p.strokeWeight(strokeWidth);
        p.circle(x, y, radius * 2);

        // Specular highlight
        if (specular) {
            p.noStroke();
            p.fill(255, 255, 255, specularAlpha);
            p.circle(x - radius * 0.28, y - radius * 0.28, radius * 0.52);
        }
    }

    /**
     * Draw a directional vector arrow with angled barb head.
     * @param {object} p - p5 instance
     * @param {number} x1 - Origin X
     * @param {number} y1 - Origin Y
     * @param {number} x2 - Target X
     * @param {number} y2 - Target Y
     * @param {Array<number>} rgb - [r, g, b] color array
     * @param {number} [alpha=215] - Arrow alpha
     * @param {number} [weight=2] - Stroke weight
     * @param {number} [headLength=8] - Arrowhead barb length in px
     */
    function drawArrow(p, x1, y1, x2, y2, [r, g, b], alpha = 215, weight = 2, headLength = 8) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (Math.hypot(dx, dy) < 3) return;
        p.stroke(r, g, b, alpha);
        p.strokeWeight(weight);
        p.line(x1, y1, x2, y2);
        const ang = Math.atan2(dy, dx);
        const hl = headLength || 8;
        p.line(x2, y2, x2 - hl * Math.cos(ang - 0.45), y2 - hl * Math.sin(ang - 0.45));
        p.line(x2, y2, x2 - hl * Math.cos(ang + 0.45), y2 - hl * Math.sin(ang + 0.45));
    }

    /**
     * Draw a dual-ring expanding collision flash burst.
     * @param {object} p - p5 instance
     * @param {object} flash - Flash event object {x, y, r, age, maxAge}
     */
    function drawCollisionFlash(p, flash) {
        const t = 1 - flash.age / flash.maxAge;
        if (t <= 0) return;
        p.noFill();
        p.stroke(255, 240, 200, t * t * 170);
        p.strokeWeight(2.5 * t);
        p.circle(flash.x, flash.y, flash.r * (1 + (1 - t) * 1.4) * 2);

        p.stroke(255, 240, 200, t * t * 55);
        p.strokeWeight(9 * t);
        p.circle(flash.x, flash.y, flash.r * 2 * 0.55);
    }

    /**
     * Create a standard collision flash object.
     */
    function createCollisionFlash(x, y, radius, maxAge = 24) {
        return { x, y, r: radius, age: 0, maxAge };
    }

    /**
     * Age, render, and filter an array of collision flashes.
     * @param {object} p - p5 instance
     * @param {Array<object>} flashes - Array of flash objects
     * @returns {Array<object>} Filtered array of surviving flashes
     */
    function updateCollisionFlashes(p, flashes) {
        if (!flashes || flashes.length === 0) return [];
        p.noFill();
        for (let i = 0; i < flashes.length; i++) {
            drawCollisionFlash(p, flashes[i]);
            flashes[i].age++;
        }
        return flashes.filter(f => f.age < f.maxAge);
    }

    /**
     * Draw the standardized dark glass chrome for telemetry and diagnostic insets.
     * @param {object} p - p5 instance
     * @param {number} x - Top-left X
     * @param {number} y - Top-left Y
     * @param {number} w - Panel width
     * @param {number} h - Panel height
     * @param {string} [title=''] - Header label
     * @param {object} [options]
     * @param {string} [options.align='left'] - Label alignment ('left' or 'center')
     * @param {number} [options.cornerRadius=6] - Corner radius
     * @param {number} [options.textSize=8.5] - Label text size
     */
    function drawInsetPanel(p, x, y, w, h, title = '', options = {}) {
        const radius = options.cornerRadius !== undefined ? options.cornerRadius : 6;
        const align = options.align || 'left';
        p.push();
        p.noStroke();
        p.fill(8, 12, 22, 215);
        p.rect(x, y, w, h, radius);
        p.stroke(35, 48, 70);
        p.strokeWeight(1);
        p.noFill();
        p.rect(x, y, w, h, radius);

        if (title) {
            p.noStroke();
            p.fill(65, 85, 120);
            p.textSize(options.textSize || 8.5);
            if (align === 'center') {
                p.textAlign(p.CENTER, p.TOP);
                p.text(title, x + w * 0.5, y + 4);
            } else {
                p.textAlign(p.LEFT, p.TOP);
                p.text(title, x + 5, y + 4);
            }
        }
        p.pop();
    }

    /**
     * Draw a sparkline telemetry graph inside an inset panel.
     * @param {object} p - p5 instance
     * @param {number} x - Top-left X
     * @param {number} y - Top-left Y
     * @param {number} w - Panel width
     * @param {number} h - Panel height
     * @param {Array<number>} history - Historic scalar values
     * @param {Array<number>} rgb - [r, g, b] sparkline color
     * @param {object} [options]
     * @param {string} [options.label] - Title label
     * @param {boolean} [options.drawChrome=true] - Whether to render panel background & border
     * @param {number} [options.baseline] - Optional dashed reference line value
     * @param {boolean} [options.zeroFloor=false] - If true, minimum value is clamped to 0
     * @param {number} [options.cornerRadius=6] - Corner radius of panel
     */
    function drawSparkline(p, x, y, w, h, history, [r, g, b], options = {}) {
        if (!history || history.length < 2) return;
        const label = options.label;
        const baseline = options.baseline;
        const zeroFloor = options.zeroFloor === true;
        const minVal = zeroFloor ? 0 : Math.min(...history);
        const maxVal = Math.max(...history, minVal + 0.001);
        const range = Math.max(maxVal - minVal, 0.001);

        p.push();
        if (options.drawChrome !== false) {
            drawInsetPanel(p, x, y, w, h, label || '', {
                align: options.align || 'left',
                cornerRadius: options.cornerRadius !== undefined ? options.cornerRadius : 6,
                textSize: options.textSize || 8.5
            });
        }

        const padX = 5;
        const padTop = label ? 18 : 6;
        const padBottom = 7;
        const plotW = w - padX * 2;
        const plotH = h - padTop - padBottom;

        p.noFill();
        p.stroke(r, g, b, 190);
        p.strokeWeight(1.5);
        p.beginShape();
        const len = history.length;
        for (let i = 0; i < len; i++) {
            const vx = x + padX + (i / (len - 1)) * plotW;
            const norm = (history[i] - minVal) / range;
            const vy = y + h - padBottom - norm * plotH;
            p.vertex(vx, vy);
        }
        p.endShape();

        if (baseline !== null && baseline !== undefined) {
            const normBase = p.constrain((baseline - minVal) / range, 0, 1);
            const ry = y + h - padBottom - normBase * plotH;
            if (p.drawingContext && p.drawingContext.setLineDash) {
                p.drawingContext.setLineDash([3, 4]);
            }
            p.stroke(255, 255, 255, 28);
            p.strokeWeight(1);
            p.line(x + padX, ry, x + w - padX, ry);
            if (p.drawingContext && p.drawingContext.setLineDash) {
                p.drawingContext.setLineDash([]);
            }
        }
        p.pop();
    }

    VisualKit.drawFadingTrail = drawFadingTrail;
    VisualKit.drawGlowBody = drawGlowBody;
    VisualKit.drawArrow = drawArrow;
    VisualKit.drawCollisionFlash = drawCollisionFlash;
    VisualKit.createCollisionFlash = createCollisionFlash;
    VisualKit.updateCollisionFlashes = updateCollisionFlashes;
    VisualKit.drawInsetPanel = drawInsetPanel;
    VisualKit.drawSparkline = drawSparkline;
    window.VisualKit = VisualKit;
})();
