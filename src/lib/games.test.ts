import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGamesByPublisher,
    getAllPublisherIds,
    getPublisherById,
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
});

describe('publisher helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns only the given publisher\'s games ordered by title, plus publisher lookups', async () => {
        const [category] = await db.insert(categories).values({ name: 'Cat' }).returning({ id: categories.id });
        const [a] = await db.insert(publishers).values({ name: 'A Pub', description: 'About A' }).returning({ id: publishers.id });
        const [b] = await db.insert(publishers).values({ name: 'B Pub' }).returning({ id: publishers.id });
        for (const [title, publisherId] of [['Zed', a.id], ['Alpha', a.id], ['Other', b.id]] as const) {
            await db.insert(games).values({ title, description: 'd', categoryId: category.id, publisherId });
        }

        const result = await getGamesByPublisher(db, a.id);
        expect(result.map((g) => g.title)).toEqual(['Alpha', 'Zed']);
        expect(await getGamesByPublisher(db, 9999)).toEqual([]);
        expect(await getAllPublisherIds(db)).toEqual([a.id, b.id]);
        expect(await getPublisherById(db, a.id)).toEqual({ id: a.id, name: 'A Pub', description: 'About A' });
        expect(await getPublisherById(db, 9999)).toBeNull();
    });
});
