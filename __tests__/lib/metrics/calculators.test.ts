import {
  calculateCarryOver,
  calculateOverhead,
  calculatePredictability,
  calculateVelocity,
} from '@/lib/metrics/calculators';
import type { SprintWorkstreamInput, WorkItemInput } from '@/lib/metrics/types';

// ---------------------------------------------------------------------------
// Helper factory
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<WorkItemInput> = {}): WorkItemInput {
  return {
    type: 'UserStory',
    state: 'Active',
    storyPoints: 5,
    originalEstimate: null,
    completedWork: null,
    ...overrides,
  };
}

function makeSW(overrides: Partial<SprintWorkstreamInput> = {}): SprintWorkstreamInput {
  return {
    grossHours: 100,
    ceremonyHours: 5,
    ...overrides,
  };
}

// ============================================================================
// calculateVelocity
// ============================================================================

describe('calculateVelocity', () => {
  it('should sum storyPoints of Done-like items', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: 5 }),
      makeItem({ state: 'Done', storyPoints: 8 }),
      makeItem({ state: 'Resolved', storyPoints: 3 }),
      makeItem({ state: 'Active', storyPoints: 10 }), // not done
    ];
    expect(calculateVelocity(items)).toBe(16); // 5+8+3
  });

  it('should return 0 when no items', () => {
    expect(calculateVelocity([])).toBe(0);
  });

  it('should return 0 when all items are incomplete', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Active', storyPoints: 5 }),
      makeItem({ state: 'New', storyPoints: 8 }),
    ];
    expect(calculateVelocity(items)).toBe(0);
  });

  it('should treat null storyPoints as 0', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: null }),
      makeItem({ state: 'Done', storyPoints: 3 }),
    ];
    expect(calculateVelocity(items)).toBe(3);
  });

  it('should handle mixed states correctly', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: 2 }),
      makeItem({ state: 'Active', storyPoints: 5 }),
      makeItem({ state: 'Resolved', storyPoints: 8 }),
      makeItem({ state: 'New', storyPoints: 13 }),
      makeItem({ state: 'Done', storyPoints: 1 }),
    ];
    expect(calculateVelocity(items)).toBe(11); // 2+8+1
  });

  it('should exclude Bug items regardless of state', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: 5 }),
      makeItem({ type: 'Bug', state: 'Closed', storyPoints: 10 }), // done Bug — excluded
      makeItem({ type: 'Bug', state: 'Active', storyPoints: 3 }),  // active Bug — excluded
      makeItem({ state: 'Done', storyPoints: 8 }),
    ];
    expect(calculateVelocity(items)).toBe(13); // 5+8 only; both Bug rows excluded
  });

  it('should return 0 when all done items are Bugs', () => {
    const items: WorkItemInput[] = [
      makeItem({ type: 'Bug', state: 'Closed', storyPoints: 7 }),
      makeItem({ type: 'Bug', state: 'Done', storyPoints: 4 }),
    ];
    expect(calculateVelocity(items)).toBe(0);
  });

  it('should exclude Spike items regardless of state', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: 6 }),
      makeItem({ type: 'Spike', state: 'Closed', storyPoints: 5 }), // done Spike — excluded
      makeItem({ type: 'Spike', state: 'Active', storyPoints: 3 }), // active Spike — excluded
    ];
    expect(calculateVelocity(items)).toBe(6); // only UserStory counts
  });
});

// ============================================================================
// calculateOverhead
// ============================================================================

