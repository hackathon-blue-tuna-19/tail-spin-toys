import { describe, expect, it } from 'vitest';
import { buildLeaderboard, listGenres } from './leaderboard.mjs';

const games = [
    { title: 'B', genre: 'Strategy', starRating: 4.5 },
    { title: 'A', genre: 'Strategy', starRating: 4.5 },
    { title: 'C', genre: 'Puzzle', starRating: 4 },
    { title: 'D', genre: 'Puzzle', starRating: null },
    { title: 'E', genre: 'Strategy', starRating: 3 },
];

describe('buildLeaderboard', () => {
    it('shares ranks for ties and skips the following rank', () => {
        expect(buildLeaderboard(games).map((g) => [g.title, g.rank])).toEqual([
            ['A', 1], ['B', 1], ['C', 3], ['E', 4], ['D', null],
        ]);
    });

    it('filters by genre and ranks within the filtered set', () => {
        expect(buildLeaderboard(games, 'Puzzle').map((g) => [g.title, g.rank])).toEqual([['C', 1], ['D', null]]);
    });

    it('lists unique sorted genres', () => {
        expect(listGenres(games)).toEqual(['Puzzle', 'Strategy']);
    });
});
