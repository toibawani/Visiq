// Known-answer tests for the solar system orbital elements and the integrated
// motion they seed. Every tolerance below is a stated bound, and the measured
// value from the run that set it is written next to it in a comment.

import { describe, it, expect } from 'vitest';
import OE from '../assets/orbital-elements.js';
import Integrators from '../assets/integrators.js';

const { rk4, centralForce3, specificOrbitalEnergy3, angularMomentum3 } = Integrators;
const JD0 = OE.J2000_JD;
const AU_KM = 1.495978707e8;
const KM_PER_AU_PER_DAY_TO_KM_PER_S = AU_KM / 86400;

const toArray = (s) => [s.x, s.y, s.z, s.vx, s.vy, s.vz];
const norm = (v) => Math.sqrt(v.reduce((a, x) => a + x * x, 0));
const f = centralForce3(OE.MU_SUN);

// Integrate a body for `days` from its table state, `steps` RK4 steps total.
function integrate(id, days, steps, jd = JD0) {
  let st = toArray(OE.stateAt(id, jd));
  const dt = days / steps;
  for (let i = 0; i < steps; i++) st = rk4(f, st, dt);
  return st;
}

function longitudeDeg(st) {
  return Math.atan2(st[1], st[0]) * 180 / Math.PI;
}

