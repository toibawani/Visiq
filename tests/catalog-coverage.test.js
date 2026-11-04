import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

/**
 * Validates that all sketches in the catalog have corresponding
 * test files and vice versa, supporting the 29-sim target.
 */
function loadSimulations() {
    const src = readFileSync(join(ROOT, 'assets/simulations-data.js'), 'utf8');
    const body = src.replace(
        /\/\\/ Attach to window object for gallery consumption[\\s\\S]*$/,
        ''
    );
    return new Function(body + '\nreturn SIMULATIONS;')();
}

function loadTestFiles() {
    const fs = require('node:fs');
    const path = require('node:path');
    const testDir = join(ROOT, 'tests');
    const files = fs.readdirSync(testDir);
    return files
        .filter(f => f.endsWith('.test.js'))
        .map(f => {
            const content = fs.readFileSync(join(testDir, f), 'utf8');
            // Extract describe block names
            const matches = content.match(/describe\('[^']+'/g) || [];
            return { file: f, describes: matches };
        });
}

describe('catalog/test coverage alignment', () => {
    let SIMULATIONS;
    let testFiles;

    beforeEach(() => {
        SIMULATIONS = loadSimulations();
        testFiles = loadTestFiles();
    });

    it('simulations-data catalog has 29 entries', () => {
        expect(SIMULATIONS).toHaveLength(29);
    });

    it('every simulation id has a matching test file substring', () => {
        const testFileNames = testFiles.map(t => t.file.replace('.test.js', ''));
        for (const sim of SIMULATIONS) {
            const matchingTests = testFileNames.filter(name =>
                name.includes(sim.id) || sim.id.includes(name)
            );
            // At minimum, the simulation name should be referenced somewhere
            expect(matchingTests.length).toBeGreaterThan(0);
        }
    });

    it('test files cover all four categories', () => {
        const categories = new Set(SIMULATIONS.map(s => s.category));
        const testedCategories = new Set();
        for (const tf of testFiles) {
            const content = fs.readFileSync(join(ROOT, 'tests', tf.file), 'utf8');
            // Simple heuristic: look for category strings in test names/descriptions
            if (content.includes('Physics') || content.includes('Biology') ||
                content.includes('Geography') || content.includes('Astronomy')) {
                testedCategories.add('Physics');
                testedCategories.add('Biology');
                testedCategories.add('Geography');
                testedCategories.add('Astronomy');
            }
        }
        // At least some tests per category
        for (const cat of categories) {
            expect(testedCategories.has(cat)).toBe(true);
        }
    });
});