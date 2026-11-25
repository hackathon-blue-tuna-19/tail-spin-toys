/**
 * Pure ranking helpers for the Game Leaderboard canvas.
 *
 * Kept free of I/O so they can be unit-tested with Vitest
 * (see `leaderboard.test.mjs`).
 */

/**
 * @typedef {object} LeaderboardGame
 * @property {number} id
 * @property {string} title
 * @property {string} genre
 * @property {string} publisher
 * @property {number | null} starRating
 */

/**
 * @typedef {LeaderboardGame & { rank: number | null }} RankedGame
 */

/**
 * Distinct genre names, sorted alphabetically.
 *
 * @param {LeaderboardGame[]} games
 * @returns {string[]}
 */
export function listGenres(games) {
    return [...new Set(games.map((game) => game.genre))].sort((a, b) => a.localeCompare(b));
}

/**
 * Rank games by star rating (highest first), optionally filtered to one genre.
 *
 * Tied ratings share a rank using standard competition ranking (1, 2, 2, 4).
 * Ties are ordered by title for a stable display. Unrated games are placed
 * last with a `null` rank so they are never presented as ranked.
 *
 * @param {LeaderboardGame[]} games
 * @param {{ genre?: string | null }} [options]
 * @returns {RankedGame[]}
 */
export function rankGames(games, options = {}) {
    const genre = options.genre || null;
    const filtered = genre ? games.filter((game) => game.genre === genre) : games;
    const byTitle = (a, b) => a.title.localeCompare(b.title);

    const rated = filtered
        .filter((game) => typeof game.starRating === "number")
        .sort((a, b) => b.starRating - a.starRating || byTitle(a, b));
    const unrated = filtered.filter((game) => typeof game.starRating !== "number").sort(byTitle);

    /** @type {RankedGame[]} */
    const ranked = [];
    rated.forEach((game, index) => {
        const previous = ranked[index - 1];
        const rank = previous && previous.starRating === game.starRating ? previous.rank : index + 1;
        ranked.push({ ...game, rank });
    });

    return [...ranked, ...unrated.map((game) => ({ ...game, rank: null }))];
}
