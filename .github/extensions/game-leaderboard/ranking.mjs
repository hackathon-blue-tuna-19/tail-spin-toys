/**
 * @typedef {{ id: number, title: string, category: string, publisher: string, starRating: number | null }} CatalogGame
 * @typedef {CatalogGame & { rank: number | null, tied: boolean }} RankedGame
 */

/**
 * Rank games by existing star rating (highest first). Equal ratings share a
 * rank (competition ranking: 1, 1, 3), and unrated games are listed last
 * without a rank. Optionally restricts results to a single genre (category).
 *
 * @param {CatalogGame[]} games
 * @param {string | null | undefined} genre
 * @returns {RankedGame[]}
 */
export function rankGames(games, genre) {
    const filtered = genre ? games.filter((game) => game.category === genre) : games;
    const byTitle = (a, b) => a.title.localeCompare(b.title);
    const rated = filtered.filter((game) => game.starRating !== null).sort((a, b) => b.starRating - a.starRating || byTitle(a, b));
    const unrated = filtered.filter((game) => game.starRating === null).sort(byTitle);

    /** @type {RankedGame[]} */
    const ranked = [];
    rated.forEach((game, index) => {
        const previous = ranked[index - 1];
        const rank = previous && previous.starRating === game.starRating ? previous.rank : index + 1;
        ranked.push({ ...game, rank, tied: false });
    });
    for (const game of ranked) {
        game.tied = ranked.filter((other) => other.rank === game.rank).length > 1;
    }
    return [...ranked, ...unrated.map((game) => ({ ...game, rank: null, tied: false }))];
}
