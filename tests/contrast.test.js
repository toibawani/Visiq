import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(extra = []) {
    const out = execFileSync('node', [join(ROOT, 'scripts', 'check-contrast.mjs'), ...extra], {
        encoding: 'utf8',
        cwd: ROOT,
    });
    return JSON.parse(out);
}

describe('stage-2 contrast gate', () => {
    it('passes AA on every pair this build renders', () => {
        const report = run();
        const fails = report.rows.filter(r => !r.pass);
        expect(fails, JSON.stringify(fails, null, 2)).toEqual([]);
        expect(report.passed).toBe(report.pairs);
        expect(report.pairs).toBeGreaterThan(0);
    });

    it('goes red when a token breaks (negative control)', () => {
        expect(() => run(['--break'])).toThrow();
    });
});