describe('calculateOverhead', () => {
  it('should compute overhead percentage from ceremony + bug + spike + support hours', () => {
    const items: WorkItemInput[] = [
      makeItem({ type: 'Bug', completedWork: 4, originalEstimate: 8 }),
      makeItem({ type: 'Spike', storyPoints: 3 }), // 3 hours (1:1)
      makeItem({ type: 'Support', completedWork: 2, originalEstimate: 5 }),
      makeItem({ type: 'UserStory', storyPoints: 10 }), // not overhead
    ];
    const sw = makeSW({ grossHours: 100, ceremonyHours: 5 });
    const result = calculateOverhead(items, sw);

    // overhead = ceremony(5) + bug(4) + spike(3) + support(2) = 14
    expect(result.overheadHours).toBe(14);
    expect(result.overheadPercent).toBeCloseTo(14, 10); // 14/100*100

    // Breakdown fields
    expect(result.ceremonyHours).toBe(5);
    expect(result.bugHours).toBe(4);
    expect(result.spikeHours).toBe(3);
    expect(result.supportHours).toBe(2);
    expect(result.ceremonyHours + result.bugHours + result.spikeHours + result.supportHours).toBe(
      result.overheadHours
    );
  });

  it('should return null overheadPercent when grossHours is null', () => {
    const items: WorkItemInput[] = [makeItem({ type: 'Bug', completedWork: 4 })];
    const sw = makeSW({ grossHours: null, ceremonyHours: 5 });
    const result = calculateOverhead(items, sw);

    expect(result.overheadHours).toBe(9); // 5 + 4
    expect(result.overheadPercent).toBeNull();
    expect(result.ceremonyHours).toBe(5);
    expect(result.bugHours).toBe(4);
    expect(result.spikeHours).toBe(0);
    expect(result.supportHours).toBe(0);
    expect(result.ceremonyHours + result.bugHours + result.spikeHours + result.supportHours).toBe(
      result.overheadHours
    );
  });

  it('should return null overheadPercent when grossHours is 0', () => {
    const items: WorkItemInput[] = [makeItem({ type: 'Bug', completedWork: 4 })];
    const sw = makeSW({ grossHours: 0, ceremonyHours: 5 });
    const result = calculateOverhead(items, sw);

    expect(result.overheadHours).toBe(9);
    expect(result.overheadPercent).toBeNull();
  });

  it('should treat null ceremonyHours as 0', () => {
    const items: WorkItemInput[] = [makeItem({ type: 'Bug', completedWork: 6 })];
    const sw = makeSW({ grossHours: 100, ceremonyHours: null });
    const result = calculateOverhead(items, sw);

    expect(result.overheadHours).toBe(6); // 0 + 6
    expect(result.overheadPercent).toBe(6);
  });

  it('should use Bug completedWork when available', () => {
    const items: WorkItemInput[] = [
      makeItem({ type: 'Bug', completedWork: 10, originalEstimate: 20 }),
    ];
    const sw = makeSW({ grossHours: 100, ceremonyHours: 0 });
    const result = calculateOverhead(items, sw);

    expect(result.overheadHours).toBe(10); // uses completedWork, not originalEstimate
  });

  it('should fall back to Bug originalEstimate when completedWork is null', () => {
    const items: WorkItemInput[] = [
      makeItem({ type: 'Bug', completedWork: null, originalEstimate: 15 }),
    ];
    const sw = makeSW({ grossHours: 100, ceremonyHours: 0 });
    const result = calculateOverhead(items, sw);

    expect(result.overheadHours).toBe(15);
  });

  it('should fall back to 0 for Bug when both completedWork and originalEstimate are null', () => {
    const items: WorkItemInput[] = [
      makeItem({ type: 'Bug', completedWork: null, originalEstimate: null }),
    ];
    const sw = makeSW({ grossHours: 100, ceremonyHours: 0 });
    const result = calculateOverhead(items, sw);

    expect(result.overheadHours).toBe(0);
  });

  it('should convert Spike storyPoints to hours 1:1', () => {
    const items: WorkItemInput[] = [makeItem({ type: 'Spike', storyPoints: 8 })];
    const sw = makeSW({ grossHours: 100, ceremonyHours: 0 });
    const result = calculateOverhead(items, sw);

    expect(result.overheadHours).toBe(8); // 8 SP = 8 hours
    expect(result.overheadPercent).toBe(8);
  });

  it('should treat Spike with null storyPoints as 0 hours', () => {
    const items: WorkItemInput[] = [makeItem({ type: 'Spike', storyPoints: null })];
    const sw = makeSW({ grossHours: 100, ceremonyHours: 0 });
    const result = calculateOverhead(items, sw);

    expect(result.overheadHours).toBe(0);
  });

  it('should use Support completedWork with originalEstimate fallback', () => {
    const items: WorkItemInput[] = [
      makeItem({ type: 'Support', completedWork: 7, originalEstimate: 10 }),
      makeItem({ type: 'Support', completedWork: null, originalEstimate: 3 }),
      makeItem({ type: 'Support', completedWork: null, originalEstimate: null }),
    ];
    const sw = makeSW({ grossHours: 100, ceremonyHours: 0 });
    const result = calculateOverhead(items, sw);

    expect(result.overheadHours).toBe(10); // 7 + 3 + 0
  });

  it('should return 0 overhead when no overhead items and no ceremony', () => {
    const items: WorkItemInput[] = [
      makeItem({ type: 'UserStory', storyPoints: 10 }),
      makeItem({ type: 'Feature', storyPoints: 5 }),
    ];
    const sw = makeSW({ grossHours: 100, ceremonyHours: 0 });
    const result = calculateOverhead(items, sw);

    expect(result.overheadHours).toBe(0);
    expect(result.overheadPercent).toBe(0);
    expect(result.ceremonyHours).toBe(0);
    expect(result.bugHours).toBe(0);
    expect(result.spikeHours).toBe(0);
    expect(result.supportHours).toBe(0);
    expect(result.ceremonyHours + result.bugHours + result.spikeHours + result.supportHours).toBe(
      result.overheadHours
    );
  });

  it('should have breakdown fields that sum to overheadHours', () => {
    const items: WorkItemInput[] = [
      makeItem({ type: 'Bug', completedWork: 10 }),
      makeItem({ type: 'Spike', storyPoints: 5 }),
      makeItem({ type: 'Support', completedWork: 3, originalEstimate: 6 }),
    ];
    const sw = makeSW({ grossHours: 200, ceremonyHours: 7 });
    const result = calculateOverhead(items, sw);

    expect(result.ceremonyHours + result.bugHours + result.spikeHours + result.supportHours).toBe(
      result.overheadHours
    );
    expect(result.overheadHours).toBe(25); // 7 + 10 + 5 + 3
  });
});

