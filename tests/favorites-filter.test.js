import { describe, it, expect } from 'vitest';

/**
 * Pure extraction of FavoritesFilter card-visibility logic.
 * Returns 'flex' to show or 'none' to hide a card in favorites-only mode.
 */
function cardDisplay(isFavoritesMode, isFav) {
    if (isFavoritesMode) {
        return isFav ? 'flex' : 'none';
    }
    return 'flex';
}

describe('favorites filter visibility', () => {
    it('shows all cards when favorites mode is off', () => {
        expect(cardDisplay(false, true)).toBe('flex');
        expect(cardDisplay(false, false)).toBe('flex');
    });

    it('shows only favorited cards when favorites mode is on', () => {
        expect(cardDisplay(true, true)).toBe('flex');
        expect(cardDisplay(true, false)).toBe('none');
    });

    it('hides non-favorites and keeps favorites visible', () => {
        const cards = [
            { fav: true, expected: 'flex' },
            { fav: false, expected: 'none' },
            { fav: true, expected: 'flex' },
            { fav: false, expected: 'none' },
        ];
        for (const { fav, expected } of cards) {
            expect(cardDisplay(true, fav)).toBe(expected);
        }
    });
});
