/** Case-insensitive title match; a blank query matches everything. */
export function matchesTitle(title: string, query: string): boolean {
    const needle = query.trim().toLowerCase();
    return needle === '' || title.toLowerCase().includes(needle);
}
