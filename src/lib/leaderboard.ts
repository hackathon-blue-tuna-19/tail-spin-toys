import type { Game } from '../types/game';

export interface RankedGame {
    game: Game;
    rank: number | null;
}

/**
 * Ranks games by star rating, assigning the same rank to rating ties.
 * Unrated games follow rated games and have no rank.
 */
export function rankGames(games: Game[]): RankedGame[] {
    const sortedGames = [...games].sort((left, right) => {
        if (left.starRating === null) {
            return right.starRating === null
                ? left.title.localeCompare(right.title) || left.id - right.id
                : 1;
        }
        if (right.starRating === null) return -1;

        return (
            right.starRating - left.starRating ||
            left.title.localeCompare(right.title) ||
            left.id - right.id
        );
    });

    let currentRank = 0;
    let previousRating: number | null = null;

    return sortedGames.map((game, index) => {
        if (game.starRating === null) return { game, rank: null };

        if (game.starRating !== previousRating) {
            currentRank = index + 1;
            previousRating = game.starRating;
        }

        return { game, rank: currentRank };
    });
}
