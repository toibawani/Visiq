import { describe, it, expect } from 'vitest';

/**
 * Pure math helpers commonly used across VISIQ sketches (clamp, lerp,
 * map-range, degrees/radians). Extracted here so they can be unit-tested
 * without a p5 canvas.
 */

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function mapRange(value, inMin, inMax, outMin, outMax) {
    const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
    return lerp(outMin, outMax, t);
}

function degrees(radians) {
    return (radians * 180) / Math.PI;
}

function radians(deg) {
    return (deg * Math.PI) / 180;
}

describe('simulation math helpers', () => {
    describe('clamp', () => {
        it('returns value when within bounds', () => {
            expect(clamp(0.5, 0, 1)).toBe(0.5);
        });
        it('clamps to min when below', () => {
            expect(clamp(-5, 0, 10)).toBe(0);
        });
        it('clamps to max when above', () => {
            expect(clamp(15, 0, 10)).toBe(10);
        });
    });

    describe('lerp', () => {
        it('interpolates between a and b', () => {
            expect(lerp(0, 10, 0.5)).toBe(5);
            expect(lerp(0, 10, 0)).toBe(0);
            expect(lerp(0, 10, 1)).toBe(10);
        });
    });

    describe('mapRange', () => {
        it('maps value linearly from input to output range', () => {
            expect(mapRange(50, 0, 100, 0, 10)).toBe(5);
            expect(mapRange(0, 0, 100, 0, 10)).toBe(0);
            expect(mapRange(100, 0, 100, 0, 10)).toBe(10);
        });
        it('clamps output when input is outside range', () => {
            expect(mapRange(150, 0, 100, 0, 10)).toBe(10);
            expect(mapRange(-50, 0, 100, 0, 10)).toBe(0);
        });
    });

    describe('degrees / radians', () => {
        it('converts radians to degrees', () => {
            expect(degrees(Math.PI)).toBeCloseTo(180, 10);
            expect(degrees(Math.PI / 2)).toBeCloseTo(90, 10);
        });
        it('converts degrees to radians', () => {
            expect(radians(180)).toBeCloseTo(Math.PI, 10);
            expect(radians(90)).toBeCloseTo(Math.PI / 2, 10);
        });
        it('are inverse operations', () => {
            const rad = 0.73;
            expect(radians(degrees(rad))).toBeCloseTo(rad, 10);
        });
    });
});
