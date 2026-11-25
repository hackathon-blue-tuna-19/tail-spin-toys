import { describe, it, expect } from 'vitest';
// The canvas extension is plain ESM JavaScript; its ranking logic is tested here.
import { rankGames } from '../../.github/extensions/game-leaderboard/ranking.mjs';

interface Game {
    id: number;
    title: string;
    category: string;
    publisher: string;
    starRating: number | null;
}

const game = (id: number, title: string, starRating: number | null, category = 'Strategy'): Game => ({
    id,
    title,
    category,
    publisher: 'Pub',
    starRating,
});

describe('rankGames', () => {
    it('sorts by rating, shares ranks for ties, and places unrated games last', () => {
        const ranked = rankGames(
            [game(1, 'B', 4), game(2, 'Unrated', null), game(3, 'A', 4), game(4, 'Top', 5), game(5, 'Low', 3)],
            null,
        );
        expect(ranked.map((g) => [g.title, g.rank])).toEqual([
            ['Top', 1],
            ['A', 2],
            ['B', 2],
            ['Low', 4],
            ['Unrated', null],
        ]);
        expect(ranked.find((g) => g.title === 'A')).toMatchObject({ tied: true });
        expect(ranked.find((g) => g.title === 'Top')).toMatchObject({ tied: false });
    });

    it('filters by genre and ranks within it', () => {
        const ranked = rankGames([game(1, 'A', 3), game(2, 'B', 5, 'Puzzle'), game(3, 'C', 4, 'Puzzle')], 'Puzzle');
        expect(ranked.map((g) => [g.title, g.rank])).toEqual([
            ['B', 1],
            ['C', 2],
        ]);
    });
});
