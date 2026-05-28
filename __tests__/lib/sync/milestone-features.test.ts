/**
 * @jest-environment node
 *
 * Tests for Feature Goal Sync (Stories 1 & 7 — Phase 1E/2)
 *
 * Unit tests:
 * - buildFeatureGoalWiql: correct WHERE clauses, area path escaping, ADP- tag filter
 * - parseAdpTag: all 12 months, year rollover, invalid formats, semicolon-separated tags
 *
 * Integration tests (against test DB):
 * - syncMilestoneFeatures: creates WorkItem + Milestone for ADP-tagged Feature
 * - syncMilestoneFeatures: updates existing Milestone on re-sync
 * - syncMilestoneFeatures: skips Features with no ADP tag (no Milestone created)
 * - syncMilestoneFeatures: handles empty ADO result (no IDs)
 */

import type { AdoWorkItemRaw } from '@/lib/sync/mappers';
import {
  buildChildStoriesWiql,
  buildFeatureGoalWiql,
  parseAdpTag,
  parseQuarterTag,
  syncMilestoneFeatures,
  type MilestoneFeatureSyncContext,
} from '@/lib/sync/milestone-features';
import { cleanupTestData, prisma } from '../../prisma/helpers';

// =============================================================================
// UNIT TESTS: buildFeatureGoalWiql
// =============================================================================

describe('buildFeatureGoalWiql', () => {
  it('includes UNDER area path clause', () => {
    const wiql = buildFeatureGoalWiql('MyProject\\App\\Workstream');
    expect(wiql).toContain("[System.AreaPath] UNDER 'MyProject\\App\\Workstream'");
  });

  it('filters to Feature work item type', () => {
    const wiql = buildFeatureGoalWiql('MyProject\\Area');
    expect(wiql).toContain("[System.WorkItemType] = 'Feature'");
  });

  it('does NOT filter by tags in WIQL (tag filtering happens in code)', () => {
    const wiql = buildFeatureGoalWiql('MyProject\\Area');
    expect(wiql).not.toContain('System.Tags');
    expect(wiql).not.toContain('CONTAINS');
  });

  it('does NOT include IterationPath filter', () => {
    const wiql = buildFeatureGoalWiql('MyProject\\Area');
    expect(wiql).not.toContain('IterationPath');
  });

  it('orders by System.Id', () => {
    const wiql = buildFeatureGoalWiql('MyProject\\Area');
    expect(wiql).toContain('ORDER BY [System.Id]');
  });

  it('escapes single quotes in area path', () => {
    const wiql = buildFeatureGoalWiql("O'Brien\\Project");
    expect(wiql).toContain("UNDER 'O''Brien\\Project'");
  });

  it('produces a SELECT FROM WorkItems query', () => {
    const wiql = buildFeatureGoalWiql('MyProject');
    expect(wiql).toMatch(/^SELECT \[System\.Id\] FROM WorkItems/);
  });
});

// =============================================================================
// UNIT TESTS: buildChildStoriesWiql
// =============================================================================

describe('buildChildStoriesWiql', () => {
  it('returns empty string for empty ID array', () => {
    expect(buildChildStoriesWiql([])).toBe('');
  });

  it('produces a SELECT FROM WorkItems query', () => {
    const wiql = buildChildStoriesWiql([100, 200]);
    expect(wiql).toMatch(/^SELECT \[System\.Id\] FROM WorkItems/);
  });

  it('filters by System.Parent IN with provided IDs', () => {
    const wiql = buildChildStoriesWiql([100, 200, 300]);
    expect(wiql).toContain('[System.Parent] IN (100, 200, 300)');
  });

  it('filters to User Story work item type', () => {
    const wiql = buildChildStoriesWiql([100]);
    expect(wiql).toContain("[System.WorkItemType] = 'User Story'");
  });

  it('does NOT filter by AreaPath or IterationPath', () => {
    const wiql = buildChildStoriesWiql([100]);
    expect(wiql).not.toContain('AreaPath');
    expect(wiql).not.toContain('IterationPath');
  });

  it('orders by System.Id', () => {
    const wiql = buildChildStoriesWiql([100]);
    expect(wiql).toContain('ORDER BY [System.Id]');
  });

  it('handles single ID', () => {
    const wiql = buildChildStoriesWiql([42]);
    expect(wiql).toContain('[System.Parent] IN (42)');
  });
});

