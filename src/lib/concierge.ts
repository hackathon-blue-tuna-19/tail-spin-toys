import type { CatalogExport, CatalogGame } from '../types/catalog';

export interface ConciergeAnswer {
    message: string;
    games: CatalogGame[];
}

const stopWords = new Set([
    'a', 'about', 'am', 'and', 'any', 'are', 'can', 'for', 'game', 'games',
    'by', 'from', 'get', 'has', 'have', 'highest', 'i', 'in', 'is', 'like', 'looking',
    'me', 'of', 'people', 'please', 'pun', 'puns', 'rated', 'rating',
    'recommend', 'recommendation', 'show', 'something', 'star', 'stars', 'the',
    'to', 'top', 'want', 'what', 'which', 'who', 'with',
]);

const synonyms: Record<string, Array<{ term: string; weight: number }>> = {
    git: [
        { term: 'repo', weight: 4 },
        { term: 'repository', weight: 3 },
        { term: 'merge', weight: 2 },
        { term: 'branch', weight: 1 },
        { term: 'commit', weight: 1 },
    ],
};

function normalize(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
        .trim();
}

function unsupportedRequest(question: string): boolean {
    return /\b(funding|funded|fundraising|raised|backers?|pledges?|pledge tiers?|prices?|costs?|release dates?|release|launch dates?|player counts?|players?)\b/i.test(question);
}

function hasRatingIntent(question: string): boolean {
    return /\b(highest|top|best)\b/i.test(question) && /\b(rated?|rating|ratings|stars?)\b/i.test(question);
}

function scoreGame(game: CatalogGame, terms: string[]): number {
    const title = normalize(game.title);
    const metadata = normalize(`${game.category} ${game.publisher}`);
    const description = normalize(game.description);

    return terms.reduce((score, term) => {
        const variants = [{ term, weight: 5 }, ...(synonyms[term] ?? [])];
        return score + Math.max(
            ...variants.map(({ term: variant, weight }) => weight * (
                (title.includes(variant) ? 4 : 0) +
                (metadata.includes(variant) ? 3 : 0) +
                (description.includes(variant) ? 1 : 0)
            )),
        );
    }, 0);
}

function byRatingThenTitle(a: CatalogGame, b: CatalogGame): number {
    const ratingDifference = (b.starRating ?? -1) - (a.starRating ?? -1);
    return ratingDifference || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0);
}

/** Answer catalog questions using only exported Tailspin catalog fields. */
export function answerCatalogQuestion(question: string, catalog: CatalogExport): ConciergeAnswer {
    const normalizedQuestion = normalize(question);
    if (!normalizedQuestion) {
        return { message: 'What kind of game or theme are you looking for?', games: [] };
    }

    if (unsupportedRequest(question)) {
        return {
            message: 'The catalog does not track funding, backers, pledge tiers, prices, release dates, or player counts, so I can’t give a reliable answer. Which game category or theme interests you?',
            games: [],
        };
    }

    const category = catalog.categories.find((name) => normalizedQuestion.includes(normalize(name)));
    const publisher = catalog.publishers.find((name) => normalizedQuestion.includes(normalize(name)));
    let candidates = catalog.games.filter((game) =>
        (!category || normalize(game.category) === normalize(category)) &&
        (!publisher || normalize(game.publisher) === normalize(publisher)),
    );

    const terms = normalizedQuestion
        .split(' ')
        .filter((term) =>
            term.length > 1 &&
            !stopWords.has(term) &&
            !catalog.categories.some((name) => normalize(name) === term) &&
            !catalog.publishers.some((name) => normalize(name).split(' ').includes(term)),
        );

    if (terms.length > 0) {
        candidates = candidates.filter((game) => scoreGame(game, terms) > 0);
    }

    if (hasRatingIntent(question)) {
        const [game] = candidates.filter((entry) => entry.starRating !== undefined).sort(byRatingThenTitle);
        if (!game) {
            return {
                message: `I couldn’t find a rated${category ? ` ${category}` : ''}${publisher ? ` game from ${publisher}` : ''} matching that description. Which catalog category or theme would you like to explore?`,
                games: [],
            };
        }

        return {
            message: `The highest-rated${category ? ` ${category}` : ''}${publisher ? ` game from ${publisher}` : ' game'} listed is:`,
            games: [game],
        };
    }

    if (!category && !publisher && terms.length === 0) {
        return {
            message: 'What category or catalog theme should I look for?',
            games: [],
        };
    }

    const matches = candidates
        .map((game) => ({ game, score: scoreGame(game, terms) }))
        .sort((a, b) => b.score - a.score || (a.game.title < b.game.title ? -1 : a.game.title > b.game.title ? 1 : 0))
        .slice(0, 3)
        .map(({ game }) => game);

    if (matches.length === 0) {
        return {
            message: 'I couldn’t find a catalog match for that preference. Which category or catalog theme should I look for?',
            games: [],
        };
    }

    if (/\b(git|puns?)\b/i.test(question)) {
        return {
            message: 'The catalog does not label games as pun-focused. These titles reference repository, merge, or branch themes:',
            games: matches,
        };
    }

    return {
        message: category
            ? `Here are catalog matches in ${category}:`
            : publisher
                ? `Here are catalog matches from ${publisher}:`
                : 'Here are catalog matches for your question:',
        games: matches,
    };
}
