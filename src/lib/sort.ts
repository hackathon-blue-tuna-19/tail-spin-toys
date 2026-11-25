export type SortOption = 'title-asc' | 'title-desc' | 'rating-desc';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'title-asc', label: 'Title (A–Z)' },
    { value: 'title-desc', label: 'Title (Z–A)' },
    { value: 'rating-desc', label: 'Rating (highest first)' },
];

export interface Sortable {
    title: string;
    starRating: number | null;
}

function compareTitles(a: Sortable, b: Sortable): number {
    return a.title.localeCompare(b.title, 'en', { sensitivity: 'base' });
}

/**
 * Returns a sorted copy of the items.
 * Rating sort: highest first; unrated items (null) come last; ties are broken by title A–Z.
 */
export function sortGames<T extends Sortable>(items: readonly T[], option: SortOption): T[] {
    const copy = [...items];
    switch (option) {
        case 'title-desc':
            return copy.sort((a, b) => compareTitles(b, a));
        case 'rating-desc':
            return copy.sort((a, b) => {
                if (a.starRating === null && b.starRating === null) return compareTitles(a, b);
                if (a.starRating === null) return 1;
                if (b.starRating === null) return -1;
                return b.starRating - a.starRating || compareTitles(a, b);
            });
        case 'title-asc':
        default:
            return copy.sort(compareTitles);
    }
}