// =============================================================================
// UNIT TESTS: parseAdpTag
// =============================================================================

describe('parseAdpTag', () => {
  // Fixed reference date: 2026-06-15 (June = month index 5)
  const REF_DATE = new Date('2026-06-15T00:00:00.000Z');

  describe('all 12 month abbreviations (current/future months use current year)', () => {
    it('parses ADP-JUL → 2026-07-01 (future)', () => {
      expect(parseAdpTag('ADP-JUL', REF_DATE)).toEqual(new Date(Date.UTC(2026, 6, 1)));
    });

    it('parses ADP-AUG → 2026-08-01 (future)', () => {
      expect(parseAdpTag('ADP-AUG', REF_DATE)).toEqual(new Date(Date.UTC(2026, 7, 1)));
    });

    it('parses ADP-SEP → 2026-09-01 (future)', () => {
      expect(parseAdpTag('ADP-SEP', REF_DATE)).toEqual(new Date(Date.UTC(2026, 8, 1)));
    });

    it('parses ADP-OCT → 2026-10-01 (future)', () => {
      expect(parseAdpTag('ADP-OCT', REF_DATE)).toEqual(new Date(Date.UTC(2026, 9, 1)));
    });

    it('parses ADP-NOV → 2026-11-01 (future)', () => {
      expect(parseAdpTag('ADP-NOV', REF_DATE)).toEqual(new Date(Date.UTC(2026, 10, 1)));
    });

    it('parses ADP-DEC → 2026-12-01 (future)', () => {
      expect(parseAdpTag('ADP-DEC', REF_DATE)).toEqual(new Date(Date.UTC(2026, 11, 1)));
    });

    it('parses ADP-JUN → 2026-06-01 (current month, not past)', () => {
      expect(parseAdpTag('ADP-JUN', REF_DATE)).toEqual(new Date(Date.UTC(2026, 5, 1)));
    });
  });

  describe('year rollover: past months roll to next year', () => {
    it('parses ADP-JAN → 2027-01-01 (past month in 2026)', () => {
      expect(parseAdpTag('ADP-JAN', REF_DATE)).toEqual(new Date(Date.UTC(2027, 0, 1)));
    });

    it('parses ADP-FEB → 2027-02-01 (past month in 2026)', () => {
      expect(parseAdpTag('ADP-FEB', REF_DATE)).toEqual(new Date(Date.UTC(2027, 1, 1)));
    });

    it('parses ADP-MAR → 2027-03-01 (past month in 2026)', () => {
      expect(parseAdpTag('ADP-MAR', REF_DATE)).toEqual(new Date(Date.UTC(2027, 2, 1)));
    });

    it('parses ADP-APR → 2027-04-01 (past month in 2026)', () => {
      expect(parseAdpTag('ADP-APR', REF_DATE)).toEqual(new Date(Date.UTC(2027, 3, 1)));
    });

    it('parses ADP-MAY → 2027-05-01 (past month in 2026)', () => {
      expect(parseAdpTag('ADP-MAY', REF_DATE)).toEqual(new Date(Date.UTC(2027, 4, 1)));
    });
  });

  describe('ADP-FEB with today=2026-02-20 (spec example)', () => {
    it('parses ADP-FEB → 2026-02-01 when today is in February', () => {
      const today = new Date('2026-02-20T00:00:00.000Z');
      expect(parseAdpTag('ADP-FEB', today)).toEqual(new Date(Date.UTC(2026, 1, 1)));
    });
  });

  describe('semicolon-separated tags', () => {
    it('finds ADP tag among other tags', () => {
      const result = parseAdpTag('Sprint Planning; ADP-FEB; Other Tag', REF_DATE);
      expect(result).toEqual(new Date(Date.UTC(2027, 1, 1)));
    });

    it('handles extra whitespace around tags', () => {
      const result = parseAdpTag('  Sprint Planning  ;  ADP-AUG  ;  Other  ', REF_DATE);
      expect(result).toEqual(new Date(Date.UTC(2026, 7, 1)));
    });

    it('returns first matching ADP tag when multiple present', () => {
      const result = parseAdpTag('ADP-FEB; ADP-MAR', REF_DATE);
      expect(result).toEqual(new Date(Date.UTC(2027, 1, 1)));
    });

    it('ignores non-ADP tags alongside ADP tags', () => {
      const result = parseAdpTag('ADP-MAR; Q4; Sprint Planning', REF_DATE);
      expect(result).toEqual(new Date(Date.UTC(2027, 2, 1)));
    });
  });

  describe('case insensitivity', () => {
    it('parses adp-feb (lowercase)', () => {
      expect(parseAdpTag('adp-feb', REF_DATE)).toEqual(new Date(Date.UTC(2027, 1, 1)));
    });

    it('parses ADP-FEB (uppercase)', () => {
      expect(parseAdpTag('ADP-FEB', REF_DATE)).toEqual(new Date(Date.UTC(2027, 1, 1)));
    });

    it('parses Adp-Mar (mixed case)', () => {
      expect(parseAdpTag('Adp-Mar', REF_DATE)).toEqual(new Date(Date.UTC(2027, 2, 1)));
    });
  });

  describe('strict format rejection', () => {
    it('returns null for empty string', () => {
      expect(parseAdpTag('', REF_DATE)).toBeNull();
    });

    it('returns null when no ADP tag present', () => {
      expect(parseAdpTag('Sprint Planning; Feature; Q3', REF_DATE)).toBeNull();
    });

    it('returns null for legacy Feb-Goal format', () => {
      expect(parseAdpTag('Feb-Goal', REF_DATE)).toBeNull();
    });

    it('returns null for legacy Mar-Goal format', () => {
      expect(parseAdpTag('Mar-Goal', REF_DATE)).toBeNull();
    });

    it('returns null for "ADP February" (space instead of dash + abbreviation)', () => {
      expect(parseAdpTag('ADP February', REF_DATE)).toBeNull();
    });

    it('returns null for "ADP-MAR-2026" (extra suffix)', () => {
      expect(parseAdpTag('ADP-MAR-2026', REF_DATE)).toBeNull();
    });

    it('returns null for "adp-m" (truncated month)', () => {
      expect(parseAdpTag('adp-m', REF_DATE)).toBeNull();
    });

    it('returns null for "ADP-MARCH" (full month name — only explicit ADP-MON abbreviations)', () => {
      expect(parseAdpTag('ADP-MARCH', REF_DATE)).toBeNull();
    });

    it('returns null for "ADP-" alone (no month)', () => {
      expect(parseAdpTag('ADP-', REF_DATE)).toBeNull();
    });

    it('returns null for "ADP" alone (no dash)', () => {
      expect(parseAdpTag('ADP', REF_DATE)).toBeNull();
    });

    it('returns null for "Q1-Goal" (quarter prefix, old format)', () => {
      expect(parseAdpTag('Q1-Goal', REF_DATE)).toBeNull();
    });
  });

  describe('year-prefixed {YY}ADP format', () => {
    it('parses 25ADP → first of current month', () => {
      const result = parseAdpTag('25ADP', REF_DATE);
      expect(result).toEqual(new Date(Date.UTC(2026, 5, 1)));
    });

    it('parses 26ADP → first of current month', () => {
      const result = parseAdpTag('26ADP', REF_DATE);
      expect(result).toEqual(new Date(Date.UTC(2026, 5, 1)));
    });

    it('parses "25ADP; KPI Group 1; MVP" among other tags', () => {
      const result = parseAdpTag('25ADP; KPI Group 1; MVP', REF_DATE);
      expect(result).toEqual(new Date(Date.UTC(2026, 5, 1)));
    });

    it('is case-insensitive (25adp)', () => {
      const result = parseAdpTag('25adp', REF_DATE);
      expect(result).toEqual(new Date(Date.UTC(2026, 5, 1)));
    });

    it('prefers ADP-{MON} over {YY}ADP when both present', () => {
      const result = parseAdpTag('25ADP; ADP-JUL', REF_DATE);
      expect(result).toEqual(new Date(Date.UTC(2026, 6, 1)));
    });

    it('returns null for bare ADP (no year prefix)', () => {
      expect(parseAdpTag('ADP', REF_DATE)).toBeNull();
    });

    it('returns null for 1ADP (single digit year)', () => {
      expect(parseAdpTag('1ADP', REF_DATE)).toBeNull();
    });

    it('returns null for 125ADP (three digit prefix)', () => {
      expect(parseAdpTag('125ADP', REF_DATE)).toBeNull();
    });
  });
});

