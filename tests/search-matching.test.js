import { describe, it, expect } from 'vitest';

/**
 * Pure extraction of the card-matching logic used by SearchSystem.handleSearch.
 * A card matches when the query (lowercased) is a substring of the title,
 * description, or any tag.
 */
function matches(card, query) {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const title = (card.title || '').toLowerCase();
    const desc = (card.desc || '').toLowerCase();
    const tags = (card.tags || []).map((t) => String(t).toLowerCase());
    return title.includes(q) || desc.includes(q) || tags.some((tag) => tag.includes(q));
}

describe('search matching logic', () => {
    const card = {
        title: "Newton's Playground",
        desc: 'Drag masses and tweak gravity and friction to see F = ma in motion.',
        tags: ['forces', 'motion', 'friction', 'vectors', 'acceleration'],
    };

    it('matches an empty query (show all)', () => {
        expect(matches(card, '')).toBe(true);
        expect(matches(card, '   ')).toBe(true);
    });

    it('matches by title substring (case-insensitive)', () => {
        expect(matches(card, 'newton')).toBe(true);
        expect(matches(card, 'NEWTON')).toBe(true);
        expect(matches(card, 'Playground')).toBe(true);
        expect(matches(card, 'galileo')).toBe(false);
    });

    it('matches by description substring', () => {
        expect(matches(card, 'gravity')).toBe(true);
        expect(matches(card, 'F = ma')).toBe(true);
        expect(matches(card, 'quantum')).toBe(false);
    });

    it('matches by tag substring', () => {
        expect(matches(card, 'forces')).toBe(true);
        expect(matches(card, 'VECTORS')).toBe(true);
        expect(matches(card, 'magnetism')).toBe(false);
    });

    it('matches partial words (prefix)', () => {
        expect(matches(card, 'mot')).toBe(true); // 'motion'
        expect(matches(card, 'fric')).toBe(true); // 'friction'
        expect(matches(card, 'acc')).toBe(true); // 'acceleration'
    });

    it('does not match unrelated queries', () => {
        expect(matches(card, 'black hole')).toBe(false);
        expect(matches(card, 'enzyme')).toBe(false);
    });
});
