import { describe, it, expect } from 'vitest';
import { MAX_QUESTION_LENGTH, normalizeQuestion, parseConciergeAnswer } from './concierge';

describe('normalizeQuestion', () => {
    it('trims and collapses whitespace', () => {
        expect(normalizeQuestion('  best   strategy\ngame ? ')).toBe('best strategy game ?');
    });

    it('rejects empty and over-long questions', () => {
        expect(normalizeQuestion('   ')).toBeNull();
        expect(normalizeQuestion('a'.repeat(MAX_QUESTION_LENGTH + 1))).toBeNull();
    });
});

describe('parseConciergeAnswer', () => {
    it('keeps valid fields and drops invalid recommendations and ratings', () => {
        const parsed = parseConciergeAnswer({
            answer: 'Try Merge Conflict.',
            recommendations: [
                { title: 'Merge Conflict', category: 'Strategy', publisher: 'Rebase Games', starRating: 4.5, reason: 'Git puns' },
                { title: 'No publisher', category: 'Strategy' },
                { title: 'Bad', category: 'X', publisher: 'Y', starRating: 9 },
            ],
            generalContext: ' Co-op games are popular. ',
        });

        expect(parsed?.recommendations).toEqual([
            { title: 'Merge Conflict', category: 'Strategy', publisher: 'Rebase Games', starRating: 4.5, reason: 'Git puns' },
            { title: 'Bad', category: 'X', publisher: 'Y', reason: '' },
        ]);
        expect(parsed?.generalContext).toBe('Co-op games are popular.');
        expect(parsed?.clarifyingQuestion).toBeUndefined();
    });

    it('returns null for unusable payloads', () => {
        expect(parseConciergeAnswer(null)).toBeNull();
        expect(parseConciergeAnswer([])).toBeNull();
        expect(parseConciergeAnswer({ answer: '  ' })).toBeNull();
    });
});