// =============================================================================
// UNIT TESTS: parseQuarterTag
// =============================================================================

describe('parseQuarterTag', () => {
  it('parses Q3-PLAN → "Q3"', () => {
    expect(parseQuarterTag('Q3-PLAN')).toBe('Q3');
  });

  it('parses Q1 → "Q1"', () => {
    expect(parseQuarterTag('Q1')).toBe('Q1');
  });

  it('parses Q4 → "Q4"', () => {
    expect(parseQuarterTag('Q4')).toBe('Q4');
  });

  it('is case-insensitive (q3 → "Q3")', () => {
    expect(parseQuarterTag('q3')).toBe('Q3');
  });

  it('parses "Q4 PLAN" → "Q4" (prefix match with trailing text)', () => {
    expect(parseQuarterTag('Q4 PLAN')).toBe('Q4');
  });

  it('parses "q2 plan" → "Q2" (case-insensitive with trailing text)', () => {
    expect(parseQuarterTag('q2 plan')).toBe('Q2');
  });

  it('finds quarter tag among semicolon-separated tags', () => {
    expect(parseQuarterTag('25ADP; Q4 PLAN; MVP')).toBe('Q4');
  });

  it('returns null for Q5 (out of range)', () => {
    expect(parseQuarterTag('Q5')).toBeNull();
  });

  it('returns null for Q0 (out of range)', () => {
    expect(parseQuarterTag('Q0')).toBeNull();
  });

  it('returns null for "Quarter4" (no Q-prefix format)', () => {
    expect(parseQuarterTag('Quarter4')).toBeNull();
  });

  it('returns null for "q4-fy26" (hyphenated suffix)', () => {
    expect(parseQuarterTag('q4-fy26')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseQuarterTag('')).toBeNull();
  });

  it('returns null when no quarter tag present', () => {
    expect(parseQuarterTag('25ADP; MVP; KPI Group 1')).toBeNull();
  });
});