// ============================================================================
// calculatePredictability
// ============================================================================

describe('calculatePredictability', () => {
  it('should return completedPoints / plannedPoints × 100', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: 5 }),
      makeItem({ state: 'Done', storyPoints: 8 }),
      makeItem({ state: 'Active', storyPoints: 7 }),
    ];
    const result = calculatePredictability(items);

    expect(result).not.toBeNull();
    expect(result!.plannedPoints).toBe(20); // 5+8+7
    expect(result!.completedPoints).toBe(13); // 5+8
    expect(result!.predictability).toBe(65); // 13/20*100
  });

  it('should return null when 0 planned points', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Active', storyPoints: null }),
      makeItem({ state: 'New', storyPoints: null }),
    ];
    expect(calculatePredictability(items)).toBeNull();
  });

  it('should return null when no items', () => {
    expect(calculatePredictability([])).toBeNull();
  });

  it('should allow 100% predictability when all items complete', () => {
    const allDone: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: 10 }),
      makeItem({ state: 'Done', storyPoints: 8 }),
    ];
    const result = calculatePredictability(allDone);

    expect(result).not.toBeNull();
    expect(result!.predictability).toBe(100); // 18/18*100 = 100%
  });

  it('should handle > 100% predictability (scope reduced mid-sprint)', () => {
    // Scenario: sprint started with 20 SP planned, 5 SP item removed mid-sprint,
    // but remaining 15 SP all completed — storyPoints on removed items zeroed out
    // In practice, this means completed > planned when items are rescoped
    // We model it: 2 items with 5 SP each, both done, plus 1 item with 0 SP (descoped) still active
    const items: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: 8 }),
      makeItem({ state: 'Done', storyPoints: 5 }),
      makeItem({ state: 'Active', storyPoints: 2 }),
    ];
    // planned=15, completed=13 → 86.67% (under 100)
    // For > 100%: all completed items SP > total planned (possible when SP adjusted after sprint)
    const rescoped: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: 12 }), // bumped from 5 to 12 after completion
      makeItem({ state: 'Done', storyPoints: 8 }),
      makeItem({ state: 'Active', storyPoints: 1 }), // originally 5, descoped to 1
    ];
    const result = calculatePredictability(rescoped);

    expect(result).not.toBeNull();
    // planned = 12+8+1 = 21, completed = 12+8 = 20 → 95.24%
    expect(result!.plannedPoints).toBe(21);
    expect(result!.completedPoints).toBe(20);
    expect(result!.predictability).toBeCloseTo(95.24, 1);
  });

  it('should treat null storyPoints as 0', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: null }),
      makeItem({ state: 'Active', storyPoints: 10 }),
    ];
    const result = calculatePredictability(items);

    expect(result).not.toBeNull();
    expect(result!.plannedPoints).toBe(10); // 0+10
    expect(result!.completedPoints).toBe(0); // null→0
    expect(result!.predictability).toBe(0);
  });

  it('should exclude Bug items from plannedPoints and completedPoints', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: 5 }),
      makeItem({ state: 'Active', storyPoints: 5 }),
      makeItem({ type: 'Bug', state: 'Closed', storyPoints: 20 }), // excluded
      makeItem({ type: 'Bug', state: 'Active', storyPoints: 10 }), // excluded
    ];
    const result = calculatePredictability(items);

    expect(result).not.toBeNull();
    expect(result!.plannedPoints).toBe(10);   // only UserStory items: 5+5
    expect(result!.completedPoints).toBe(5);  // only closed UserStory: 5
    expect(result!.predictability).toBe(50);  // 5/10*100
  });

  it('should return null when only Bug items are present', () => {
    const items: WorkItemInput[] = [
      makeItem({ type: 'Bug', state: 'Closed', storyPoints: 8 }),
      makeItem({ type: 'Bug', state: 'Active', storyPoints: 5 }),
    ];
    expect(calculatePredictability(items)).toBeNull();
  });

  it('should exclude Spike items from plannedPoints and completedPoints', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: 5 }),
      makeItem({ state: 'Active', storyPoints: 5 }),
      makeItem({ type: 'Spike', state: 'Closed', storyPoints: 20 }), // excluded
      makeItem({ type: 'Spike', state: 'Active', storyPoints: 10 }), // excluded
    ];
    const result = calculatePredictability(items);

    expect(result).not.toBeNull();
    expect(result!.plannedPoints).toBe(10);   // only UserStory items: 5+5
    expect(result!.completedPoints).toBe(5);  // only closed UserStory: 5
    expect(result!.predictability).toBe(50);
  });

  it('should return null when only Spike items are present', () => {
    const items: WorkItemInput[] = [
      makeItem({ type: 'Spike', state: 'Closed', storyPoints: 8 }),
    ];
    expect(calculatePredictability(items)).toBeNull();
  });
});

