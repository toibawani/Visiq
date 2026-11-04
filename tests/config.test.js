import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

function loadConfig() {
    const src = readFileSync(join(ROOT, 'assets/config.js'), 'utf8');
    return new Function(src + '\nreturn { CONFIG, VERSION };')();
}

const { CONFIG, VERSION } = loadConfig();

describe('config defaults', () => {
    it('CONFIG exposes animation settings', () => {
        expect(CONFIG.animation).toBeDefined();
        expect(CONFIG.animation.frameRate).toBe(60);
        expect(typeof CONFIG.animation.easing).toBe('string');
        expect(typeof CONFIG.animation.transitionDuration).toBe('number');
    });

    it('CONFIG exposes a color palette', () => {
        expect(CONFIG.colors).toBeDefined();
        expect(typeof CONFIG.colors.accentPrimary).toBe('string');
        expect(typeof CONFIG.colors.textBright).toBe('string');
        expect(typeof CONFIG.colors.borderSubtle).toBe('string');
        // accent colors should be hex-ish
        expect(CONFIG.colors.accentPrimary).toMatch(/^#/);
    });

    it('CONFIG exposes physics defaults', () => {
        expect(CONFIG.physics).toBeDefined();
        expect(typeof CONFIG.physics.gravity).toBe('number');
        expect(typeof CONFIG.physics.damping).toBe('number');
        expect(typeof CONFIG.physics.friction).toBe('number');
        expect(CONFIG.physics.damping).toBeGreaterThan(0);
        expect(CONFIG.physics.damping).toBeLessThan(1);
    });

    it('CONFIG exposes canvas sizing defaults', () => {
        expect(CONFIG.canvas).toBeDefined();
        expect(typeof CONFIG.canvas.minWidth).toBe('number');
        expect(typeof CONFIG.canvas.minHeight).toBe('number');
        expect(CONFIG.canvas.minWidth).toBeGreaterThan(0);
        expect(CONFIG.canvas.minHeight).toBeGreaterThan(0);
    });

    it('VERSION exposes semantic version fields', () => {
        expect(VERSION.major).toBe(1);
        expect(VERSION.minor).toBe(0);
        expect(VERSION.patch).toBe(0);
        expect(typeof VERSION.name).toBe('string');
        expect(typeof VERSION.build).toBe('string');
    });

    it('VERSION credits the author and repository', () => {
        expect(VERSION.author).toBe('toibawani');
        expect(VERSION.email).toBe('toibawani14@gmail.com');
        expect(VERSION.repository).toContain('github.com/toibawani');
    });
});
