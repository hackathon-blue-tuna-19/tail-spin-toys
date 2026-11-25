export type GameSort = 'title-asc' | 'title-desc' | 'rating-desc';

export interface GameSortItem {
    id: number;
    title: string;
    starRating: number | null;
}

const titleCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function compareTitles(a: GameSortItem, b: GameSortItem): number {
    return titleCollator.compare(a.title, b.title) || a.id - b.id;
}

/** Sort games by title or rating. Unrated games sort last, then alphabetically. */
export function sortGames<T extends GameSortItem>(games: readonly T[], sort: GameSort): T[] {
    return [...games].sort((a, b) => {
        if (sort === 'title-asc') {
            return compareTitles(a, b);
        }

        if (sort === 'title-desc') {
            return -titleCollator.compare(a.title, b.title) || a.id - b.id;
        }

        if (a.starRating === null && b.starRating !== null) {
            return 1;
        }
        if (a.starRating !== null && b.starRating === null) {
            return -1;
        }

        if (a.starRating !== null && b.starRating !== null) {
            const ratingOrder = b.starRating - a.starRating;
            if (ratingOrder !== 0) {
                return ratingOrder;
            }
        }

        return compareTitles(a, b);
    });
}
