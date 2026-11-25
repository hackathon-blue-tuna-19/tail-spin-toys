import { describe, expect, it } from 'vitest';
import { sortGames, type GameSortItem } from './game-sort';

const games: GameSortItem[] = [
    { id: 1, title: 'The Zebra Game', starRating: 4.8 },
    { id: 2, title: 'Alpha Quest', starRating: 4.8 },
    { id: 3, title: 'Middle Game', starRating: 3.9 },
    { id: 4, title: 'Beta Quest', starRating: null },
    { id: 5, title: 'Another Unrated Game', starRating: null },
];

describe('sortGames', () => {
    it('sorts titles A-Z and Z-A without mutating the input', () => {
        expect(sortGames(games, 'title-asc').map((game) => game.title)).toEqual([
            'Alpha Quest',
            'Another Unrated Game',
            'Beta Quest',
            'Middle Game',
            'The Zebra Game',
        ]);
        expect(sortGames(games, 'title-desc').map((game) => game.title)).toEqual([
            'The Zebra Game',
            'Middle Game',
            'Beta Quest',
            'Another Unrated Game',
            'Alpha Quest',
        ]);
        expect(games[0].title).toBe('The Zebra Game');
    });

    it('sorts rated games highest first and places unrated games last alphabetically', () => {
        expect(sortGames(games, 'rating-desc').map((game) => game.title)).toEqual([
            'Alpha Quest',
            'The Zebra Game',
            'Middle Game',
            'Another Unrated Game',
            'Beta Quest',
        ]);
    });

    it('sorts an empty list', () => {
        expect(sortGames([], 'rating-desc')).toEqual([]);
    });
});
