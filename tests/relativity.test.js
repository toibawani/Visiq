import { describe, it, expect } from 'vitest';
import Rel from '../assets/relativity.js';

// Known-answer tests for the black-hole geometry. Every expected value here is
// an external fact (a textbook or published result), not a number copied out of
// the implementation, so a change in the implementation has to be wrong rather
// than merely different.
//
//   rs = 2GM/c^2                    -> 2.953 km per solar mass
//   photon sphere = 3M = 1.5 rs
//   ISCO = 6M = 3 rs
//   shadow b_c = 3*sqrt(3) M = 3*sqrt(3)/2 rs
//   dtau/dt at r = 2 rs:  sqrt(1 - rs/(2rs)) = sqrt(0.5)
//   local orbital speed at the ISCO: exactly c/2
//   thin-disk efficiency to the ISCO: 1 - sqrt(8/9) ~= 5.7191%
//   ISCO coordinate Omega = 1/sqrt(54) in units of rs
//   Doppler factor at beta = 0.5 head-on: sqrt((1+b)/(1-b)) = sqrt(3)

const RS = 1.0; // work in units of the Schwarzschild radius

describe('Schwarzschild radii', () => {
    it('is 2.953 km for one solar mass', () => {
        expect(Rel.schwarzschildRadiusKm(1)).toBeCloseTo(2.953, 2);
    });

    it('scales linearly with mass', () => {
        expect(Rel.schwarzschildRadiusKm(10) / Rel.schwarzschildRadiusKm(1)).toBeCloseTo(10, 10);
        // Sgr A* is about 4.3 million solar masses, so about 12.7 million km.
        // Checked as a ratio to 1.27e7 km, since 2.953 km per solar mass is
        // itself rounded to three decimals.
        expect(Rel.schwarzschildRadiusKm(4.3e6) / 1.27e7).toBeCloseTo(1, 3);
    });

    it('puts the photon sphere at 1.5 rs', () => {
        expect(Rel.photonSphereRadius(RS) / RS).toBeCloseTo(1.5, 12);
        expect(Rel.PHOTON_SPHERE_OVER_RS).toBeCloseTo(1.5, 12);
    });

    it('puts the ISCO at 3 rs', () => {
        expect(Rel.iscoRadius(RS) / RS).toBeCloseTo(3.0, 12);
        expect(Rel.ISCO_OVER_RS).toBeCloseTo(3.0, 12);
    });

    it('puts the shadow critical impact parameter at 3*sqrt(3)/2 rs, about 2.598 rs', () => {
        expect(Rel.shadowImpactParameter(RS) / RS).toBeCloseTo(3 * Math.sqrt(3) / 2, 12);
        expect(Rel.shadowImpactParameter(RS) / RS).toBeCloseTo(2.598076, 6);
        // And in units of the mass M = rs/2, which is the published form:
        expect(2 * Rel.shadowImpactParameter(RS) / RS).toBeCloseTo(3 * Math.sqrt(3), 12);
        // Diameter 2 b_c, about 5.196 rs.
        expect(Rel.shadowDiameter(RS) / RS).toBeCloseTo(5.196152, 6);
    });
});

describe('time dilation and redshift', () => {
    it('is sqrt(0.5) at r = 2 rs', () => {
        expect(Rel.timeDilation(2 * RS, RS)).toBeCloseTo(Math.SQRT1_2, 12);
    });

    it('is 1 in the far field and 0 at the horizon', () => {
        // At r = 1e9 rs the exact value is 1 - 5e-10, so 8 digits is the
        // honest precision to ask for.
        expect(Rel.timeDilation(1e9 * RS, RS)).toBeCloseTo(1, 8);
        expect(Rel.timeDilation(RS, RS)).toBe(0);
        expect(Rel.timeDilation(0.5 * RS, RS)).toBe(0);
    });

    it('is 0.6 at r = 1.5625 rs (1 - rs/r = 0.36)', () => {
        // 1 - 1/1.5625 = 0.36 exactly, sqrt = 0.6. Chosen so the answer is exact.
        expect(Rel.timeDilation(1.5625 * RS, RS)).toBeCloseTo(0.6, 12);
    });

    it('agrees with the gravitational redshift factor', () => {
        expect(Rel.gravitationalRedshiftFactor(4 * RS, RS)).toBeCloseTo(Math.sqrt(0.75), 12);
    });
});

