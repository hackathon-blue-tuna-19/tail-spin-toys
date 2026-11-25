import { describe, it, expect } from 'vitest';
import type { Game } from '../types/game';
import { rankGames } from './leaderboard';

function createGame(id: number, title: string, starRating: number | null): Game {
    return {
        id,
        title,
        description: '',
        starRating,
        category: null,
        publisher: null,
    };
}

describe('rankGames', () => {
    it('sorts by rating and assigns competition ranks to ties', () => {
        const games = [
            createGame(1, 'Lower Rated', 3.5),
            createGame(2, 'Zeta', 4.5),
            createGame(3, 'Alpha', 4.5),
            createGame(4, 'Next Rank', 4),
        ];

        const ranked = rankGames(games);

        expect(ranked.map(({ game, rank }) => [game.title, rank])).toEqual([
            ['Alpha', 1],
            ['Zeta', 1],
            ['Next Rank', 3],
            ['Lower Rated', 4],
        ]);
    });

    it('places unrated games last without assigning them a rank', () => {
        const ranked = rankGames([
            createGame(1, 'Unrated Z', null),
            createGame(2, 'Rated', 4),
            createGame(3, 'Unrated A', null),
        ]);

        expect(ranked.map(({ game, rank }) => [game.title, rank])).toEqual([
            ['Rated', 1],
            ['Unrated A', null],
            ['Unrated Z', null],
        ]);
    });

    it('does not mutate the input and handles an empty list', () => {
        const games = [createGame(1, 'Game', 4)];

        expect(rankGames(games)).not.toBe(games);
        expect(games[0].title).toBe('Game');
        expect(rankGames([])).toEqual([]);
    });
});
