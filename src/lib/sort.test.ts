import { describe, it, expect } from 'vitest';
import { sortGames } from './sort';

const items = [
    { title: 'banana', starRating: 3 },
    { title: 'Cherry', starRating: null },
    { title: 'Apple', starRating: 4.5 },
    { title: 'Avocado', starRating: 3 },
];

describe('sortGames', () => {
    it('sorts by title A–Z, case-insensitively', () => {
        expect(sortGames(items, 'title-asc').map((i) => i.title)).toEqual(['Apple', 'Avocado', 'banana', 'Cherry']);
    });

    it('sorts by title Z–A', () => {
        expect(sortGames(items, 'title-desc').map((i) => i.title)).toEqual(['Cherry', 'banana', 'Avocado', 'Apple']);
    });

    it('sorts by rating highest first, ties by title, unrated last', () => {
        expect(sortGames(items, 'rating-desc').map((i) => i.title)).toEqual(['Apple', 'Avocado', 'banana', 'Cherry']);
    });

    it('does not mutate the input', () => {
        const copy = [...items];
        sortGames(items, 'title-desc');
        expect(items).toEqual(copy);
    });
});
