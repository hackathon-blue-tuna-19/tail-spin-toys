import { describe, expect, it } from 'vitest';
import { answerCatalogQuestion } from './concierge';
import type { CatalogExport } from '../types/catalog';

const catalog: CatalogExport = {
    source: 'Tailspin Toys crowdfunding catalog',
    note: 'Catalog facts only.',
    gameCount: 3,
    categories: ['Puzzle', 'Strategy'],
    publishers: ['CodeForge Studios', 'GitHub Games'],
    games: [
        {
            id: 1,
            title: 'Repo Rulers',
            description: 'Repository management and strategy.',
            category: 'Strategy',
            publisher: 'GitHub Games',
            starRating: 4.2,
            ratingLabel: '★★★★',
        },
        {
            id: 2,
            title: 'Merge Conflict Mystery',
            description: 'A puzzle about code merges.',
            category: 'Puzzle',
            publisher: 'CodeForge Studios',
            starRating: 4.8,
            ratingLabel: '★★★★★',
        },
        {
            id: 3,
            title: 'Branch Tactics',
            description: 'A strategy game.',
            category: 'Strategy',
            publisher: 'CodeForge Studios',
            ratingLabel: 'Not yet rated',
        },
    ],
};

describe('answerCatalogQuestion', () => {
    it('recommends only matching catalog games for a free-text theme', () => {
        const answer = answerCatalogQuestion('Which game suits people who like git puns?', catalog);

        expect(answer.games.map((game) => game.title)).toEqual(['Repo Rulers', 'Merge Conflict Mystery', 'Branch Tactics']);
        expect(answer.message).toContain('does not label games as pun-focused');
    });

    it('returns the highest-rated game in the requested category', () => {
        const answer = answerCatalogQuestion('What is the highest rated strategy game?', catalog);

        expect(answer.games.map((game) => game.title)).toEqual(['Repo Rulers']);
        expect(answer.message).toContain('highest-rated Strategy');
    });

    it('applies publisher filters before comparing ratings', () => {
        const answer = answerCatalogQuestion('What is the highest rated game from CodeForge Studios?', catalog);

        expect(answer.games.map((game) => game.title)).toEqual(['Merge Conflict Mystery']);
        expect(answer.message).toContain('from CodeForge Studios');
    });

    it('asks instead of ignoring an unmatched rating constraint', () => {
        const answer = answerCatalogQuestion('What is the highest rated cozy game?', catalog);

        expect(answer.games).toEqual([]);
        expect(answer.message.match(/\?/g)).toHaveLength(1);
    });

    it('does not guess at information absent from the catalog', () => {
        const answer = answerCatalogQuestion('How many backers does Repo Rulers have?', catalog);

        expect(answer.games).toEqual([]);
        expect(answer.message).toContain('does not track funding, backers');
        expect(answer.message).toContain('?');
    });

    it('asks one clarifying question when the request is vague or unmatched', () => {
        const vague = answerCatalogQuestion('Recommend a game', catalog);
        const unmatched = answerCatalogQuestion('I want a cozy farming game', catalog);

        expect(vague.games).toEqual([]);
        expect(vague.message.match(/\?/g)).toHaveLength(1);
        expect(unmatched.games).toEqual([]);
        expect(unmatched.message.match(/\?/g)).toHaveLength(1);
    });
});
