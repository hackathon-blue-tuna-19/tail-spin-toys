import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getAllPublisherIds,
    getGamesByPublisherId,
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

    it('returns publisher ids ordered by name', async () => {
        await db.insert(publishers).values([
            { name: 'Zulu Games', description: 'Zulu publisher' },
            { name: 'Alpha Games', description: 'Alpha publisher' },
        ]);

        const ids = await getAllPublisherIds(db);
        const publisherRows = await Promise.all(ids.map((id) => getPublisherById(db, id)));

        expect(publisherRows.map((publisher) => publisher?.name)).toEqual([
            'Alpha Games',
            'Zulu Games',
        ]);
    });

    it('returns publisher details or null when the publisher does not exist', async () => {
        const [publisher] = await db
            .insert(publishers)
            .values({ name: 'Pub One', description: 'Publisher description' })
            .returning({ id: publishers.id });

        await expect(getPublisherById(db, publisher.id)).resolves.toEqual({
            id: publisher.id,
            name: 'Pub One',
            description: 'Publisher description',
        });
        await expect(getPublisherById(db, 99999)).resolves.toBeNull();
    });

    it("returns only a publisher's games ordered by title", async () => {
        const [category] = await db
            .insert(categories)
            .values({ name: 'Strategy', description: 'Strategy games' })
            .returning({ id: categories.id });
        const [publisher] = await db
            .insert(publishers)
            .values({ name: 'Pub One', description: 'Publisher one' })
            .returning({ id: publishers.id });
        const [otherPublisher] = await db
            .insert(publishers)
            .values({ name: 'Pub Two', description: 'Publisher two' })
            .returning({ id: publishers.id });

        await db.insert(games).values([
            {
                title: 'Zulu Game',
                description: 'By Pub One',
                starRating: 4.2,
                categoryId: category.id,
                publisherId: publisher.id,
            },
            {
                title: 'Alpha Game',
                description: 'By Pub One',
                starRating: 4.2,
                categoryId: category.id,
                publisherId: publisher.id,
            },
            {
                title: 'Other Game',
                description: 'By Pub Two',
                starRating: 4.2,
                categoryId: category.id,
                publisherId: otherPublisher.id,
            },
        ]);

        const publisherGames = await getGamesByPublisherId(db, publisher.id);

        expect(publisherGames.map((game) => game.title)).toEqual(['Alpha Game', 'Zulu Game']);
        expect(publisherGames.every((game) => game.publisher?.id === publisher.id)).toBe(true);
        await expect(getGamesByPublisherId(db, 99999)).resolves.toEqual([]);
    });
});
