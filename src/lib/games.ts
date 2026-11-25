import { eq, asc, count } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

export const GAMES_PER_PAGE = 6;

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

export interface GamesPage {
    games: Game[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

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
    const rows = await baseGamesQuery(db).orderBy(asc(games.title), asc(games.id));
    return rows.map(mapGame);
}

/** A page of games ordered by title, including the total number of pages. */
export async function getGamesPage(
    db: Database,
    page: number,
    pageSize: number,
): Promise<GamesPage> {
    if (!Number.isInteger(page) || page < 1) {
        throw new RangeError('page must be a positive integer');
    }
    if (!Number.isInteger(pageSize) || pageSize < 1) {
        throw new RangeError('pageSize must be a positive integer');
    }

    const [totalRow, rows] = await Promise.all([
        db.select({ count: count() }).from(games).get(),
        baseGamesQuery(db)
            .orderBy(asc(games.title), asc(games.id))
            .limit(pageSize)
            .offset((page - 1) * pageSize),
    ]);
    if (!totalRow) {
        throw new Error('Failed to count games for pagination');
    }

    return {
        games: rows.map(mapGame),
        page,
        pageSize,
        totalCount: totalRow.count,
        totalPages: Math.ceil(totalRow.count / pageSize),
    };
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db
        .select({ id: games.id })
        .from(games)
        .orderBy(asc(games.title), asc(games.id));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
