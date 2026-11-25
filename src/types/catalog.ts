/** A catalog record available to the Backer Concierge. */
export interface CatalogGame {
    id: number;
    title: string;
    description: string;
    category: string;
    publisher: string;
    starRating?: number;
    ratingLabel: string;
}

/** The deterministic, public catalog export used to ground assistant answers. */
export interface CatalogExport {
    source: string;
    note: string;
    gameCount: number;
    categories: string[];
    publishers: string[];
    games: CatalogGame[];
}
