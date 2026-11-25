import { describe, it, expect } from 'vitest';
import { matchesTitle } from './search';

describe('matchesTitle', () => {
    it('matches case-insensitively on substrings', () => {
        expect(matchesTitle('Pipeline Panic', 'PANIC')).toBe(true);
        expect(matchesTitle('Pipeline Panic', 'line pa')).toBe(true);
    });

    it('treats blank or whitespace-only queries as matching everything', () => {
        expect(matchesTitle('Pipeline Panic', '')).toBe(true);
        expect(matchesTitle('Pipeline Panic', '   ')).toBe(true);
    });

    it('returns false when the title does not contain the query', () => {
        expect(matchesTitle('Pipeline Panic', 'zzz')).toBe(false);
    });
});