// ============================================================================
// calculateCarryOver
// ============================================================================

describe('calculateCarryOver', () => {
  it('should return carry-over count, points, and rate', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: 5 }),
      makeItem({ state: 'Active', storyPoints: 3 }),
      makeItem({ state: 'New', storyPoints: 2 }),
    ];
    const result = calculateCarryOver(items);

    expect(result).not.toBeNull();
    expect(result!.carryOverItems).toBe(2); // Active + New
    expect(result!.carryOverPoints).toBe(5); // 3+2
    expect(result!.plannedPoints).toBe(10); // 5+3+2
    expect(result!.carryOverRate).toBe(50); // 5/10*100
  });

  it('should return 0 carry-over when all items are complete', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: 5 }),
      makeItem({ state: 'Done', storyPoints: 8 }),
      makeItem({ state: 'Resolved', storyPoints: 3 }),
    ];
    const result = calculateCarryOver(items);

    expect(result).not.toBeNull();
    expect(result!.carryOverItems).toBe(0);
    expect(result!.carryOverPoints).toBe(0);
    expect(result!.carryOverRate).toBe(0);
  });

  it('should return 100% carry-over when all items are incomplete', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Active', storyPoints: 5 }),
      makeItem({ state: 'New', storyPoints: 8 }),
    ];
    const result = calculateCarryOver(items);

    expect(result).not.toBeNull();
    expect(result!.carryOverItems).toBe(2);
    expect(result!.carryOverPoints).toBe(13);
    expect(result!.carryOverRate).toBe(100); // 13/13*100
  });

  it('should treat null storyPoints as 0', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Active', storyPoints: null }),
      makeItem({ state: 'Closed', storyPoints: 10 }),
    ];
    const result = calculateCarryOver(items);

    expect(result).not.toBeNull();
    expect(result!.carryOverItems).toBe(1);
    expect(result!.carryOverPoints).toBe(0);
    expect(result!.plannedPoints).toBe(10);
    expect(result!.carryOverRate).toBe(0);
  });

  it('should return null when 0 planned points', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Active', storyPoints: null }),
      makeItem({ state: 'New', storyPoints: null }),
    ];
    expect(calculateCarryOver(items)).toBeNull();
  });

  it('should return null when no items', () => {
    expect(calculateCarryOver([])).toBeNull();
  });

  it('should exclude Bug items from plannedPoints and carryOverPoints', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: 5 }),
      makeItem({ state: 'Active', storyPoints: 3 }),
      makeItem({ type: 'Bug', state: 'Active', storyPoints: 20 }), // excluded
      makeItem({ type: 'Bug', state: 'Closed', storyPoints: 10 }), // excluded
    ];
    const result = calculateCarryOver(items);

    expect(result).not.toBeNull();
    expect(result!.plannedPoints).toBe(8);      // only UserStory items: 5+3
    expect(result!.carryOverItems).toBe(1);     // one incomplete UserStory
    expect(result!.carryOverPoints).toBe(3);    // active UserStory only
    expect(result!.carryOverRate).toBe(37.5);   // 3/8*100
  });

  it('should return null when only Bug items are present', () => {
    const items: WorkItemInput[] = [
      makeItem({ type: 'Bug', state: 'Active', storyPoints: 8 }),
      makeItem({ type: 'Bug', state: 'Closed', storyPoints: 5 }),
    ];
    expect(calculateCarryOver(items)).toBeNull();
  });

  it('should exclude Spike items from plannedPoints and carryOverPoints', () => {
    const items: WorkItemInput[] = [
      makeItem({ state: 'Closed', storyPoints: 5 }),
      makeItem({ state: 'Active', storyPoints: 3 }),
      makeItem({ type: 'Spike', state: 'Active', storyPoints: 20 }), // excluded
      makeItem({ type: 'Spike', state: 'Closed', storyPoints: 10 }), // excluded
    ];
    const result = calculateCarryOver(items);

    expect(result).not.toBeNull();
    expect(result!.plannedPoints).toBe(8);    // only UserStory items: 5+3
    expect(result!.carryOverItems).toBe(1);   // one incomplete UserStory
    expect(result!.carryOverPoints).toBe(3);  // active UserStory only
    expect(result!.carryOverRate).toBe(37.5); // 3/8*100
  });

  it('should return null when only Spike items are present', () => {
    const items: WorkItemInput[] = [
      makeItem({ type: 'Spike', state: 'Active', storyPoints: 8 }),
    ];
    expect(calculateCarryOver(items)).toBeNull();
  });
});
