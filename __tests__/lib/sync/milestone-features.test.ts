/**
 * @jest-environment node
 *
 * Tests for Story 1 (Phase 1E): Feature Goal Sync
 *
 * Unit tests:
 * - buildFeatureGoalWiql: correct WHERE clauses, area path escaping, no iteration filter
 * - parseGoalTag: all 12 months, year rollover, invalid formats, semicolon-separated tags
 *
 * Integration tests (against test DB):
 * - syncMilestoneFeatures: creates WorkItem + Milestone for goal-tagged Feature
 * - syncMilestoneFeatures: updates existing Milestone on re-sync
 * - syncMilestoneFeatures: skips Features with no -Goal tag (no Milestone created)
 * - syncMilestoneFeatures: handles empty ADO result (no IDs)
 */

import type { AdoWorkItemRaw } from '@/lib/sync/mappers';
import {
  buildFeatureGoalWiql,
  parseGoalTag,
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

  it('filters tags containing -Goal', () => {
    const wiql = buildFeatureGoalWiql('MyProject\\Area');
    expect(wiql).toContain("[System.Tags] CONTAINS '-Goal'");
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
// UNIT TESTS: parseGoalTag
// =============================================================================

describe('parseGoalTag', () => {
  // Fixed reference date: 2026-06-15 (June = month index 5)
  const REF_DATE = new Date('2026-06-15T00:00:00.000Z');

  describe('all 12 month abbreviations (current/future months use current year)', () => {
    it('parses Jul-Goal → 2026-07-01 (future)', () => {
      const result = parseGoalTag('Jul-Goal', REF_DATE);
      expect(result).toEqual(new Date(Date.UTC(2026, 6, 1)));
    });

    it('parses Aug-Goal → 2026-08-01 (future)', () => {
      expect(parseGoalTag('Aug-Goal', REF_DATE)).toEqual(new Date(Date.UTC(2026, 7, 1)));
    });

    it('parses Sep-Goal → 2026-09-01 (future)', () => {
      expect(parseGoalTag('Sep-Goal', REF_DATE)).toEqual(new Date(Date.UTC(2026, 8, 1)));
    });

    it('parses Oct-Goal → 2026-10-01 (future)', () => {
      expect(parseGoalTag('Oct-Goal', REF_DATE)).toEqual(new Date(Date.UTC(2026, 9, 1)));
    });

    it('parses Nov-Goal → 2026-11-01 (future)', () => {
      expect(parseGoalTag('Nov-Goal', REF_DATE)).toEqual(new Date(Date.UTC(2026, 10, 1)));
    });

    it('parses Dec-Goal → 2026-12-01 (future)', () => {
      expect(parseGoalTag('Dec-Goal', REF_DATE)).toEqual(new Date(Date.UTC(2026, 11, 1)));
    });

    it('parses Jun-Goal → 2026-06-01 (current month, not past)', () => {
      expect(parseGoalTag('Jun-Goal', REF_DATE)).toEqual(new Date(Date.UTC(2026, 5, 1)));
    });
  });

  describe('year rollover: past months roll to next year', () => {
    it('parses Jan-Goal → 2027-01-01 (past month in 2026)', () => {
      expect(parseGoalTag('Jan-Goal', REF_DATE)).toEqual(new Date(Date.UTC(2027, 0, 1)));
    });

    it('parses Feb-Goal → 2027-02-01 (past month in 2026)', () => {
      expect(parseGoalTag('Feb-Goal', REF_DATE)).toEqual(new Date(Date.UTC(2027, 1, 1)));
    });

    it('parses Mar-Goal → 2027-03-01 (past month in 2026)', () => {
      expect(parseGoalTag('Mar-Goal', REF_DATE)).toEqual(new Date(Date.UTC(2027, 2, 1)));
    });

    it('parses Apr-Goal → 2027-04-01 (past month in 2026)', () => {
      expect(parseGoalTag('Apr-Goal', REF_DATE)).toEqual(new Date(Date.UTC(2027, 3, 1)));
    });

    it('parses May-Goal → 2027-05-01 (past month in 2026)', () => {
      expect(parseGoalTag('May-Goal', REF_DATE)).toEqual(new Date(Date.UTC(2027, 4, 1)));
    });
  });

  describe('Feb-Goal with today=2026-02-20 (spec example)', () => {
    it('parses Feb-Goal → 2026-02-01 when today is in February', () => {
      const today = new Date('2026-02-20T00:00:00.000Z');
      expect(parseGoalTag('Feb-Goal', today)).toEqual(new Date(Date.UTC(2026, 1, 1)));
    });
  });

  describe('semicolon-separated tags', () => {
    it('finds goal tag among other tags', () => {
      const result = parseGoalTag('Sprint Planning; Feb-Goal; Other Tag', REF_DATE);
      expect(result).toEqual(new Date(Date.UTC(2027, 1, 1)));
    });

    it('handles extra whitespace around tags', () => {
      const result = parseGoalTag('  Sprint Planning  ;  Aug-Goal  ;  Other  ', REF_DATE);
      expect(result).toEqual(new Date(Date.UTC(2026, 7, 1)));
    });

    it('returns first matching goal tag when multiple present', () => {
      const result = parseGoalTag('Feb-Goal; Mar-Goal', REF_DATE);
      // Both are past, both roll to next year; Feb comes first
      expect(result).toEqual(new Date(Date.UTC(2027, 1, 1)));
    });
  });

  describe('case insensitivity', () => {
    it('parses feb-goal (lowercase)', () => {
      expect(parseGoalTag('feb-goal', REF_DATE)).toEqual(new Date(Date.UTC(2027, 1, 1)));
    });

    it('parses FEB-GOAL (uppercase)', () => {
      expect(parseGoalTag('FEB-GOAL', REF_DATE)).toEqual(new Date(Date.UTC(2027, 1, 1)));
    });
  });

  describe('invalid / unrecognized formats', () => {
    it('returns null for empty string', () => {
      expect(parseGoalTag('', REF_DATE)).toBeNull();
    });

    it('returns null when no -Goal tag present', () => {
      expect(parseGoalTag('Sprint Planning; Feature; Q3', REF_DATE)).toBeNull();
    });

    it('returns null for partial match "Feb-" without Goal', () => {
      expect(parseGoalTag('Feb-', REF_DATE)).toBeNull();
    });

    it('returns null for "February-Goal" (full month name, not abbreviated)', () => {
      expect(parseGoalTag('February-Goal', REF_DATE)).toBeNull();
    });

    it('returns null for "-Goal" alone (no month prefix)', () => {
      expect(parseGoalTag('-Goal', REF_DATE)).toBeNull();
    });

    it('returns null for "Q1-Goal" (quarter prefix, not month)', () => {
      expect(parseGoalTag('Q1-Goal', REF_DATE)).toBeNull();
    });
  });
});

// =============================================================================
// INTEGRATION TESTS: syncMilestoneFeatures
// =============================================================================

describe('syncMilestoneFeatures', () => {
  let workstreamId: string;
  let workstreamAreaPath: string;

  /** Builds a raw ADO Feature work item for testing. */
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

  it('creates WorkItem and Milestone for a goal-tagged Feature', async () => {
    const today = new Date('2026-02-20T00:00:00.000Z');
    const rawFeature = makeRawFeature(1001, 'Feb Feature Goal', 'Feb-Goal', workstreamAreaPath);

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

    // Verify WorkItem record
    const workItem = await prisma.workItem.findUnique({ where: { adoId: 1001 } });
    expect(workItem).not.toBeNull();
    expect(workItem?.type).toBe('Feature');
    expect(workItem?.tags).toBe('Feb-Goal');

    // Verify Milestone record
    const milestone = await prisma.milestone.findFirst({ where: { adoFeatureId: 1001 } });
    expect(milestone).not.toBeNull();
    expect(milestone?.title).toBe('Feb Feature Goal');
    expect(milestone?.workstreamId).toBe(workstreamId);
    expect(milestone?.targetMonth).toEqual(new Date(Date.UTC(2026, 1, 1)));
    expect(milestone?.status).toBe('NotStarted');
  });

  it('updates existing Milestone on re-sync with changed title', async () => {
    const today = new Date('2026-02-20T00:00:00.000Z');

    // First sync
    const rawV1 = makeRawFeature(2001, 'Original Title', 'Mar-Goal', workstreamAreaPath);
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

    // Second sync with updated title and changed revision
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

  it('does NOT create a Milestone for a Feature with no -Goal tag', async () => {
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

    expect(result.featuresFetched).toBe(1);
    expect(result.milestonesCreated).toBe(0);
    expect(result.milestonesUpdated).toBe(0);

    const milestones = await prisma.milestone.findMany({ where: { workstreamId } });
    expect(milestones).toHaveLength(0);
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
    });
  });

  it('handles multiple Features — only goal-tagged ones become Milestones', async () => {
    const today = new Date('2026-02-20T00:00:00.000Z');
    const goalFeature = makeRawFeature(
      4001,
      'Goal Feature',
      'Feb-Goal; Planning',
      workstreamAreaPath
    );
    const nonGoalFeature = makeRawFeature(
      4002,
      'Plain Feature',
      'Planning; Backlog',
      workstreamAreaPath
    );

    const context: MilestoneFeatureSyncContext = {
      db: prisma,
      today,
      wiqlFetcher: async () => [4001, 4002],
      batchFetcher: async () => [goalFeature, nonGoalFeature],
    };

    const result = await syncMilestoneFeatures(
      { id: workstreamId, adoAreaPath: workstreamAreaPath, name: 'TestStream' },
      context
    );

    expect(result.featuresFetched).toBe(2);
    expect(result.milestonesCreated).toBe(1);

    const milestones = await prisma.milestone.findMany({ where: { workstreamId } });
    expect(milestones).toHaveLength(1);
    expect(milestones[0].adoFeatureId).toBe(4001);
  });

  it('sets targetMonth to next year for a past month', async () => {
    // today = June 2026, Feb is past → should roll to 2027
    const today = new Date('2026-06-15T00:00:00.000Z');
    const rawFeature = makeRawFeature(5001, 'Past Month Goal', 'Feb-Goal', workstreamAreaPath);

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
});