function wrappedDeltaDeg(a, b) {
  let d = a - b;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

describe('JPL element table: Kepler\u2019s third law', () => {
  // P = 2 pi sqrt(a^3/GM) against the period implied by the table's own measured
  // mean-longitude rate. They differ only by the perihelion drift folded into
  // the longitude rate, which is largest for the slow outer planets.
  it('agrees within 5e-5 for the four inner bodies', () => {
    for (const id of ['mercury', 'venus', 'embary', 'mars']) {
      const a = OE.elementsAt(id, JD0).a;
      const rel = Math.abs(OE.periodDays(a) / OE.periodFromLongitudeRate(id) - 1);
      expect(rel, id).toBeLessThan(5e-5); // measured worst inner: 1.87e-5 (mars)
    }
  });

  it('agrees within 7e-4 for all eight, worst being Neptune', () => {
    let worst = 0;
    let worstId = '';
    for (const id of OE.PLANET_ORDER) {
      const a = OE.elementsAt(id, JD0).a;
      const rel = Math.abs(OE.periodDays(a) / OE.periodFromLongitudeRate(id) - 1);
      if (rel > worst) { worst = rel; worstId = id; }
    }
    expect(worst, `worst was ${worstId}`).toBeLessThan(7e-4); // measured 6.33e-4
  });

  it('gives the textbook periods', () => {
    expect(OE.periodDays(OE.elementsAt('mercury', JD0).a)).toBeCloseTo(87.97, 1);
    expect(OE.periodDays(OE.elementsAt('embary', JD0).a) / 365.25).toBeCloseTo(1.0, 3);
    expect(OE.periodDays(OE.elementsAt('jupiter', JD0).a) / 365.25).toBeCloseTo(11.86, 1);
    expect(OE.periodDays(OE.elementsAt('neptune', JD0).a) / 365.25).toBeCloseTo(164.8, 0);
  });
});

describe('JPL element table: positions at J2000', () => {
  it('puts the Earth-Moon barycentre at 0.9833 AU on 2000-01-01', () => {
    // Perihelion falls in early January, so the distance at J2000 is close to
    // the minimum, not the mean 1.0 AU.
    const r = norm([OE.positionAt('embary', JD0).x, OE.positionAt('embary', JD0).y, OE.positionAt('embary', JD0).z]);
    expect(r).toBeCloseTo(0.983307, 5); // measured 0.983307
  });

  it('keeps the Earth-Moon barycentre between the published perihelion and aphelion', () => {
    let min = 99, max = 0;
    for (let d = 0; d < 800; d += 1) {
      const p = OE.positionAt('embary', JD0 + d);
      const r = norm([p.x, p.y, p.z]);
      if (r < min) min = r;
      if (r > max) max = r;
    }
    expect(min).toBeCloseTo(0.98329, 5); // measured 0.983292
    expect(max).toBeCloseTo(1.01671, 5); // measured 1.016714
  });

  it('gives Mercury a perihelion distance of 0.3075 AU from its elements', () => {
    const el = OE.elementsAt('mercury', JD0);
    expect(el.a * (1 - el.e)).toBeCloseTo(0.30750, 4); // a(1-e), measured 0.307499
    expect(el.I).toBeCloseTo(7.00498, 4); // inclination, verbatim from JPL
  });

  it('treats the Earth label as the Earth-Moon barycentre, not the Earth', () => {
    // The table entry is the barycentre, so the element is nearly in the
    // ecliptic plane: |I| under 0.001 degrees, unlike Mercury's 7 degrees.
    expect(Math.abs(OE.elementsAt('embary', JD0).I)).toBeLessThan(0.001);
    expect(OE.ELEMENTS.embary.label).toMatch(/barycentre/i);
  });

  it('converts a Julian Day back to the calendar date it came from', () => {
    const jd = OE.julianDay(2026, 10, 14);
    const back = OE.calendarFromJD(jd);
    expect(back.year).toBe(2026);
    expect(back.month).toBe(10);
    expect(back.day).toBe(14);
  });
});

describe('integrated motion from the table states', () => {
  it('returns each body to its starting longitude after one Kepler period', () => {
    for (const id of ['mercury', 'venus', 'embary', 'mars', 'jupiter']) {
      const P = OE.periodDays(OE.elementsAt(id, JD0).a);
      const st0 = toArray(OE.stateAt(id, JD0));
      const st1 = integrate(id, P, 2000);
      const dlon = wrappedDeltaDeg(longitudeDeg(st1), longitudeDeg(st0));
      expect(Math.abs(dlon), `${id} longitude`).toBeLessThan(1e-6); // measured worst 9.3e-10
      const dr = Math.abs(norm(st1.slice(0, 3)) / norm(st0.slice(0, 3)) - 1);
      expect(dr, `${id} radius`).toBeLessThan(1e-9); // measured worst 9.2e-13
    }
  });

  it('has an Earth year of 365.26 days, stated to 0.02 days', () => {
    const P = OE.periodDays(OE.elementsAt('embary', JD0).a);
    expect(Math.abs(P - 365.25)).toBeLessThan(0.02); // measured 365.2583
  });

  it('conserves specific energy and angular momentum over a year of RK4 at 1 day steps', () => {
    const s0 = toArray(OE.stateAt('embary', JD0));
    const e0 = specificOrbitalEnergy3(s0, OE.MU_SUN);
    const h0 = angularMomentum3(s0);
    const st = integrate('embary', 365.25, 366);
    const e1 = specificOrbitalEnergy3(st, OE.MU_SUN);
    const h1 = angularMomentum3(st);
    expect(Math.abs((e1 - e0) / e0)).toBeLessThan(1e-8); // measured 2.65e-10
    expect(Math.abs(norm(h1) / norm(h0) - 1)).toBeLessThan(1e-8); // measured 1.32e-10
    // The direction of the angular momentum vector is conserved too, which a
    // magnitude test alone would not catch if the orbit plane drifted.
    const dot = (h0[0] * h1[0] + h0[1] * h1[1] + h0[2] * h1[2]) / (norm(h0) * norm(h1));
    expect(Math.abs(1 - dot)).toBeLessThan(1e-8); // measured 8.7e-11
  });

  it('gives the Earth a mean orbital speed of 29.78 km/s', () => {
    const st = toArray(OE.stateAt('embary', JD0));
    const speed = norm([st[3], st[4], st[5]]) * KM_PER_AU_PER_DAY_TO_KM_PER_S;
    expect(speed).toBeGreaterThan(29.2); // near perihelion the Earth is faster
    expect(speed).toBeLessThan(30.4); // than the 29.78 km/s mean
    expect(speed).toBeCloseTo(30.28, 1); // measured 30.28 km/s at J2000
    // Vis-viva at r = a recovers the circular speed, GM/a.
    expect(OE.speedFromVisViva(1, 1) * KM_PER_AU_PER_DAY_TO_KM_PER_S).toBeCloseTo(29.78, 1);
  });

  it('solves Kepler\u2019s equation to the printed tolerance', () => {
    // E - e sin E must equal M after the solve, for the full range of M and for
    // Mercury's high eccentricity and Venus's near-circular orbit alike.
    for (const e of [0, 0.00677672, 0.04838624, 0.20563593]) {
      for (let k = 0; k < 24; k++) {
        const M = k * Math.PI / 12;
        const E = OE.solveKepler(M, e);
        expect(Math.abs(E - e * Math.sin(E) - M)).toBeLessThan(1e-12);
      }
    }
  });
});