describe('circular orbits', () => {
    it('measures orbital speed 0.5 c at the ISCO', () => {
        expect(Rel.localOrbitalSpeed(3 * RS, RS)).toBeCloseTo(0.5, 12);
    });

    it('approaches the Newtonian sqrt(M/r) far from the hole', () => {
        const r = 1e6 * RS;
        const newtonian = Math.sqrt((RS / 2) / r);
        // The relativistic expression keeps a 1/sqrt(1 - rs/r) factor, which at
        // r = 1e6 rs is a relative correction of 5e-7. So the ratio is 1 to
        // five digits, and the ratio is the right thing to assert.
        expect(Rel.localOrbitalSpeed(r, RS) / newtonian).toBeCloseTo(1, 5);
        expect(Rel.localOrbitalSpeed(r, RS)).toBeGreaterThan(newtonian);
    });

    it('never reports a speed above c', () => {
        expect(Rel.localOrbitalSpeed(1.0001 * RS, RS)).toBeLessThanOrEqual(1);
        expect(Rel.localOrbitalSpeed(RS, RS)).toBe(1);
    });

    it('has coordinate Omega = 1/sqrt(54) rs^-1 at the ISCO', () => {
        // Omega = sqrt(M/r^3) with M = rs/2 and r = 3 rs gives 1/(rs*sqrt(54)).
        expect(Rel.keplerianOmega(3 * RS, RS) * RS).toBeCloseTo(1 / Math.sqrt(54), 12);
    });
});

describe('Doppler shift and beaming', () => {
    it('is 1 for a source at rest', () => {
        expect(Rel.dopplerFactor(0, 1)).toBeCloseTo(1, 12);
    });

    it('shows the transverse effect as 1/gamma, the time-dilation factor', () => {
        // At mu = 0 (motion perpendicular to the line of sight) the factor is
        // 1/gamma = sqrt(1 - beta^2), not 1. That is the relativistic
        // transverse Doppler effect, and 0.9c gives sqrt(0.19).
        expect(Rel.dopplerFactor(0.9, 0)).toBeCloseTo(Math.sqrt(0.19), 12);
    });

    it('gives sqrt(3) toward and 1/sqrt(3) away at beta = 0.5', () => {
        // D = sqrt((1+b)/(1-b)) approaching, its reciprocal receding.
        expect(Rel.dopplerFactor(0.5, 1)).toBeCloseTo(Math.sqrt(3), 12);
        expect(Rel.dopplerFactor(0.5, -1)).toBeCloseTo(1 / Math.sqrt(3), 12);
    });

    it('raises intensity by g^4', () => {
        expect(Rel.beamingBoost(1)).toBeCloseTo(1, 12);
        expect(Rel.beamingBoost(2)).toBeCloseTo(16, 12);
    });

    it('makes the approaching side 81 times brighter than the receding side at the ISCO', () => {
        // At r = 3 rs the orbital speed is 0.5 c. The shift factors differ by
        // the factor sqrt(3) (the Doppler part; the gravitational part cancels
        // because both points are at the same radius), so the intensities
        // differ by 3^4 = 81.
        const approaching = Rel.diskShiftFactor(3 * RS, RS, 1);
        const receding = Rel.diskShiftFactor(3 * RS, RS, -1);
        expect(approaching / receding).toBeCloseTo(3, 12);
        expect(Rel.beamingBoost(approaching) / Rel.beamingBoost(receding)).toBeCloseTo(81, 10);
    });
});

