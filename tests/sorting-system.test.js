import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

function makeCard(title, id) {
    const body = {
        textContent: title,
        getAttribute: (attr) => (attr === 'onclick' && id ? `openSimulation('${id}')` : ''),
    };
    return {
        querySelector: () => body,
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        setAttribute: () => {},
        textContent: title,
        getAttribute: () => '',
    };
}

function loadSortingSystem() {
    const src = readFileSync(join(ROOT, 'assets/sorting-system.js'), 'utf8');
    const body = src.replace(
        /if \(document\.readyState === 'loading'\)[\s\S]*\}\s*\}\s*$/,
        ''
    );
    // Stub DOM so constructor + setupSorting() succeed without a real document.
    global.document = {
        querySelector: () => null,
        querySelectorAll: () => [],
        body: { classList: { contains: () => false } },
        addEventListener: () => {},
    };
    global.window = { statsTracker: undefined, addEventListener: () => {} };
    const factory = new Function('document', 'window', body + '\nreturn SortingSystem;');
    return factory(global.document, global.window);
}

describe('sorting system', () => {
    let SortingSystem;

    beforeEach(() => {
        SortingSystem = loadSortingSystem();
    });

    it('starts in default sort mode', () => {
        const inst = new SortingSystem();
        expect(inst.currentSort).toBe('default');
    });

    it('toggleSort cycles default -> used -> alpha -> default', () => {
        const inst = new SortingSystem();
        inst.toggleSort();
        expect(inst.currentSort).toBe('used');
        inst.toggleSort();
        expect(inst.currentSort).toBe('alpha');
        inst.toggleSort();
        expect(inst.currentSort).toBe('default');
    });

    it('getCardId extracts id from onclick attribute', () => {
        const inst = new SortingSystem();
        const card = makeCard('Test', 'pendulum-chaos');
        expect(inst.getCardId(card)).toBe('pendulum-chaos');
    });

    it('getCardId returns empty string when no onclick match', () => {
        const inst = new SortingSystem();
        const card = { querySelector: () => null };
        expect(inst.getCardId(card)).toBe('');
    });

    it('sortByMostUsed orders viewed cards by most recent first', () => {
        const inst = new SortingSystem();
        // simulationsViewed is oldest-first: newest appended to end (higher index = newer).
        const stats = ['c', 'a']; // c viewed first (oldest), a viewed after (newer); b never viewed
        const cards = [
            makeCard('First', 'a'),
            makeCard('Second', 'b'),
            makeCard('Third', 'c'),
        ];
        const sorted = [...cards].sort((ca, cb) => {
            const aId = inst.getCardId(ca);
            const bId = inst.getCardId(cb);
            const aIndex = stats.indexOf(aId);
            const bIndex = stats.indexOf(bId);
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return bIndex - aIndex;
        });
        // Newest (a, index 1) first, then c (index 0), then never-viewed b last.
        expect(sorted.map((c) => c.textContent)).toEqual(['First', 'Third', 'Second']);
    });

    it('sortByAlpha comparator orders titles ascending', () => {
        const inst = new SortingSystem();
        const cards = [
            makeCard('Beta Simulation', 'beta'),
            makeCard('Alpha Simulation', 'alpha'),
            makeCard('Gamma Simulation', 'gamma'),
        ];
        const sorted = [...cards].sort((ca, cb) => {
            const aTitle = ca.querySelector('.card-title').textContent.trim();
            const bTitle = cb.querySelector('.card-title').textContent.trim();
            return aTitle.localeCompare(bTitle);
        });
        expect(sorted.map((c) => c.textContent)).toEqual([
            'Alpha Simulation',
            'Beta Simulation',
            'Gamma Simulation',
        ]);
    });
});
