import type { Game } from '../types/game';

/**
 * Pure formatting helpers for game star ratings.
 *
 * Kept framework-free and side-effect-free so the logic is unit-testable
 * without the Astro runtime (see `ratings.test.ts`). Consumed by the
 * `StarRating.astro` component and the game leaderboard.
 */

export interface RankedGame {
    game: Game;
    rank: number | null;
}

/**
 * Sorts games by catalog rating, sharing ranks for ties and putting unrated
 * games last. Tied games are ordered by title for deterministic output.
 */
export function rankGames(games: Game[]): RankedGame[] {
    const sortedGames = [...games].sort((left, right) => {
        if (left.starRating === null && right.starRating !== null) return 1;
        if (left.starRating !== null && right.starRating === null) return -1;
        if (left.starRating !== right.starRating) {
            return (right.starRating ?? 0) - (left.starRating ?? 0);
        }
        return left.title < right.title ? -1 : left.title > right.title ? 1 : 0;
    });

    let previousRating: number | null = null;
    let previousRank = 0;

    return sortedGames.map((game, index) => {
        if (game.starRating === null) {
            return { game, rank: null };
        }

        if (game.starRating !== previousRating) {
            previousRank = index + 1;
            previousRating = game.starRating;
        }

        return { game, rank: previousRank };
    });
}

/**
 * Clamps a rating into the displayable 0–5 range.
 */
export function clampRating(rating: number): number {
    return Math.min(5, Math.max(0, rating));
}

/**
 * Builds a star glyph string for a rating between 0 and 5.
 *
 * Renders full (★), an optional half (½) and empty (☆) stars. Returns
 * `'Not yet rated'` when the rating is `null`. Ratings are clamped to the
 * 0–5 range so the output always contains exactly five star positions.
 */
export function formatStarRating(rating: number | null): string {
    if (rating === null) return 'Not yet rated';

    const clamped = clampRating(rating);
    const fullStars = Math.floor(clamped);
    const halfStar = clamped % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);
}
