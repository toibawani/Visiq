// ===== Ocean currents — Coriolis deflection and Ekman spiral =====
// Extracted from sketches/ocean-currents.js so the Coriolis deflection
// direction and the Ekman spiral can be asserted without a canvas.
//
// Works in the browser (window.VisiqOceanCurrents) and in Node (module.exports).
//
// The particle physics (thermohaline advection, temperature advection) runs in
// a Web Worker and is not extracted here; this module covers the two pieces
// that are pure closed-form and textbook-known.
//
// Known answers (external facts):
//   Coriolis parameter:              f = 2 Omega sin(latitude)
//   NH gyres rotate clockwise, SH    counter-clockwise
//   Ekman spiral:                    each layer turns right (NH) of the one
//                                     above it and slows with depth
//   Ekman transport is 45 degrees to  -> the wind direction at the surface

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
    if (typeof root !== 'undefined') {
        root.VisiqOceanCurrents = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Coriolis parameter f = 2 Omega sin(latitude), in s^-1, for a latitude
    // in degrees. Omega = 7.2921e-5 rad/s for Earth. The sketch works in
    // arbitrary units with the constant folded into coriolisStrength, so this
    // returns the dimensionless shape of the function.
    function coriolisParameter(latitudeDeg) {
        const OMEGA = 7.2921e-5;
        return 2 * OMEGA * Math.sin(latitudeDeg * Math.PI / 180);
    }

    // Sign of the Coriolis parameter: positive in the northern hemisphere,
    // negative in the southern, zero at the equator.
    function hemisphere(latitudeDeg) {
        const f = coriolisParameter(latitudeDeg);
        if (f > 0) return 'northern';
        if (f < 0) return 'southern';
        return 'equator';
    }

    // Deflection direction of a wind-driven surface current. In the northern
    // hemisphere the Coriolis force turns moving water to the right of the
    // wind, so the net transport is 45 degrees to the right of the wind
    // direction. In the southern hemisphere it is 45 degrees to the left.
    function surfaceTransportAngle(windDirectionDeg, latitudeDeg) {
        const sign = coriolisParameter(latitudeDeg) >= 0 ? 1 : -1;
        return (windDirectionDeg + sign * 45 + 360) % 360;
    }

    // Ekman spiral: the current direction at a given layer index, where layer
    // 0 is the surface. Each successive layer turns by coriolisStrength *
    // PI/2 radians relative to the one above it (the sketch uses PI per
    // strength unit across its 8 layers) and its magnitude decays linearly
    // with depth. Returns the angle in radians and the relative magnitude.
    function ekmanLayer(layerIndex, layers, coriolisStrength) {
        const angle = (layerIndex / layers) * Math.PI * coriolisStrength;
        const magnitude = 1 - layerIndex / layers;
        return { angle, magnitude };
    }

    // Gyre rotation direction. In the northern hemisphere the Coriolis force
    // turns moving water to the right, so a wind-driven gyre rotates
    // clockwise. In the southern hemisphere it rotates counter-clockwise.
    function gyreRotation(latitudeDeg) {
        return coriolisParameter(latitudeDeg) >= 0 ? 'clockwise' : 'counter-clockwise';
    }

    return {
        coriolisParameter,
        hemisphere,
        surfaceTransportAngle,
        ekmanLayer,
        gyreRotation
    };
}));
