/**
 * Pure ranking logic for the Game Leaderboard canvas.
 *
 * Games are ranked by their catalog star rating only. The catalog has no player
 * scores or live activity, so a rank is a ratings comparison, nothing more.
 *
 * This file deliberately uses only erasable TypeScript syntax and has no runtime
 * imports, so the canvas extension (`.github/extensions/game-leaderboard`) can
 * load it directly via Node's type stripping.
 */

import type { Game } from '../types/game';

/** Label used for games without a category. */
export const UNCATEGORIZED = 'Uncategorized';

/** A single leaderboard row. `rank` is null for unrated games. */
export interface LeaderboardEntry {
    rank: number | null;
    id: number;
    title: string;
    category: string;
    publisher: string | null;
    starRating: number | null;
}

/** Options for {@link buildLeaderboard}. */
export interface LeaderboardOptions {
    /** Only include games in this category (exact name match). Omit or empty for all. */
    category?: string | null;
}

function categoryName(game: Game): string {
    return game.category?.name ?? UNCATEGORIZED;
}

/** Distinct category names (including "Uncategorized" when needed), sorted ordinally. */
export function getLeaderboardCategories(games: Game[]): string[] {
    return [...new Set(games.map(categoryName))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Rank games by star rating (highest first) using competition ranking:
 * tied games share a rank and the next rank skips (1, 1, 3). Unrated games
 * (`starRating === null`) come last with a `null` rank. Ties are ordered by
 * title (ordinal) then id so the output is deterministic.
 */
export function buildLeaderboard(games: Game[], options: LeaderboardOptions = {}): LeaderboardEntry[] {
    const category = options.category ? options.category : null;
    const selected = category === null ? games : games.filter((game) => categoryName(game) === category);

    const sorted = [...selected].sort((a, b) => {
        if (a.starRating !== b.starRating) {
            if (a.starRating === null) return 1;
            if (b.starRating === null) return -1;
            return b.starRating - a.starRating;
        }
        if (a.title !== b.title) return a.title < b.title ? -1 : 1;
        return a.id - b.id;
    });

    const entries: LeaderboardEntry[] = [];
    let previousRating: number | null = null;
    let previousRank: number | null = null;

    sorted.forEach((game, index) => {
        let rank: number | null = null;
        if (game.starRating !== null) {
            rank = game.starRating === previousRating && previousRank !== null ? previousRank : index + 1;
            previousRating = game.starRating;
            previousRank = rank;
        }
        entries.push({
            rank,
            id: game.id,
            title: game.title,
            category: categoryName(game),
            publisher: game.publisher?.name ?? null,
            starRating: game.starRating,
        });
    });

    return entries;
}
