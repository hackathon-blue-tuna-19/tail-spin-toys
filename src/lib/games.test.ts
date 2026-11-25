import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGamesPage,
    getGameCount,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    describe('pagination', () => {
        beforeEach(async () => {
            await seedGames(db, 5);
        });

        it('counts games', async () => {
            expect(await getGameCount(db)).toBe(5);
        });

        it('returns the requested page in title order', async () => {
            const result = await getGamesPage(db, 2, 2);
            expect(result.games.map((g) => g.title)).toEqual(['Game 03', 'Game 04']);
            expect(result).toMatchObject({ page: 2, pageSize: 2, totalGames: 5, totalPages: 3 });
        });

        it('returns a partial last page', async () => {
            const result = await getGamesPage(db, 3, 2);
            expect(result.games.map((g) => g.title)).toEqual(['Game 05']);
        });

        it('clamps out-of-range and invalid pages', async () => {
            expect((await getGamesPage(db, 99, 2)).page).toBe(3);
            expect((await getGamesPage(db, 0, 2)).page).toBe(1);
            expect((await getGamesPage(db, Number.NaN, 2)).page).toBe(1);
        });

        it('handles an empty catalog', async () => {
            const empty = await createTestDatabase();
            const result = await getGamesPage(empty);
            expect(result).toMatchObject({ games: [], page: 1, totalGames: 0, totalPages: 1 });
        });
    });
});
