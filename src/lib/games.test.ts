import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGamesPage,
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

    it('returns the requested page with stable ordering and pagination metadata', async () => {
        await seedGames(db, 5);

        const page = await getGamesPage(db, 2, 2);

        expect(page.games.map((game) => game.title)).toEqual(['Game 03', 'Game 04']);
        expect(page).toMatchObject({
            page: 2,
            pageSize: 2,
            totalCount: 5,
            totalPages: 3,
        });
    });

    it('returns an empty page when the requested page is past the end', async () => {
        await seedGames(db, 2);

        const page = await getGamesPage(db, 3, 2);

        expect(page.games).toEqual([]);
        expect(page.totalPages).toBe(1);
    });

    it('returns zero pages for an empty catalog', async () => {
        const page = await getGamesPage(db, 1, 2);

        expect(page.games).toEqual([]);
        expect(page.totalCount).toBe(0);
        expect(page.totalPages).toBe(0);
    });

    it.each([
        [0, 2],
        [1.5, 2],
        [1, 0],
        [1, 1.5],
    ])('rejects invalid page arguments (%s, %s)', async (page, pageSize) => {
        await expect(getGamesPage(db, page, pageSize)).rejects.toThrow(RangeError);
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
});
