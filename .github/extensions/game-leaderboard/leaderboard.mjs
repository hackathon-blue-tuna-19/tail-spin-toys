/**
 * Ranks games by star rating using standard competition ranking ("1224"):
 * tied ratings share a rank and unrated games are listed last, unranked.
 * Ranks are computed within the filtered set.
 */
export function buildLeaderboard(games, genre) {
    const filtered = genre ? games.filter((game) => game.genre === genre) : games;
    const byTitle = (a, b) => a.title.localeCompare(b.title);
    const rated = filtered.filter((game) => typeof game.starRating === "number").sort((a, b) => b.starRating - a.starRating || byTitle(a, b));
    const unrated = filtered.filter((game) => typeof game.starRating !== "number").sort(byTitle);

    let lastRating = null;
    let lastRank = 0;
    const entries = rated.map((game, index) => {
        if (game.starRating !== lastRating) {
            lastRating = game.starRating;
            lastRank = index + 1;
        }
        return { ...game, rank: lastRank };
    });
    return [...entries, ...unrated.map((game) => ({ ...game, rank: null }))];
}

export function listGenres(games) {
    return [...new Set(games.map((game) => game.genre).filter(Boolean))].sort();
}
