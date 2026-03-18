/**
 * @jest-environment node
 *
 * Tests for Story 2 (Phase 1E): Progress Calculator
 *
 * Unit tests:
 * - computeMilestoneProgress: happy path, no children, partial completion, burnup ordering
 * - deriveMilestoneStatus: 0%/null → NotStarted, 1-99% → InProgress, 100% → Done
 * - computeProgramMilestoneRollup: current month filter, quarterly counts, SP aggregation
 */

import {
  computeMilestoneProgress,
  computeProgramMilestoneRollup,
  deriveMilestoneStatus,
  type ChildStoryInput,
  type MilestoneProgressInput,
} from '@/lib/milestones/calculator';

// =============================================================================
// Helpers
// =============================================================================

function makeStory(
  state: string,
  storyPoints: number | null,
  sprint: { id: string; name: string; startDate: Date } | null = null
): ChildStoryInput {
  return { state, storyPoints, sprint };
}

function makeSprint(id: string, name: string, startDateIso: string) {
  return { id, name, startDate: new Date(startDateIso) };
}

let _featureCounter = 100;
function makeMilestoneInput(
  targetMonthIso: string,
  percentComplete: number | null,
  totalSP = 10,
  completedSP?: number
): MilestoneProgressInput {
  const actualTotalSP = percentComplete === null ? 0 : totalSP;
  const actualCompletedSP =
    completedSP !== undefined
      ? completedSP
      : percentComplete !== null
        ? (percentComplete / 100) * totalSP
        : 0;
  return {
    targetMonth: new Date(targetMonthIso),
    progress: {
      adoFeatureId: ++_featureCounter,
      totalSP: actualTotalSP,
      completedSP: actualCompletedSP,
      percentComplete,
      burnupData: [],
    },
    quarter: null,
  };
}

// =============================================================================
// computeMilestoneProgress
// =============================================================================

