// Known-answer tests for the seasons geometry. The declination and the day
// lengths are computed from the Earth's position in the JPL element table, so
// these tests check the geometry against real dates and real day lengths.
//
// Measured values from the run that set each tolerance are written next to it.
// The day-length figures are geometric: no atmospheric refraction and no solar
// radius, so they are about 10 to 15 minutes shorter than a published sunrise to
// sunset figure at mid latitudes. That difference is asserted, not hidden.

import { describe, it, expect } from 'vitest';
import OE from '../assets/orbital-elements.js';
import S from '../assets/seasons.js';

const JD0 = OE.J2000_JD;

function declinationOn(jd) {
    return S.solarDeclination(OE.positionAt('embary', jd));
}

function dateOf(jd) {
    return OE.calendarFromJD(jd);
}

// Scan one year from 2000-01-01 and report the extremes and the crossings.
function scanYear(startJd) {
    let max = { d: -99, jd: startJd };
    let min = { d: 99, jd: startJd };
    let up = null;
    let down = null;
    let prev = null;
    for (let k = 0; k <= 365; k++) {
        const jd = startJd + k;
        const d = declinationOn(jd);
        if (d > max.d) max = { d, jd };
        if (d < min.d) min = { d, jd };
        if (prev !== null && prev < 0 && d >= 0 && !up) up = { jd, d };
        if (prev !== null && prev > 0 && d <= 0 && !down) down = { jd, d };
        prev = d;
    }
    return { max, min, up, down };
}

describe('seasons: the declination follows from the orbit', () => {
    const year = scanYear(JD0);

    it('reaches +23.44 at the June solstice', () => {
        expect(year.max.d).toBeCloseTo(23.44, 2); // measured 23.439
        expect(dateOf(year.max.jd).month).toBe(6);
        expect(dateOf(year.max.jd).day).toBe(21); // measured 21 June 2000
    });

    it('reaches -23.44 at the December solstice', () => {
        expect(year.min.d).toBeCloseTo(-23.44, 2); // measured -23.440
        expect(dateOf(year.min.jd).month).toBe(12);
        expect(dateOf(year.min.jd).day).toBe(21); // measured 21 December 2000
    });

    it('crosses zero at the equinoxes, in March and September', () => {
        expect(dateOf(year.up.jd).month).toBe(3);
        expect(Math.abs(year.up.d)).toBeLessThan(0.1); // measured 0.076
        expect(dateOf(year.down.jd).month).toBe(9);
        expect(Math.abs(year.down.d)).toBeLessThan(0.4); // measured 0.302
    });

    it('gives -23.0 degrees on 1 January 2000, the middle of northern winter', () => {
        expect(declinationOn(JD0)).toBeCloseTo(-23.03, 1); // measured -23.034
    });

    it('puts the Sun ecliptic longitude at 90 degrees at the June solstice', () => {
        const lon = S.sunEclipticLongitude(OE.positionAt('embary', year.max.jd));
        expect(lon).toBeGreaterThan(89);
        expect(lon).toBeLessThan(91);
    });
});

describe('seasons: daylight hours', () => {
    it('is 12 hours at the equator all year, to a hundredth of an hour', () => {
        for (let d = -23.44; d <= 23.44; d += 1.5) {
            expect(S.daylightHours(0, d)).toBeCloseTo(12, 2); // measured 12.000
        }
    });

    it('is 16.4 hours at the latitude of London at the June solstice', () => {
        // Geometric, without refraction: a published sunrise-to-sunset figure
        // for London on 21 June is about 16.6 hours, and the difference is the
        // refraction and the Sun's disc that this model leaves out.
        expect(S.daylightHours(51.5, 23.44)).toBeCloseTo(16.40, 1); // measured 16.404
        expect(S.daylightHours(51.5, -23.44)).toBeCloseTo(7.60, 1); // measured 7.596
    });

    it('gives polar day and polar night beyond the Arctic circle', () => {
        expect(S.daylightHours(80, 23.44)).toBe(24); // measured 24
        expect(S.daylightHours(80, -23.44)).toBe(0); // measured 0
        expect(S.daylightHours(-80, 23.44)).toBe(0); // southern polar night
        expect(S.daylightHours(-80, -23.44)).toBe(24); // southern polar day
    });

    it('is symmetric about the equator at the equinox', () => {
        expect(S.daylightHours(40, 0)).toBeCloseTo(12, 1);
        expect(S.daylightHours(-40, 0)).toBeCloseTo(12, 1);
    });
});

describe('seasons: the distance is not the cause', () => {
    it('has the Earth closest to the Sun on 4 January, in northern winter', () => {
        let min = { r: 99, jd: JD0 };
        for (let k = 0; k <= 400; k++) {
            const jd = JD0 + k;
            const p = OE.positionAt('embary', jd);
            const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
            if (r < min.r) min = { r, jd };
        }
        const d = dateOf(min.jd);
        expect(d.month).toBe(1); // measured 4 January 2000
        expect(d.day).toBeLessThan(7);
        expect(min.r).toBeCloseTo(0.98329, 5);
        // At that closest approach the northern hemisphere is in winter.
        expect(declinationOn(min.jd)).toBeLessThan(-22); // measured -22.7
    });

    it('changes the distance by about 3 percent over the year', () => {
        let min = 9;
        let max = 0;
        for (let k = 0; k <= 400; k++) {
            const p = OE.positionAt('embary', JD0 + k);
            const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
            if (r < min) min = r;
            if (r > max) max = r;
        }
        expect((max - min) / max).toBeCloseTo(0.033, 3); // measured 0.0330
    });
});

describe('seasons: the axis is fixed in space', () => {
    it('is a unit vector tilted 23.44 degrees from the ecliptic pole', () => {
        const a = S.axisVector();
        const len = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
        expect(len).toBeCloseTo(1, 12);
        // Angle from the ecliptic normal (0, 0, 1).
        const tilt = Math.acos(a.z) * 180 / Math.PI;
        expect(tilt).toBeCloseTo(23.44, 2);
    });

    it('has no component along the equinox direction, so it does not turn with the orbit', () => {
        expect(S.axisVector().x).toBe(0);
    });

    it('puts the sub-solar point at the declination', () => {
        const p = OE.positionAt('embary', JD0 + 172); // June solstice
        const sub = S.subsolarPointOnEarth(p, 23.44, 0);
        expect(sub.lat).toBeCloseTo(23.44, 1);
        expect(sub.lon).toBeCloseTo(0, 6);
    });
});