// =============================================================================
// INTEGRATION TESTS: syncMilestoneFeatures
// =============================================================================

describe('syncMilestoneFeatures', () => {
  let workstreamId: string;
  let workstreamAreaPath: string;

  function makeRawFeature(
    id: number,
    title: string,
    tags: string,
    areaPath: string
  ): AdoWorkItemRaw {
    return {
      id,
      rev: 1,
      fields: {
        'System.Id': id,
        'System.Rev': 1,
        'System.WorkItemType': 'Feature',
        'System.Title': title,
        'System.State': 'Active',
        'System.AreaPath': areaPath,
        'System.IterationPath': areaPath,
        'System.Tags': tags,
      },
    };
  }

  function makeRawUserStory(
    id: number,
    title: string,
    parentId: number,
    areaPath: string,
    opts: { state?: string; storyPoints?: number; iterationPath?: string } = {}
  ): AdoWorkItemRaw {
    return {
      id,
      rev: 1,
      fields: {
        'System.Id': id,
        'System.Rev': 1,
        'System.WorkItemType': 'User Story',
        'System.Title': title,
        'System.State': opts.state ?? 'Active',
        'Microsoft.VSTS.Scheduling.StoryPoints': opts.storyPoints ?? 3,
        'System.AreaPath': areaPath,
        'System.IterationPath': opts.iterationPath ?? areaPath,
        'System.Parent': parentId,
      },
    };
  }

  beforeEach(async () => {
    await cleanupTestData();
    workstreamAreaPath = 'TestProject\\App\\LiveLink - Yellow Box\\TestStream';
    const ws = await prisma.workstream.create({
      data: { name: 'TestStream', adoAreaPath: workstreamAreaPath },
    });
    workstreamId = ws.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  it('creates WorkItem and Milestone for an ADP-tagged Feature', async () => {
    const today = new Date('2026-02-20T00:00:00.000Z');
    const rawFeature = makeRawFeature(1001, 'Feb Feature Goal', 'ADP-FEB', workstreamAreaPath);

    const context: MilestoneFeatureSyncContext = {
      db: prisma,
      today,
      wiqlFetcher: async () => [1001],
      batchFetcher: async () => [rawFeature],
    };

    const result = await syncMilestoneFeatures(
      { id: workstreamId, adoAreaPath: workstreamAreaPath, name: 'TestStream' },
      context
    );

    expect(result.featuresFetched).toBe(1);
    expect(result.featuresUpserted).toBe(1);
    expect(result.milestonesCreated).toBe(1);
    expect(result.milestonesUpdated).toBe(0);

    const workItem = await prisma.workItem.findUnique({ where: { adoId: 1001 } });
    expect(workItem).not.toBeNull();
    expect(workItem?.type).toBe('Feature');
    expect(workItem?.tags).toBe('ADP-FEB');

    const milestone = await prisma.milestone.findFirst({ where: { adoFeatureId: 1001 } });
    expect(milestone).not.toBeNull();
    expect(milestone?.title).toBe('Feb Feature Goal');
    expect(milestone?.workstreamId).toBe(workstreamId);
    expect(milestone?.targetMonth).toEqual(new Date(Date.UTC(2026, 1, 1)));
    expect(milestone?.status).toBe('NotStarted');
  });

  it('updates existing Milestone on re-sync with changed title', async () => {
    const today = new Date('2026-02-20T00:00:00.000Z');

    const rawV1 = makeRawFeature(2001, 'Original Title', 'ADP-MAR', workstreamAreaPath);
    const context: MilestoneFeatureSyncContext = {
      db: prisma,
      today,
      wiqlFetcher: async () => [2001],
      batchFetcher: async () => [rawV1],
    };
    await syncMilestoneFeatures(
      { id: workstreamId, adoAreaPath: workstreamAreaPath, name: 'TestStream' },
      context
    );

    const rawV2: AdoWorkItemRaw = {
      ...rawV1,
      rev: 2,
      fields: { ...rawV1.fields, 'System.Rev': 2, 'System.Title': 'Updated Title' },
    };
    const context2: MilestoneFeatureSyncContext = {
      db: prisma,
      today,
      wiqlFetcher: async () => [2001],
      batchFetcher: async () => [rawV2],
    };
    const result = await syncMilestoneFeatures(
      { id: workstreamId, adoAreaPath: workstreamAreaPath, name: 'TestStream' },
      context2
    );

    expect(result.milestonesCreated).toBe(0);
    expect(result.milestonesUpdated).toBe(1);

    const milestone = await prisma.milestone.findFirst({ where: { adoFeatureId: 2001 } });
    expect(milestone?.title).toBe('Updated Title');
  });

  it('does NOT create a Milestone for a Feature with no ADP tag', async () => {
    const today = new Date('2026-02-20T00:00:00.000Z');
    const rawFeature = makeRawFeature(
      3001,
      'Regular Feature',
      'Planning; Sprint 1',
      workstreamAreaPath
    );

    const context: MilestoneFeatureSyncContext = {
      db: prisma,
      today,
      wiqlFetcher: async () => [3001],
      batchFetcher: async () => [rawFeature],
    };

    const result = await syncMilestoneFeatures(
      { id: workstreamId, adoAreaPath: workstreamAreaPath, name: 'TestStream' },
      context
    );

    expect(result.featuresFetched).toBe(0);
    expect(result.milestonesCreated).toBe(0);
    expect(result.milestonesUpdated).toBe(0);

    const milestones = await prisma.milestone.findMany({ where: { workstreamId } });
    expect(milestones).toHaveLength(0);
  });

  it('does NOT create a Milestone for a Feature with legacy -Goal tag', async () => {
    const today = new Date('2026-02-20T00:00:00.000Z');
    const rawFeature = makeRawFeature(
      3501,
      'Legacy Goal Feature',
      'Feb-Goal',
      workstreamAreaPath
    );

    const context: MilestoneFeatureSyncContext = {
      db: prisma,
      today,
      wiqlFetcher: async () => [3501],
      batchFetcher: async () => [rawFeature],
    };

    const result = await syncMilestoneFeatures(
      { id: workstreamId, adoAreaPath: workstreamAreaPath, name: 'TestStream' },
      context
    );

    expect(result.featuresFetched).toBe(0);
    expect(result.milestonesCreated).toBe(0);
    expect(result.milestonesUpdated).toBe(0);
  });

  it('returns zero counts when ADO returns no IDs', async () => {
    const context: MilestoneFeatureSyncContext = {
      db: prisma,
      wiqlFetcher: async () => [],
      batchFetcher: async () => [],
    };

    const result = await syncMilestoneFeatures(
      { id: workstreamId, adoAreaPath: workstreamAreaPath, name: 'TestStream' },
      context
    );

    expect(result).toEqual({
      featuresFetched: 0,
      featuresUpserted: 0,
      milestonesCreated: 0,
      milestonesUpdated: 0,
      childStoriesFetched: 0,
      childStoriesUpserted: 0,
    });
  });

  it('handles multiple Features — only ADP-tagged ones become Milestones', async () => {
    const today = new Date('2026-02-20T00:00:00.000Z');
    const adpFeature = makeRawFeature(
      4001,
      'ADP Feature',
      'ADP-FEB; Planning',
      workstreamAreaPath
    );
    const nonAdpFeature = makeRawFeature(
      4002,
      'Plain Feature',
      'Planning; Backlog',
      workstreamAreaPath
    );

    const context: MilestoneFeatureSyncContext = {
      db: prisma,
      today,
      wiqlFetcher: async () => [4001, 4002],
      batchFetcher: async () => [adpFeature, nonAdpFeature],
    };

    const result = await syncMilestoneFeatures(
      { id: workstreamId, adoAreaPath: workstreamAreaPath, name: 'TestStream' },
      context
    );

    expect(result.featuresFetched).toBe(1);
    expect(result.milestonesCreated).toBe(1);

    const milestones = await prisma.milestone.findMany({ where: { workstreamId } });
    expect(milestones).toHaveLength(1);
    expect(milestones[0].adoFeatureId).toBe(4001);
  });

  it('sets targetMonth to next year for a past month', async () => {
    const today = new Date('2026-06-15T00:00:00.000Z');
    const rawFeature = makeRawFeature(5001, 'Past Month Goal', 'ADP-FEB', workstreamAreaPath);

    const context: MilestoneFeatureSyncContext = {
      db: prisma,
      today,
      wiqlFetcher: async () => [5001],
      batchFetcher: async () => [rawFeature],
    };

    await syncMilestoneFeatures(
      { id: workstreamId, adoAreaPath: workstreamAreaPath, name: 'TestStream' },
      context
    );

    const milestone = await prisma.milestone.findFirst({ where: { adoFeatureId: 5001 } });
    expect(milestone?.targetMonth).toEqual(new Date(Date.UTC(2027, 1, 1)));
  });

  it('fetches and upserts child User Stories of ADP-tagged Features', async () => {
    const today = new Date('2026-02-20T00:00:00.000Z');
    const rawFeature = makeRawFeature(6001, 'Feature With Children', 'ADP-MAR', workstreamAreaPath);
    const childStory1 = makeRawUserStory(6101, 'Child Story A', 6001, workstreamAreaPath, {
      state: 'Done',
      storyPoints: 5,
    });
    const childStory2 = makeRawUserStory(6102, 'Child Story B', 6001, workstreamAreaPath, {
      state: 'Active',
      storyPoints: 3,
    });

    const context: MilestoneFeatureSyncContext = {
      db: prisma,
      today,
      wiqlFetcher: async (_proj: string, query: string) => {
        if (query.includes('[System.Parent]')) return [6101, 6102];
        return [6001];
      },
      batchFetcher: async (_proj: string, ids: number[]) => {
        if (ids.includes(6001)) return [rawFeature];
        return [childStory1, childStory2];
      },
    };

    const result = await syncMilestoneFeatures(
      { id: workstreamId, adoAreaPath: workstreamAreaPath, name: 'TestStream' },
      context
    );

    expect(result.childStoriesFetched).toBe(2);
    expect(result.childStoriesUpserted).toBe(2);

    const story1 = await prisma.workItem.findUnique({ where: { adoId: 6101 } });
    expect(story1).not.toBeNull();
    expect(story1?.type).toBe('UserStory');
    expect(story1?.parentAdoId).toBe(6001);
    expect(story1?.storyPoints).toBe(5);

    const story2 = await prisma.workItem.findUnique({ where: { adoId: 6102 } });
    expect(story2).not.toBeNull();
    expect(story2?.parentAdoId).toBe(6001);
  });

  it('resolves sprintId on child stories when sprintIdMap is provided', async () => {
    const today = new Date('2026-04-28T00:00:00.000Z');
    const sprintPath = 'TestProject\\Sprint 27.1';
    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 27.1',
        startDate: new Date('2026-04-27'),
        endDate: new Date('2026-05-08'),
        adoIterationPath: sprintPath,
      },
    });

    const rawFeature = makeRawFeature(7001, 'Sprint Feature', 'ADP-MAR', workstreamAreaPath);
    const childStory = makeRawUserStory(7101, 'Sprinted Story', 7001, workstreamAreaPath, {
      state: 'Done',
      storyPoints: 5,
      iterationPath: sprintPath,
    });

    const context: MilestoneFeatureSyncContext = {
      db: prisma,
      today,
      sprintIdMap: new Map([[sprintPath, sprint.id]]),
      wiqlFetcher: async (_proj: string, query: string) => {
        if (query.includes('[System.Parent]')) return [7101];
        return [7001];
      },
      batchFetcher: async (_proj: string, ids: number[]) => {
        if (ids.includes(7001)) return [rawFeature];
        return [childStory];
      },
    };

    await syncMilestoneFeatures(
      { id: workstreamId, adoAreaPath: workstreamAreaPath, name: 'TestStream' },
      context
    );

    const story = await prisma.workItem.findUnique({ where: { adoId: 7101 } });
    expect(story?.sprintId).toBe(sprint.id);
  });

  it('creates Milestone for a Feature with year-prefixed 25ADP tag', async () => {
    const today = new Date('2026-03-09T00:00:00.000Z');
    const rawFeature = makeRawFeature(
      9001,
      'Schedule Adherence KPI',
      '25ADP; KPI Group 1; MVP',
      workstreamAreaPath
    );

    const context: MilestoneFeatureSyncContext = {
      db: prisma,
      today,
      wiqlFetcher: async () => [9001],
      batchFetcher: async () => [rawFeature],
    };

    const result = await syncMilestoneFeatures(
      { id: workstreamId, adoAreaPath: workstreamAreaPath, name: 'TestStream' },
      context
    );

    expect(result.featuresFetched).toBe(1);
    expect(result.milestonesCreated).toBe(1);

    const milestone = await prisma.milestone.findFirst({ where: { adoFeatureId: 9001 } });
    expect(milestone).not.toBeNull();
    expect(milestone?.title).toBe('Schedule Adherence KPI');
    expect(milestone?.targetMonth).toEqual(new Date(Date.UTC(2026, 2, 1)));
  });

  it('creates Milestone with quarter from Q4 PLAN tag', async () => {
    const today = new Date('2026-03-09T00:00:00.000Z');
    const rawFeature = makeRawFeature(
      9101,
      'User Experience Milestone',
      '25ADP; Q4 PLAN',
      workstreamAreaPath
    );

    const context: MilestoneFeatureSyncContext = {
      db: prisma,
      today,
      wiqlFetcher: async () => [9101],
      batchFetcher: async () => [rawFeature],
    };

    const result = await syncMilestoneFeatures(
      { id: workstreamId, adoAreaPath: workstreamAreaPath, name: 'TestStream' },
      context
    );

    expect(result.milestonesCreated).toBe(1);

    const milestone = await prisma.milestone.findFirst({ where: { adoFeatureId: 9101 } });
    expect(milestone?.quarter).toBe('Q4');
  });

  it('returns zero child story counts when Feature has no children in ADO', async () => {
    const today = new Date('2026-02-20T00:00:00.000Z');
    const rawFeature = makeRawFeature(8001, 'Childless Feature', 'ADP-MAR', workstreamAreaPath);

    const context: MilestoneFeatureSyncContext = {
      db: prisma,
      today,
      wiqlFetcher: async (_proj: string, query: string) => {
        if (query.includes('[System.Parent]')) return [];
        return [8001];
      },
      batchFetcher: async () => [rawFeature],
    };

    const result = await syncMilestoneFeatures(
      { id: workstreamId, adoAreaPath: workstreamAreaPath, name: 'TestStream' },
      context
    );

    expect(result.childStoriesFetched).toBe(0);
    expect(result.childStoriesUpserted).toBe(0);
    expect(result.milestonesCreated).toBe(1);
  });
});