describe('computeMilestoneProgress', () => {
  describe('happy path — spec example', () => {
    it('computes completedSP=10, totalSP=20, percentComplete=50 for 3 child stories', () => {
      // AC: Feature with 3 child UserStories (10SP done, 5SP in-progress, 5SP not-started)
      const sprint = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const stories = [
        makeStory('Done', 10, sprint),
        makeStory('Active', 5, sprint),
        makeStory('New', 5, sprint),
      ];
      const result = computeMilestoneProgress(42, stories);
      expect(result.adoFeatureId).toBe(42);
      expect(result.completedSP).toBe(10);
      expect(result.totalSP).toBe(20);
      expect(result.percentComplete).toBe(50);
    });
  });

  describe('no children', () => {
    it('returns totalSP=0, completedSP=0, percentComplete=null, empty burnupData', () => {
      // AC: Feature with no child UserStories
      const result = computeMilestoneProgress(99, []);
      expect(result.totalSP).toBe(0);
      expect(result.completedSP).toBe(0);
      expect(result.percentComplete).toBeNull();
      expect(result.burnupData).toHaveLength(0);
    });
  });

  describe('done-like states', () => {
    it('counts "Done" as completed', () => {
      const sprint = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const result = computeMilestoneProgress(1, [makeStory('Done', 8, sprint)]);
      expect(result.completedSP).toBe(8);
    });

    it('counts "Closed" as completed', () => {
      const sprint = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const result = computeMilestoneProgress(1, [makeStory('Closed', 6, sprint)]);
      expect(result.completedSP).toBe(6);
    });

    it('counts "Resolved" as completed', () => {
      const sprint = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const result = computeMilestoneProgress(1, [makeStory('Resolved', 4, sprint)]);
      expect(result.completedSP).toBe(4);
    });

    it('does not count "Active" as completed', () => {
      const sprint = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const result = computeMilestoneProgress(1, [makeStory('Active', 5, sprint)]);
      expect(result.completedSP).toBe(0);
    });

    it('does not count "New" as completed', () => {
      const sprint = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const result = computeMilestoneProgress(1, [makeStory('New', 5, sprint)]);
      expect(result.completedSP).toBe(0);
    });

    it('returns percentComplete=100 when all stories are done', () => {
      // AC: all child stories done → MilestoneStatus = Done (100%)
      const sprint = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const stories = [
        makeStory('Done', 8, sprint),
        makeStory('Closed', 4, sprint),
        makeStory('Resolved', 3, sprint),
      ];
      const result = computeMilestoneProgress(1, stories);
      expect(result.percentComplete).toBe(100);
    });
  });

  describe('null story points', () => {
    it('treats null storyPoints as 0 for completedSP', () => {
      const sprint = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const stories = [makeStory('Done', null, sprint), makeStory('New', 5, sprint)];
      const result = computeMilestoneProgress(1, stories);
      expect(result.completedSP).toBe(0);
      expect(result.totalSP).toBe(5);
    });

    it('treats null storyPoints as 0 for totalSP', () => {
      const sprint = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const stories = [makeStory('New', null, sprint), makeStory('New', null, sprint)];
      const result = computeMilestoneProgress(1, stories);
      expect(result.totalSP).toBe(0);
      expect(result.percentComplete).toBeNull();
    });
  });

  describe('burnup data', () => {
    it('has 3 burnup entries for stories spread across 3 sprints', () => {
      // AC: child stories spread across 3 sprints → burnupData has 3 entries
      const s1 = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const s2 = makeSprint('s2', 'Sprint 2', '2026-01-20T00:00:00.000Z');
      const s3 = makeSprint('s3', 'Sprint 3', '2026-02-03T00:00:00.000Z');
      const stories = [
        makeStory('Done', 5, s1),
        makeStory('Active', 3, s2),
        makeStory('New', 2, s3),
      ];
      const result = computeMilestoneProgress(1, stories);
      expect(result.burnupData).toHaveLength(3);
    });

    it('orders burnup entries by sprint startDate ascending', () => {
      const s3 = makeSprint('s3', 'Sprint 3', '2026-02-03T00:00:00.000Z');
      const s1 = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const s2 = makeSprint('s2', 'Sprint 2', '2026-01-20T00:00:00.000Z');
      // Stories passed in reverse order
      const stories = [
        makeStory('Done', 5, s3),
        makeStory('Done', 3, s1),
        makeStory('Done', 2, s2),
      ];
      const result = computeMilestoneProgress(1, stories);
      expect(result.burnupData.map((b) => b.sprintName)).toEqual([
        'Sprint 1',
        'Sprint 2',
        'Sprint 3',
      ]);
    });

    it('produces correct cumulative completed SP per sprint', () => {
      const s1 = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const s2 = makeSprint('s2', 'Sprint 2', '2026-01-20T00:00:00.000Z');
      const s3 = makeSprint('s3', 'Sprint 3', '2026-02-03T00:00:00.000Z');
      const stories = [makeStory('Done', 3, s1), makeStory('Done', 2, s2), makeStory('New', 5, s3)];
      const result = computeMilestoneProgress(1, stories);
      expect(result.burnupData[0].cumulativeCompletedSP).toBe(3);
      expect(result.burnupData[1].cumulativeCompletedSP).toBe(5);
      expect(result.burnupData[2].cumulativeCompletedSP).toBe(5); // sprint 3 has no completions
    });

    it('uses the overall totalSP in every burnup data point', () => {
      const s1 = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const s2 = makeSprint('s2', 'Sprint 2', '2026-01-20T00:00:00.000Z');
      const stories = [makeStory('Done', 5, s1), makeStory('New', 5, s2)];
      const result = computeMilestoneProgress(1, stories);
      expect(result.burnupData[0].totalSP).toBe(10);
      expect(result.burnupData[1].totalSP).toBe(10);
    });

    it('groups multiple stories in the same sprint into one burnup entry', () => {
      const s1 = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const stories = [makeStory('Done', 3, s1), makeStory('Done', 2, s1), makeStory('New', 5, s1)];
      const result = computeMilestoneProgress(1, stories);
      expect(result.burnupData).toHaveLength(1);
      expect(result.burnupData[0].cumulativeCompletedSP).toBe(5);
    });

    it('skips stories with no sprint from burnup but still counts their SP in totals', () => {
      const s1 = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const stories = [
        makeStory('Done', 5, s1),
        makeStory('New', 3, null), // no sprint — excluded from burnup but counted in totalSP
      ];
      const result = computeMilestoneProgress(1, stories);
      expect(result.burnupData).toHaveLength(1);
      expect(result.totalSP).toBe(8);
      expect(result.burnupData[0].totalSP).toBe(8); // totalSP reflects full milestone total
    });

    it('includes sprintId in each burnup entry', () => {
      const s1 = makeSprint('sprint-abc', 'Sprint 1', '2026-01-06T00:00:00.000Z');
      const result = computeMilestoneProgress(1, [makeStory('Done', 5, s1)]);
      expect(result.burnupData[0].sprintId).toBe('sprint-abc');
    });
  });
});

