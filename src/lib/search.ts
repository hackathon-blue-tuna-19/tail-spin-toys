/** Case-insensitive, whitespace-trimmed substring match on a title. An empty query matches everything. */
export function matchesTitle(title: string, query: string): boolean {
    const needle = query.trim().toLowerCase();
    return needle === '' || title.toLowerCase().includes(needle);
}

/** Filters items by title using {@link matchesTitle}. */
export function filterByTitle<T extends { title: string }>(items: T[], query: string): T[] {
    return items.filter((item) => matchesTitle(item.title, query));
}
