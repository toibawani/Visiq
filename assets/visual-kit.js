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

    VisualKit.drawFadingTrail = drawFadingTrail;
    VisualKit.drawGlowBody = drawGlowBody;
    VisualKit.drawArrow = drawArrow;
    window.VisualKit = VisualKit;
})();