// =============================================================================
// deriveMilestoneStatus
// =============================================================================

describe('deriveMilestoneStatus', () => {
  it('returns NotStarted for null (no story points)', () => {
    expect(deriveMilestoneStatus(null)).toBe('NotStarted');
  });

  it('returns NotStarted for 0', () => {
    expect(deriveMilestoneStatus(0)).toBe('NotStarted');
  });

  it('returns InProgress for 1 (just started)', () => {
    expect(deriveMilestoneStatus(1)).toBe('InProgress');
  });

  it('returns InProgress for 50', () => {
    expect(deriveMilestoneStatus(50)).toBe('InProgress');
  });

  it('returns InProgress for 99', () => {
    expect(deriveMilestoneStatus(99)).toBe('InProgress');
  });

  it('returns Done for 100', () => {
    expect(deriveMilestoneStatus(100)).toBe('Done');
  });

  it('integrates with computeMilestoneProgress — all done stories yields Done status', () => {
    // AC: all child stories done (100%) → MilestoneStatus = Done
    const sprint = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
    const progress = computeMilestoneProgress(1, [
      makeStory('Done', 8, sprint),
      makeStory('Closed', 2, sprint),
    ]);
    expect(deriveMilestoneStatus(progress.percentComplete)).toBe('Done');
  });

  it('integrates with computeMilestoneProgress — partial → InProgress', () => {
    const sprint = makeSprint('s1', 'Sprint 1', '2026-01-06T00:00:00.000Z');
    const progress = computeMilestoneProgress(1, [
      makeStory('Done', 5, sprint),
      makeStory('New', 5, sprint),
    ]);
    expect(deriveMilestoneStatus(progress.percentComplete)).toBe('InProgress');
  });

  it('integrates with computeMilestoneProgress — no children → NotStarted', () => {
    const progress = computeMilestoneProgress(1, []);
    expect(deriveMilestoneStatus(progress.percentComplete)).toBe('NotStarted');
  });
});

// =============================================================================
// computeProgramMilestoneRollup
// =============================================================================

