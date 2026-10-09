import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// StatsTracker touches window + document in its constructor (event listeners,
// drawer setup, querySelectorAll). Provide just enough of a DOM for it to
// construct, then exercise the pure persistence state transitions.
function makeDom() {
    const store = {};
    const listeners = { change: [] };
    return {
        _listeners: listeners,
        addEventListener: vi.fn((type, fn) => {
            (listeners[type] = listeners[type] || []).push(fn);
        }),
        querySelectorAll: () => [],
        getElementById: () => null,
        createElement: () => ({ style: {}, setAttribute: vi.fn(), appendChild: vi.fn() }),
        body: { appendChild: vi.fn() },
        _store: store,
    };
}

function loadStatsTracker() {
    const ls = (() => {
        let m = new Map();
        return {
            getItem: (k) => (m.has(k) ? m.get(k) : null),
            setItem: (k, v) => m.set(k, String(v)),
            removeItem: (k) => m.delete(k),
            _map: m,
        };
    })();
    global.localStorage = ls;
    global.window = { addEventListener: vi.fn(), location: { reload: vi.fn() } };
    global.document = makeDom();
    // StatsTracker is a plain class in a classic script; eval it to get the class.
    const fs = require('node:fs');
    const path = require('node:path');
    const src = fs.readFileSync(path.join(ROOT, 'assets/stats-tracker.js'), 'utf8');
    // Expose the class: wrap so we can capture it.
    const factory = new Function('localStorage', 'window', 'document', 'SIMULATIONS', src + '\n;return StatsTracker;');
    return { ls, StatsTracker: factory(ls, global.window, global.document, []) };
}

// Theme persistence helpers (mirror assets/theme-toggle.js storage key/logic).
const THEME_KEY = 'visiq-theme';
function readTheme(ls) {
    const v = ls.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : null;
}

describe('stats persistence (assets/stats-tracker.js)', () => {
    let ls;
    let StatsTracker;
    beforeEach(() => {
        ({ ls, StatsTracker } = loadStatsTracker());
    });

    it('adds a favorite, persists it, and survives a reload (new instance)', () => {
        const a = new StatsTracker();
        expect(a.addFavorite('pendulum-chaos')).toBe(true);
        // duplicate add is a no-op returning false
        expect(a.addFavorite('pendulum-chaos')).toBe(false);
        expect(a.stats.favoriteIds).toEqual(['pendulum-chaos']);

        // Simulate reload: fresh instance reads localStorage.
        const b = new StatsTracker();
        expect(b.stats.favoriteIds).toContain('pendulum-chaos');
        expect(b.stats.favoriteCount).toBe(1);
    });

    it('removes a favorite and persists the removal', () => {
        const a = new StatsTracker();
        a.addFavorite('galaxy-collision');
        expect(a.removeFavorite('galaxy-collision')).toBe(true);
        expect(a.stats.favoriteIds).toEqual([]);

        const b = new StatsTracker();
        expect(b.stats.favoriteIds).toEqual([]);
        expect(b.stats.favoriteCount).toBe(0);
    });

    it('records history (add), reloads, deletes one entry, and clears all', () => {
        const a = new StatsTracker();
        a.trackSimulationOpen('black-hole-orbit');
        a.trackSimulationOpen('star-lifecycle');
        // newest first, and no duplicates
        expect(a.stats.history.map((h) => h.id)).toEqual(['star-lifecycle', 'black-hole-orbit']);
        a.trackSimulationOpen('black-hole-orbit'); // moves to front, no dup
        expect(a.stats.history.map((h) => h.id)).toEqual(['black-hole-orbit', 'star-lifecycle']);

        // reload
        let b = new StatsTracker();
        expect(b.stats.history).toHaveLength(2);

        // delete one
        b.stats.history = b.stats.history.filter((h) => h.id !== 'star-lifecycle');
        b.saveStats();
        b = new StatsTracker();
        expect(b.stats.history.map((h) => h.id)).toEqual(['black-hole-orbit']);

        // clear all
        b.stats.history = [];
        b.saveStats();
        const c = new StatsTracker();
        expect(c.stats.history).toEqual([]);
    });
});

describe('theme persistence', () => {
    it('stores and restores the chosen theme; ignores garbage', () => {
        const { ls } = loadStatsTracker();
        expect(readTheme(ls)).toBeNull();
        ls.setItem(THEME_KEY, 'dark');
        expect(readTheme(ls)).toBe('dark');
        ls.setItem(THEME_KEY, 'light');
        expect(readTheme(ls)).toBe('light');
        ls.setItem(THEME_KEY, 'banana');
        expect(readTheme(ls)).toBeNull(); // falls back to system default
    });
});

describe('history reuse into the stats drawer (the VISIQ "command center")', () => {
    it('re-renders persisted history and re-opens a sim via openFromHistory', () => {
        const { StatsTracker } = loadStatsTracker();
        // Give document a real element for the drawer body so render runs.
        const bodyEl = { innerHTML: '', querySelector: () => null };
        global.document.getElementById = (id) => (id === 'drawer-body-content' ? bodyEl : null);

        const t = new StatsTracker();
        t.trackSimulationOpen('galaxy-collision');
        t.renderDrawerContent();
        expect(bodyEl.innerHTML).toContain('galaxy-collision');

        // New session (reload): history still renders.
        const t2 = new StatsTracker();
        t2.renderDrawerContent();
        expect(bodyEl.innerHTML).toContain('galaxy-collision');

        // Reusing a history entry delegates to gallery.openSimulation(id).
        const openSimulation = vi.fn();
        global.window.gallery = { openSimulation };
        t2.openFromHistory('galaxy-collision');
        expect(openSimulation).toHaveBeenCalledWith('galaxy-collision');
        expect(t2.isDrawerOpen).toBe(false); // drawer closed on reuse
    });
});