describe('blackbody colour', () => {
    it('is deep red at 1000 K, with essentially no blue', () => {
        const [r, g, b] = Rel.blackbodyRGB(1000);
        expect(r).toBeGreaterThan(0.9);
        expect(g).toBeLessThan(0.1);
        expect(b).toBeLessThan(0.01);
    });

    it('is orange at 3000 K, ordered red > green > blue', () => {
        const [r, g, b] = Rel.blackbodyRGB(3000);
        expect(r).toBeGreaterThan(g);
        expect(g).toBeGreaterThan(b);
        expect(r / b).toBeGreaterThan(3);
    });

    it('is close to white at 6500 K, like daylight', () => {
        const [r, g, b] = Rel.blackbodyRGB(6500);
        expect(Math.min(r, g, b)).toBeGreaterThan(0.8);
        expect(Math.max(r, g, b) / Math.min(r, g, b)).toBeLessThan(1.4);
    });

    it('turns blue-dominant above about 10000 K', () => {
        const [r1, g1, b1] = Rel.blackbodyRGB(10000);
        expect(b1).toBeGreaterThan(g1);
        expect(g1).toBeGreaterThan(r1);
        const [r2, , b2] = Rel.blackbodyRGB(1e7);
        expect(b2).toBeGreaterThan(r2);
        expect(r2 / b2).toBeLessThan(0.5); // the Planckian locus saturates toward blue
    });

    it('gets bluer monotonically as temperature rises', () => {
        // The red-to-blue ratio must fall at every step, for physical reasons:
        // the Planck peak moves toward shorter wavelengths.
        let previous = Infinity;
        for (let T = 2000; T <= 20000; T += 500) {
            const [r, , b] = Rel.blackbodyRGB(T);
            const ratio = r / Math.max(1e-12, b);
            expect(ratio).toBeLessThan(previous);
            previous = ratio;
        }
    });

    it('reports no colour when every sample underflows to zero', () => {
        // At 1 K the Planck exponentials overflow and every visible sample is
        // zero, so there is no chromaticity to report. At room temperature the
        // tail is small but representable, and the clamped colour is a deep
        // red sitting outside the sRGB gamut, which is the honest answer.
        expect(Rel.blackbodyRGB(1)).toEqual([0, 0, 0]);
        const [r, g, b] = Rel.blackbodyRGB(300);
        expect(r).toBeGreaterThan(0.9);
        expect(g).toBeLessThan(r);
        expect(b).toBeLessThan(g);
    });

    it('normalises the largest channel to 1 and never returns NaN', () => {
        for (const T of [1000, 3000, 6500, 1e5, 1e9]) {
            const c = Rel.blackbodyRGB(T);
            c.forEach((v) => {
                expect(Number.isFinite(v)).toBe(true);
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThanOrEqual(1);
            });
            expect(Math.max(...c)).toBeCloseTo(1, 6);
        }
    });

    it('stays finite at X-ray-hot temperatures after normalisation', () => {
        // Regression guard: the raw Planck radiance at 1e7 K overflows a 32-bit
        // float, which is what the shader lookup table stores. Normalising the
        // spectrum inside the function is what keeps the table usable.
        const c = Rel.blackbodyRGB(1e7);
        c.forEach((v) => expect(Number.isFinite(v)).toBe(true));
        // And the values must survive a round trip through float32.
        const f32 = new Float32Array(c);
        f32.forEach((v) => expect(Number.isFinite(v)).toBe(true));
    });
});

describe('thin-disk temperature profile', () => {
    it('peaks at r = 49/36 of the inner radius, with value 1', () => {
        expect(Rel.diskProfile(Rel.DISK_PEAK_R_OVER_RIN, 1)).toBeCloseTo(1, 9);
        expect(Rel.DISK_PEAK_R_OVER_RIN).toBeCloseTo(49 / 36, 12);
    });

    it('is zero at and inside the inner radius', () => {
        expect(Rel.diskProfile(1, 1)).toBe(0);
        expect(Rel.diskProfile(0.5, 1)).toBe(0);
    });

    it('has a flux profile that is the fourth power of the temperature profile', () => {
        // Physics, not a coincidence: radiated power scales as T^4, so the
        // normalised flux curve must equal the normalised temperature curve
        // raised to the fourth power at every radius.
        for (const r of [1.5, 2, 3, 4, 8, 20]) {
            expect(Rel.diskFlux(r, 1)).toBeCloseTo(Math.pow(Rel.diskProfile(r, 1), 4), 9);
        }
        expect(Rel.diskFlux(Rel.DISK_PEAK_R_OVER_RIN, 1)).toBeCloseTo(1, 9);
    });

    it('falls off outward from the peak', () => {
        const peak = Rel.DISK_PEAK_R_OVER_RIN;
        expect(Rel.diskProfile(peak + 0.5, 1)).toBeLessThan(Rel.diskProfile(peak, 1));
        expect(Rel.diskProfile(4, 1)).toBeLessThan(Rel.diskProfile(2, 1));
        expect(Rel.diskProfile(10, 1)).toBeLessThan(Rel.diskProfile(4, 1));
    });
});

describe('disk peak temperature', () => {
    it('is about 1e7 K for a 10 solar-mass hole', () => {
        expect(Rel.diskPeakTemperature(10)).toBeCloseTo(1e7, -4);
    });

    it('is about 1.8e5 K for a 1e8 solar-mass hole, matching the UV figure', () => {
        expect(Rel.diskPeakTemperature(1e8) / 1.8e5).toBeCloseTo(1, 1);
    });

    it('follows the T ~ M^(-1/4) scaling', () => {
        expect(Rel.diskPeakTemperature(100) / Rel.diskPeakTemperature(10)).toBeCloseTo(Math.pow(10, -0.25), 10);
    });
});

describe('accretion efficiency and weak-field deflection', () => {
    it('converts 5.72% of rest mass for a thin disk reaching the ISCO', () => {
        expect(Rel.iscoEfficiency()).toBeCloseTo(0.0571909, 6);
    });

    it('deflects light by 2 rs / b in the weak field', () => {
        expect(Rel.weakFieldDeflection(100 * RS, RS)).toBeCloseTo(0.02, 12);
        expect(Rel.weakFieldDeflection(RS, RS)).toBeCloseTo(2, 12);
    });
});