describe('computeProgramMilestoneRollup', () => {
  // Reference date: 2026-02-20 — Q1 calendar (Jan=0, Feb=1, Mar=2)
  const TODAY = new Date('2026-02-20T12:00:00.000Z');

  describe('currentMonth label', () => {
    it('formats currentMonth as "February 2026"', () => {
      const result = computeProgramMilestoneRollup([], TODAY);
      expect(result.currentMonth).toBe('February 2026');
    });

    it('formats correctly for January', () => {
      expect(
        computeProgramMilestoneRollup([], new Date('2026-01-15T00:00:00.000Z')).currentMonth
      ).toBe('January 2026');
    });

    it('formats correctly for December', () => {
      expect(
        computeProgramMilestoneRollup([], new Date('2026-12-01T00:00:00.000Z')).currentMonth
      ).toBe('December 2026');
    });
  });

  describe('current month SP aggregation', () => {
    it('aggregates totalSP and completedSP for current-month milestones only', () => {
      // AC: program roll-up returns correct currentMonthCompletionPercent, SP totals
      const milestones: MilestoneProgressInput[] = [
        makeMilestoneInput('2026-02-01T00:00:00.000Z', 50, 20, 10), // current month
        makeMilestoneInput('2026-02-01T00:00:00.000Z', 100, 10, 10), // current month
        makeMilestoneInput('2026-03-01T00:00:00.000Z', 0, 15, 0), // next month — excluded
      ];
      const result = computeProgramMilestoneRollup(milestones, TODAY);
      expect(result.currentMonthTotalSP).toBe(30);
      expect(result.currentMonthCompletedSP).toBe(20);
    });

    it('computes correct currentMonthCompletionPercent (50%)', () => {
      const milestones: MilestoneProgressInput[] = [
        makeMilestoneInput('2026-02-01T00:00:00.000Z', null, 20, 10), // totalSP overridden
        makeMilestoneInput('2026-02-01T00:00:00.000Z', null, 20, 10),
      ];
      // Both have percentComplete=null (no SP), but we manually set totalSP/completedSP
      // Re-build with real SP values for this test
      const milestones2: MilestoneProgressInput[] = [
        {
          targetMonth: new Date('2026-02-01T00:00:00.000Z'),
          progress: {
            adoFeatureId: 1,
            totalSP: 20,
            completedSP: 10,
            percentComplete: 50,
            burnupData: [],
          },
          quarter: null,
        },
        {
          targetMonth: new Date('2026-02-01T00:00:00.000Z'),
          progress: {
            adoFeatureId: 2,
            totalSP: 20,
            completedSP: 10,
            percentComplete: 50,
            burnupData: [],
          },
          quarter: null,
        },
      ];
      const result = computeProgramMilestoneRollup(milestones2, TODAY);
      expect(result.currentMonthTotalSP).toBe(40);
      expect(result.currentMonthCompletedSP).toBe(20);
      expect(result.currentMonthCompletionPercent).toBe(50);
    });

    it('returns null currentMonthCompletionPercent when no current-month milestones exist', () => {
      const milestones: MilestoneProgressInput[] = [
        makeMilestoneInput('2026-03-01T00:00:00.000Z', 50),
      ];
      const result = computeProgramMilestoneRollup(milestones, TODAY);
      expect(result.currentMonthCompletionPercent).toBeNull();
      expect(result.currentMonthTotalSP).toBe(0);
      expect(result.currentMonthCompletedSP).toBe(0);
    });

    it('returns null currentMonthCompletionPercent when current-month milestones have no SP', () => {
      const milestones: MilestoneProgressInput[] = [
        {
          targetMonth: new Date('2026-02-01T00:00:00.000Z'),
          progress: null,
          quarter: null,
        },
      ];
      const result = computeProgramMilestoneRollup(milestones, TODAY);
      expect(result.currentMonthCompletionPercent).toBeNull();
    });
  });

  describe('quarterly milestones — driven by Qx tags', () => {
    it('counts milestones with quarter tags with correct statuses', () => {
      const milestones: MilestoneProgressInput[] = [
        { ...makeMilestoneInput('2026-01-01T00:00:00.000Z', 100), quarter: 'Q4' },
        { ...makeMilestoneInput('2026-02-01T00:00:00.000Z', 50), quarter: 'Q4' },
        { ...makeMilestoneInput('2026-03-01T00:00:00.000Z', 0), quarter: 'Q4' },
        makeMilestoneInput('2026-04-01T00:00:00.000Z', 100), // no quarter — excluded
      ];
      const result = computeProgramMilestoneRollup(milestones, TODAY);
      expect(result.quarterlyMilestones.total).toBe(3);
      expect(result.quarterlyMilestones.complete).toBe(1);
      expect(result.quarterlyMilestones.inProgress).toBe(1);
      expect(result.quarterlyMilestones.notStarted).toBe(1);
      expect(result.quarter).toBe('Q4');
    });

    it('treats null percentComplete (quarter-tagged) as notStarted', () => {
      const milestones: MilestoneProgressInput[] = [
        {
          targetMonth: new Date('2026-02-01T00:00:00.000Z'),
          progress: null,
          quarter: 'Q4',
        },
      ];
      const result = computeProgramMilestoneRollup(milestones, TODAY);
      expect(result.quarterlyMilestones.notStarted).toBe(1);
      expect(result.quarterlyMilestones.complete).toBe(0);
      expect(result.quarterlyMilestones.inProgress).toBe(0);
    });

    it('treats percentComplete=0 (quarter-tagged) as notStarted', () => {
      const milestones: MilestoneProgressInput[] = [
        { ...makeMilestoneInput('2026-02-01T00:00:00.000Z', 0), quarter: 'Q4' },
      ];
      const result = computeProgramMilestoneRollup(milestones, TODAY);
      expect(result.quarterlyMilestones.notStarted).toBe(1);
    });

    it('returns zero counts when no milestones have quarter tags', () => {
      const milestones: MilestoneProgressInput[] = [
        makeMilestoneInput('2026-02-01T00:00:00.000Z', 50), // no quarter
        makeMilestoneInput('2026-03-01T00:00:00.000Z', 100), // no quarter
      ];
      const result = computeProgramMilestoneRollup(milestones, TODAY);
      expect(result.quarterlyMilestones.total).toBe(0);
      expect(result.quarterlyMilestones.complete).toBe(0);
      expect(result.quarterlyMilestones.inProgress).toBe(0);
      expect(result.quarterlyMilestones.notStarted).toBe(0);
      expect(result.quarter).toBeNull();
    });

    it('counts multiple notStarted (0% + null progress) with quarter tags', () => {
      const milestones: MilestoneProgressInput[] = [
        { ...makeMilestoneInput('2026-02-01T00:00:00.000Z', 50), quarter: 'Q4' },
        { ...makeMilestoneInput('2026-02-01T00:00:00.000Z', 100), quarter: 'Q4' },
        { ...makeMilestoneInput('2026-02-01T00:00:00.000Z', 0), quarter: 'Q4' },
        {
          targetMonth: new Date('2026-02-01T00:00:00.000Z'),
          progress: null,
          quarter: 'Q4',
        },
      ];
      const result = computeProgramMilestoneRollup(milestones, TODAY);
      expect(result.quarterlyMilestones.total).toBe(4);
      expect(result.quarterlyMilestones.complete).toBe(1);
      expect(result.quarterlyMilestones.inProgress).toBe(1);
      expect(result.quarterlyMilestones.notStarted).toBe(2);
    });

    it('only counts milestones with quarter tags, ignores those without', () => {
      const aprilToday = new Date('2026-04-15T00:00:00.000Z');
      const milestones: MilestoneProgressInput[] = [
        makeMilestoneInput('2026-03-01T00:00:00.000Z', 100), // no quarter — excluded
        { ...makeMilestoneInput('2026-04-01T00:00:00.000Z', 100), quarter: 'Q1' }, // has quarter — included
        { ...makeMilestoneInput('2026-06-01T00:00:00.000Z', 50), quarter: 'Q1' }, //  has quarter — included
        makeMilestoneInput('2026-07-01T00:00:00.000Z', 0), //   no quarter — excluded
      ];
      const result = computeProgramMilestoneRollup(milestones, aprilToday);
      expect(result.quarterlyMilestones.total).toBe(2);
      expect(result.quarterlyMilestones.complete).toBe(1);
      expect(result.quarterlyMilestones.inProgress).toBe(1);
      expect(result.quarter).toBe('Q1');
    });
  });

  describe('empty input', () => {
    it('handles empty milestones array gracefully', () => {
      const result = computeProgramMilestoneRollup([], TODAY);
      expect(result.currentMonth).toBe('February 2026');
      expect(result.currentMonthTotalSP).toBe(0);
      expect(result.currentMonthCompletedSP).toBe(0);
      expect(result.currentMonthCompletionPercent).toBeNull();
      expect(result.quarterlyMilestones.total).toBe(0);
      expect(result.quarterlyMilestones.complete).toBe(0);
      expect(result.quarterlyMilestones.inProgress).toBe(0);
      expect(result.quarterlyMilestones.notStarted).toBe(0);
    });
  });
});
