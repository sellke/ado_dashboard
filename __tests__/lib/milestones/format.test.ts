import { formatTargetMonth, hasAdpMonTag } from '@/lib/milestones/format';

describe('hasAdpMonTag', () => {
  describe('falsy / empty inputs', () => {
    it('returns false for null', () => {
      expect(hasAdpMonTag(null)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(hasAdpMonTag('')).toBe(false);
    });
  });

  describe('valid ADP-MON tags', () => {
    it('returns true for a single valid ADP-MON tag "ADP-MAR"', () => {
      expect(hasAdpMonTag('ADP-MAR')).toBe(true);
    });

    it('returns true when ADP-MON tag is among multiple semicolon-delimited tags', () => {
      expect(hasAdpMonTag('ADP-MAR; Q4 PLAN; Sprint Planning')).toBe(true);
    });

    it('returns true for every valid month code', () => {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      for (const m of months) {
        expect(hasAdpMonTag(`ADP-${m}`)).toBe(true);
      }
    });
  });

  describe('invalid / non-matching tags', () => {
    it('returns false for "ADP-SPRINT" (not a month code)', () => {
      expect(hasAdpMonTag('ADP-SPRINT')).toBe(false);
    });

    it('returns false when no ADP-MON tag is present in multi-tag string', () => {
      expect(hasAdpMonTag('Q4 PLAN; Sprint Planning')).toBe(false);
    });
  });

  describe('case-insensitive matching', () => {
    it('returns true for lowercase "adp-mar"', () => {
      expect(hasAdpMonTag('adp-mar')).toBe(true);
    });

    it('returns true for mixed case "ADP-mar"', () => {
      expect(hasAdpMonTag('ADP-mar')).toBe(true);
    });

    it('returns true for "adp-MAR" (prefix lowercase)', () => {
      expect(hasAdpMonTag('adp-MAR')).toBe(true);
    });
  });
});

describe('formatTargetMonth', () => {
  it('formats a valid ISO date as "MMM YYYY"', () => {
    expect(formatTargetMonth('2026-03-01')).toBe('Mar 2026');
  });

  it('uses UTC month to avoid timezone drift', () => {
    expect(formatTargetMonth('2026-01-01T00:00:00.000Z')).toBe('Jan 2026');
  });

  it('returns "Invalid" for a non-date string', () => {
    expect(formatTargetMonth('not-a-date')).toBe('Invalid');
  });
});
