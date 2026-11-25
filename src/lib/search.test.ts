import { describe, it, expect } from 'vitest';
import { matchesTitle, filterByTitle } from './search';

describe('matchesTitle', () => {
    it('matches case-insensitively', () => {
        expect(matchesTitle('Pipeline Panic', 'pIPE')).toBe(true);
    });

    it('trims the query and matches everything when empty', () => {
        expect(matchesTitle('Anything', '   ')).toBe(true);
        expect(matchesTitle('Pipeline Panic', '  panic ')).toBe(true);
    });

    it('rejects non-matching titles', () => {
        expect(matchesTitle('Pipeline Panic', 'zzz')).toBe(false);
    });
});

describe('filterByTitle', () => {
    const items = [{ title: 'Alpha' }, { title: 'Beta' }, { title: 'alphabet' }];

    it('returns only matching items', () => {
        expect(filterByTitle(items, 'ALPHA')).toEqual([{ title: 'Alpha' }, { title: 'alphabet' }]);
    });

    it('returns an empty array when nothing matches', () => {
        expect(filterByTitle(items, 'xyz')).toEqual([]);
    });
});
