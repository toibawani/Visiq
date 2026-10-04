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

    VisualKit.drawFadingTrail = drawFadingTrail;
    window.VisualKit = VisualKit;
})();
