import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

function loadSimulations() {
    const src = readFileSync(join(ROOT, 'assets/simulations-data.js'), 'utf8');
    // The file ends with: window.SIMULATIONS = SIMULATIONS;
    // Strip that line and return SIMULATIONS directly from the eval'd body.
    const body = src.replace(/\/\/ Attach to window object for gallery consumption[\s\S]*$/, '');
    return new Function(body + '\nreturn SIMULATIONS;')();
}

const REQUIRED = [
    'id', 'title', 'category', 'icon', 'difficulty',
    'description', 'longDescription', 'tags', 'learningOutcomes', 'estimatedTime'
];
const CATEGORIES = new Set(['Physics', 'Biology', 'Geography', 'Astronomy']);
const DIFFICULTIES = new Set(['Beginner', 'Intermediate', 'Advanced']);

describe('simulations-data catalog schema', () => {
    let SIMULATIONS;

    beforeEach(() => {
        SIMULATIONS = loadSimulations();
    });

    it('loads a non-empty catalog', () => {
        expect(Array.isArray(SIMULATIONS)).toBe(true);
        expect(SIMULATIONS.length).toBeGreaterThan(0);
    });

    it('every simulation has all required fields', () => {
        for (const sim of SIMULATIONS) {
            for (const field of REQUIRED) {
                expect(sim).toHaveProperty(field);
            }
        }
    });

    it('every id is a unique kebab-case slug', () => {
        const ids = SIMULATIONS.map(s => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) {
            expect(typeof id).toBe('string');
            expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        }
    });

    it('every category is one of the four valid categories', () => {
        for (const sim of SIMULATIONS) {
            expect(CATEGORIES.has(sim.category)).toBe(true);
        }
    });

    it('every difficulty is one of Beginner/Intermediate/Advanced', () => {
        for (const sim of SIMULATIONS) {
            expect(DIFFICULTIES.has(sim.difficulty)).toBe(true);
        }
    });

    it('every category has at least one simulation', () => {
        for (const cat of CATEGORIES) {
            expect(SIMULATIONS.some(s => s.category === cat)).toBe(true);
        }
    });

    it('every simulation id matches an existing sketch file', () => {
        const fs = require('node:fs');
        const path = require('node:path');
        const sketchDir = join(ROOT, 'sketches');
        const files = fs.readdirSync(sketchDir);
        for (const sim of SIMULATIONS) {
            expect(files).toContain(`${sim.id}.js`);
        }
    });

    it('tags and learningOutcomes are non-empty arrays of strings', () => {
        for (const sim of SIMULATIONS) {
            expect(Array.isArray(sim.tags)).toBe(true);
            expect(sim.tags.length).toBeGreaterThan(0);
            for (const tag of sim.tags) expect(typeof tag).toBe('string');

            expect(Array.isArray(sim.learningOutcomes)).toBe(true);
            expect(sim.learningOutcomes.length).toBeGreaterThan(0);
            for (const outcome of sim.learningOutcomes) {
                expect(typeof outcome).toBe('string');
                expect(outcome.length).toBeGreaterThan(0);
            }
        }
    });

    it('descriptions and titles are non-empty strings', () => {
        for (const sim of SIMULATIONS) {
            expect(typeof sim.title).toBe('string');
            expect(sim.title.length).toBeGreaterThan(0);
            expect(typeof sim.description).toBe('string');
            expect(sim.description.length).toBeGreaterThan(0);
            expect(typeof sim.longDescription).toBe('string');
            expect(sim.longDescription.length).toBeGreaterThan(0);
        }
    });
});
