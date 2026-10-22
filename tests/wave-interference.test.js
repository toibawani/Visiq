import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const loadWaveInterference = () => {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(new URL('../sketches/wave-interference.js', import.meta.url), 'utf8'),
    sandbox
  );
  return sandbox;
};

describe('wave-interference: computeInterference (pure pixel helper)', () => {
  it('matches a brute-force reference for a single pixel', () => {
    const { computeInterference } = loadWaveInterference();
    const x = 137;
    const y = 64;
    const s1 = { x: 100, y: 80 };
    const s2 = { x: 520, y: 160 };
    const k = 0.347;
    const omegaTime = 4.2;
    const phaseRad = 0.8;

    const { a1, a2 } = computeInterference(x, y, s1, s2, k, omegaTime, phaseRad);

    const ref1 = Math.sin(k * Math.sqrt((x - s1.x) ** 2 + (y - s1.y) ** 2) - omegaTime);
    const ref2 =
      Math.sin(k * Math.sqrt((x - s2.x) ** 2 + (y - s2.y) ** 2) - omegaTime + phaseRad);

    expect(a1).toBeCloseTo(ref1, 12);
    expect(a2).toBeCloseTo(ref2, 12);
  });

  it('matches the original inline loop over a synthetic grid', () => {
    const { computeInterference } = loadWaveInterference();
    const s1 = { x: 0, y: 0 };
    const s2 = { x: 600, y: 360 };
    const k = 0.13;
    const omegaTime = 2.0;
    const phaseRad = 1.0;

    let mismatches = 0;
    for (let gy = 0; gy < 128; gy++) {
      for (let gx = 0; gx < 128; gx++) {
        const x = gx * 3;
        const y = gy * 3;
        const { a1, a2 } = computeInterference(x, y, s1, s2, k, omegaTime, phaseRad);

        const d1 = Math.sqrt(x * x + y * y);
        const d2 = Math.sqrt((x - s2.x) ** 2 + (y - s2.y) ** 2);

        const exp1 = Math.sin(k * d1 - omegaTime);
        const exp2 = Math.sin(k * d2 - omegaTime + phaseRad);

        if (Math.abs(a1 - exp1) > 1e-12 || Math.abs(a2 - exp2) > 1e-12) {
          mismatches++;
        }
      }
    }
    expect(mismatches).toBe(0);
  });
});
