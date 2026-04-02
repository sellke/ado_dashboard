import {
  extractAdpMonCanonicalLabel,
  extractMilestoneTagBadgeLabel,
  extractQPlanCanonicalLabel,
  formatTargetMonth,
  hasAdpMilestoneTag,
  hasAdpMonTag,
  hasMilestoneRollupTag,
  hasQPlanTag,
} from '@/lib/milestones/format';

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
      const months = [
        'JAN',
        'FEB',
        'MAR',
        'APR',
        'MAY',
        'JUN',
        'JUL',
        'AUG',
        'SEP',
        'OCT',
        'NOV',
        'DEC',
      ];
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

    it('returns false for full month name ADP-MARCH (explicit 3-letter codes only)', () => {
      expect(hasAdpMonTag('ADP-MARCH')).toBe(false);
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

    it('returns true for ADO-style spaced hyphen "ADP - JAN"', () => {
      expect(hasAdpMonTag('ADP - JAN')).toBe(true);
    });

    it('returns true when spaced tag is in a multi-tag string', () => {
      expect(hasAdpMonTag('ADP - JAN; KPI Group 1')).toBe(true);
    });

    it('matches ADP – MAR (Unicode en dash) like ADP-MAR', () => {
      expect(hasAdpMonTag('ADP \u2013 MAR')).toBe(true);
      expect(extractAdpMonCanonicalLabel('ADP\u2013MAR')).toBe('ADP-MAR');
    });

    it('finds ADP-MAR when tags are comma-separated (ADO/API style)', () => {
      expect(hasAdpMonTag('KPI Group 1, ADP - MAR')).toBe(true);
    });
  });
});

describe('hasQPlanTag', () => {
  it('returns true for Q4-PLAN and Q4 PLAN', () => {
    expect(hasQPlanTag('Q4-PLAN')).toBe(true);
    expect(hasQPlanTag('Q4 PLAN')).toBe(true);
    expect(hasQPlanTag('q2-plan')).toBe(true);
  });

  it('returns false for plain Q4 without PLAN', () => {
    expect(hasQPlanTag('Q4')).toBe(false);
  });
});

describe('hasMilestoneRollupTag', () => {
  it('returns true when either ADP-MON or Q#-PLAN is present', () => {
    expect(hasMilestoneRollupTag('ADP-JAN')).toBe(true);
    expect(hasMilestoneRollupTag('Q3-PLAN')).toBe(true);
    expect(hasMilestoneRollupTag('Sprint')).toBe(false);
  });
});

describe('extractAdpMonCanonicalLabel', () => {
  it('returns ADP-JAN from spaced tag', () => {
    expect(extractAdpMonCanonicalLabel('ADP - JAN; KPI')).toBe('ADP-JAN');
  });

  it('returns null when no ADP month tag', () => {
    expect(extractAdpMonCanonicalLabel('KPI Group 1')).toBe(null);
  });
});

describe('extractQPlanCanonicalLabel', () => {
  it('normalizes to Q1-PLAN', () => {
    expect(extractQPlanCanonicalLabel('Q1-PLAN')).toBe('Q1-PLAN');
    expect(extractQPlanCanonicalLabel('Q1 PLAN; KPI')).toBe('Q1-PLAN');
  });
});

describe('extractMilestoneTagBadgeLabel', () => {
  it('prefers ADP over Q-PLAN on stories', () => {
    expect(
      extractMilestoneTagBadgeLabel('Q4-PLAN', [
        { tags: 'ADP-JAN' },
        { tags: 'Q2-PLAN' },
      ])
    ).toBe('ADP-JAN');
  });

  it('uses Q-PLAN on stories when no ADP', () => {
    expect(extractMilestoneTagBadgeLabel('25ADP', [{ tags: 'Q3-PLAN' }])).toBe('Q3-PLAN');
  });

  it('falls back to Feature tags', () => {
    expect(extractMilestoneTagBadgeLabel('ADP-MAR', [{ tags: null }])).toBe('ADP-MAR');
  });
});

describe('hasAdpMilestoneTag', () => {
  it('returns false for null', () => {
    expect(hasAdpMilestoneTag(null)).toBe(false);
  });

  it('returns true when hasAdpMonTag would match (ADP-MAR)', () => {
    expect(hasAdpMilestoneTag('ADP-MAR')).toBe(true);
  });

  it('returns true for year-prefixed 25ADP', () => {
    expect(hasAdpMilestoneTag('25ADP')).toBe(true);
  });

  it('returns true when 25ADP is among semicolon-delimited tags', () => {
    expect(hasAdpMilestoneTag('25ADP; Q4; Planning')).toBe(true);
  });

  it('returns false for ADP-SPRINT (not a milestone tag)', () => {
    expect(hasAdpMilestoneTag('ADP-SPRINT')).toBe(false);
  });

  it('returns true for explicit Q4-PLAN / Q4 PLAN', () => {
    expect(hasAdpMilestoneTag('Q4-PLAN')).toBe(true);
    expect(hasAdpMilestoneTag('Q4 PLAN')).toBe(true);
  });
});

describe('formatTargetMonth', () => {
  it('formats valid ISO date string to "MMM YYYY"', () => {
    expect(formatTargetMonth('2026-03-15T12:00:00.000Z')).toBe('Mar 2026');
  });

  it('returns Invalid for bad date string', () => {
    expect(formatTargetMonth('not-a-date')).toBe('Invalid');
  });
});
