import { describe, it, expect } from 'vitest';
import { buildLeaderboard, getLeaderboardCategories } from './leaderboard';
import type { Game } from '../types/game';

function game(id: number, title: string, starRating: number | null, category: string | null = 'Action'): Game {
    return {
        id,
        title,
        description: '',
        starRating,
        category: category === null ? null : { id: 1, name: category },
        publisher: null,
    };
}

describe('buildLeaderboard', () => {
    it('orders games by rating descending', () => {
        const result = buildLeaderboard([game(1, 'A', 3), game(2, 'B', 5), game(3, 'C', 4)]);
        expect(result.map((entry) => entry.title)).toEqual(['B', 'C', 'A']);
        expect(result.map((entry) => entry.rank)).toEqual([1, 2, 3]);
    });

    it('uses competition ranking for ties (1, 1, 3)', () => {
        const result = buildLeaderboard([game(1, 'A', 4.5), game(2, 'B', 4.5), game(3, 'C', 4)]);
        expect(result.map((entry) => entry.rank)).toEqual([1, 1, 3]);
    });

    it('places unrated games last with no rank, even when ratings are 0', () => {
        const result = buildLeaderboard([game(1, 'Unrated', null), game(2, 'Zero', 0), game(3, 'Top', 5)]);
        expect(result.map((entry) => [entry.title, entry.rank])).toEqual([
            ['Top', 1],
            ['Zero', 2],
            ['Unrated', null],
        ]);
    });

    it('filters by category and ranks within the filtered set', () => {
        const games = [game(1, 'A', 5, 'Action'), game(2, 'B', 3, 'Puzzle'), game(3, 'C', 4, 'Puzzle')];
        const result = buildLeaderboard(games, { category: 'Puzzle' });
        expect(result.map((entry) => [entry.title, entry.rank])).toEqual([
            ['C', 1],
            ['B', 2],
        ]);
    });

    it('treats games without a category as Uncategorized', () => {
        const games = [game(1, 'A', 2, null), game(2, 'B', 3, 'Action')];
        expect(buildLeaderboard(games, { category: 'Uncategorized' }).map((entry) => entry.id)).toEqual([1]);
    });

    it('is deterministic for tied games and does not mutate input', () => {
        const games = [game(2, 'B', 4), game(1, 'A', 4)];
        expect(buildLeaderboard(games).map((entry) => entry.title)).toEqual(['A', 'B']);
        expect(games.map((g) => g.id)).toEqual([2, 1]);
    });
});

describe('getLeaderboardCategories', () => {
    it('returns distinct sorted categories', () => {
        const games = [game(1, 'A', 1, 'Puzzle'), game(2, 'B', 1, 'Action'), game(3, 'C', 1, 'Puzzle'), game(4, 'D', 1, null)];
        expect(getLeaderboardCategories(games)).toEqual(['Action', 'Puzzle', 'Uncategorized']);
    });
});
