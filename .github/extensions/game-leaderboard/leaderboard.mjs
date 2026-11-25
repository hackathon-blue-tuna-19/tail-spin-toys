import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Resolve the local SQLite file, honouring the same DATABASE_URL convention as the app. */
export function databasePath() {
    const url = process.env.DATABASE_URL ?? "file:tailspin.db";
    if (!url.startsWith("file:")) {
        throw new Error("DATABASE_URL must be a local file: URL.");
    }
    const filePath = url.startsWith("file://") ? fileURLToPath(url) : url.slice("file:".length);
    return resolve(PROJECT_ROOT, filePath);
}

function withDatabase(callback) {
    let database;
    try {
        database = new DatabaseSync(databasePath(), { readOnly: true });
    } catch {
        throw new Error("Could not open the local database. Run `npm run db:setup` first.");
    }
    try {
        return callback(database);
    } finally {
        database.close();
    }
}

function genreNames(database) {
    return database.prepare("SELECT name FROM categories ORDER BY name COLLATE NOCASE").all().map((row) => row.name);
}

/** Genres (categories) available for filtering, ordered by name. */
export function listGenres() {
    return withDatabase(genreNames);
}

/**
 * Rank games by star rating. Tied ratings share a rank (1, 2, 2, 4), and unrated
 * games are listed last with a null rank. Ranks are computed within the filtered set.
 */
export function rankGames(games) {
    const rated = games
        .filter((game) => game.starRating !== null)
        .sort((a, b) => b.starRating - a.starRating || a.title.localeCompare(b.title));
    const unrated = games
        .filter((game) => game.starRating === null)
        .sort((a, b) => a.title.localeCompare(b.title));

    let previous = null;
    let previousRank = 0;
    const rankedGames = rated.map((game, index) => {
        const rank = game.starRating === previous ? previousRank : index + 1;
        previous = game.starRating;
        previousRank = rank;
        return { ...game, rank };
    });

    return [...rankedGames, ...unrated.map((game) => ({ ...game, rank: null }))];
}

/** Build the leaderboard, optionally limited to one genre. Unknown genres are rejected. */
export function getLeaderboard(genre) {
    return withDatabase((database) => {
        const genres = genreNames(database);
        if (genre && !genres.includes(genre)) {
            throw new RangeError(`Unknown genre "${genre}".`);
        }

        const rows = database
            .prepare(
                `SELECT games.id AS id, games.title AS title, games.star_rating AS starRating,
                        categories.name AS genre, publishers.name AS publisher
                 FROM games
                 JOIN categories ON categories.id = games.category_id
                 JOIN publishers ON publishers.id = games.publisher_id
                 WHERE ?1 IS NULL OR categories.name = ?1`,
            )
            .all(genre || null)
            .map((row) => ({ ...row }));

        return { genre: genre || null, genres, entries: rankGames(rows) };
    });
}
