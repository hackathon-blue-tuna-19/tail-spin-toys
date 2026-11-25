import { eq, asc, count } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

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

export const DEFAULT_PAGE_SIZE = 9;

export interface GamesPage {
    games: Game[];
    page: number;
    pageSize: number;
    totalGames: number;
    totalPages: number;
}

/** Total number of games. */
export async function getGameCount(db: Database): Promise<number> {
    const row = await db.select({ total: count() }).from(games).get();
    return row?.total ?? 0;
}

/** One page of games ordered by title. Pages are 1-based; out-of-range values are clamped. */
export async function getGamesPage(
    db: Database,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<GamesPage> {
    const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
    const totalGames = await getGameCount(db);
    const totalPages = Math.max(1, Math.ceil(totalGames / size));
    const requested = Number.isInteger(page) ? page : 1;
    const current = Math.min(Math.max(requested, 1), totalPages);
    const rows = await baseGamesQuery(db)
        .orderBy(asc(games.title), asc(games.id))
        .limit(size)
        .offset((current - 1) * size);
    return { games: rows.map(mapGame), page: current, pageSize: size, totalGames, totalPages };
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
