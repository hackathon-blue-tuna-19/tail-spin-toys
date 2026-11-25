import { eq, asc } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game, PublisherDetails } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/** All games ordered by title. */
export async function getAllGames(db: Database): Promise<Game[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** All publisher ids ordered by publisher name. */
export async function getAllPublisherIds(db: Database): Promise<number[]> {
    const rows = await db
        .select({ id: publishers.id })
        .from(publishers)
        .orderBy(asc(publishers.name));
    return rows.map((row) => row.id);
}

/** A publisher by id, or null when it does not exist. */
export async function getPublisherById(
    db: Database,
    id: number,
): Promise<PublisherDetails | null> {
    const row = await db
        .select({
            id: publishers.id,
            name: publishers.name,
            description: publishers.description,
        })
        .from(publishers)
        .where(eq(publishers.id, id))
        .get();
    return row ?? null;
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}

/** All games for a publisher ordered by title. */
export async function getGamesByPublisherId(db: Database, publisherId: number): Promise<Game[]> {
    const rows = await baseGamesQuery(db)
        .where(eq(games.publisherId, publisherId))
        .orderBy(asc(games.title), asc(games.id));
    return rows.map(mapGame);
}
