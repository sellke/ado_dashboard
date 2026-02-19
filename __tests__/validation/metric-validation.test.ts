/**
 * End-to-End Metric Validation Tests
 *
 * Validates the core metric calculators and program-level aggregation using
 * realistic, sprint-like fixtures with hand-computed expected outputs.
 * These tests verify correctness of the calculation formulas end-to-end.
 */

import { aggregateToProgram } from '@/lib/metrics/aggregator';
import {
  calculateCarryOver,
  calculateOverhead,
  calculateVelocity,
} from '@/lib/metrics/calculators';
import type {
  SprintWorkstreamInput,
  ThresholdConfigInput,
  WorkItemInput,
  WorkstreamMetrics,
} from '@/lib/metrics/types';

// ---------------------------------------------------------------------------
// Realistic Fixtures: Workstream Alpha
// ---------------------------------------------------------------------------

const workstreamAlphaItems: WorkItemInput[] = [
  {
    type: 'UserStory',
    state: 'Closed',
    storyPoints: 20,
    originalEstimate: null,
    completedWork: null,
  },
  {
    type: 'UserStory',
    state: 'Done',
    storyPoints: 10,
    originalEstimate: null,
    completedWork: null,
  },
  {
    type: 'UserStory',
    state: 'Active',
    storyPoints: 10,
    originalEstimate: null,
    completedWork: null,
  },
  {
    type: 'Bug',
    state: 'Closed',
    storyPoints: null,
    originalEstimate: 8,
    completedWork: 5,
  },
  { type: 'Spike', state: 'Active', storyPoints: 5, originalEstimate: null, completedWork: null },
  {
    type: 'Support',
    state: 'Done',
    storyPoints: null,
    originalEstimate: 5,
    completedWork: 5,
  },
];

const sprintWorkstreamAlpha: SprintWorkstreamInput = {
  grossHours: 100,
  ceremonyHours: 5,
};

// Expected Alpha: velocity=30, overhead=20h/20%, planned=45, carryOver=15pts/33.33%

// ---------------------------------------------------------------------------
// Realistic Fixtures: Workstream Beta
// ---------------------------------------------------------------------------

const workstreamBetaItems: WorkItemInput[] = [
  {
    type: 'UserStory',
    state: 'Closed',
    storyPoints: 15,
    originalEstimate: null,
    completedWork: null,
  },
  {
    type: 'UserStory',
    state: 'Done',
    storyPoints: 15,
    originalEstimate: null,
    completedWork: null,
  },
  {
    type: 'UserStory',
    state: 'Active',
    storyPoints: 10,
    originalEstimate: null,
    completedWork: null,
  },
  {
    type: 'Bug',
    state: 'Closed',
    storyPoints: null,
    originalEstimate: 5,
    completedWork: 3,
  },
  { type: 'Spike', state: 'Done', storyPoints: 2, originalEstimate: null, completedWork: null },
  {
    type: 'Support',
    state: 'Closed',
    storyPoints: null,
    originalEstimate: 5,
    completedWork: 5,
  },
];

const sprintWorkstreamBeta: SprintWorkstreamInput = {
  grossHours: 80,
  ceremonyHours: 10,
};

// Expected Beta: velocity=32, overhead=20h/25%, planned=42, carryOver=10pts/23.81%

// ---------------------------------------------------------------------------
// Threshold config for RAG assignment (aggregator)
// ---------------------------------------------------------------------------

const thresholds: ThresholdConfigInput[] = [
  {
    metricName: 'sprintPredictability',
    greenMin: 80,
    greenMax: 100,
    amberMin: 60,
    amberMax: 79.99,
  },
  { metricName: 'carryOverRate', greenMin: 0, greenMax: 10, amberMin: 10.01, amberMax: 25 },
  { metricName: 'overheadPercent', greenMin: 0, greenMax: 30, amberMin: 30.01, amberMax: 45 },
];

// ---------------------------------------------------------------------------
// Helper: Build WorkstreamMetrics from calculator results for aggregator
// ---------------------------------------------------------------------------

function buildWorkstreamMetrics(
  workstreamId: string,
  workstreamName: string,
  sprintId: string,
  sprintName: string,
  items: WorkItemInput[],
  sw: SprintWorkstreamInput
): WorkstreamMetrics {
  const velocity = calculateVelocity(items);
  const overhead = calculateOverhead(items, sw);
  const carryOver = calculateCarryOver(items);

  const plannedPoints = items.reduce((sum, wi) => sum + (wi.storyPoints ?? 0), 0);
  const completedPoints = items
    .filter((wi) => ['Closed', 'Done', 'Resolved'].includes(wi.state))
    .reduce((sum, wi) => sum + (wi.storyPoints ?? 0), 0);

  const toMetric = (value: number | null) => ({
    value,
    average: value,
    rag: 'Green' as const,
  });

  return {
    workstreamId,
    workstreamName,
    sprintId,
    sprintName,
    velocity: toMetric(velocity),
    overheadPercent: toMetric(overhead.overheadPercent),
    predictability: toMetric(plannedPoints > 0 ? (completedPoints / plannedPoints) * 100 : null),
    carryOverRate: toMetric(carryOver?.carryOverRate ?? null),
    carryOverItems: carryOver?.carryOverItems ?? null,
    carryOverPoints: carryOver?.carryOverPoints ?? null,
    plannedPoints,
    completedPoints,
    overheadHours: overhead.overheadHours,
    grossHours: sw.grossHours,
    computedAt: new Date(),
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('End-to-End Metric Validation', () => {
  describe('Velocity Calculation', () => {
    it('workstream Alpha: sums done-like items SP correctly', () => {
      // Done-like: Closed(20), Done(10), Bug Closed(null→0), Support Done(null→0)
      // Spike Active is NOT done-like
      const result = calculateVelocity(workstreamAlphaItems);
      expect(result).toBe(30); // 20 + 10
    });

    it('workstream Beta: sums done-like items SP correctly', () => {
      // Done-like: Closed(15), Done(15), Bug Closed(null→0), Spike Done(2), Support Closed(null→0)
      const result = calculateVelocity(workstreamBetaItems);
      expect(result).toBe(32); // 15 + 15 + 2
    });
  });

  describe('Overhead % Calculation', () => {
    it('workstream Alpha: (ceremony + bug + spike + support) / gross × 100', () => {
      const result = calculateOverhead(workstreamAlphaItems, sprintWorkstreamAlpha);
      // ceremony(5) + bug(5) + spike(5) + support(5) = 20
      expect(result.overheadHours).toBe(20);
      expect(result.overheadPercent).toBe(20); // 20/100 × 100
    });

    it('workstream Beta: (ceremony + bug + spike + support) / gross × 100', () => {
      const result = calculateOverhead(workstreamBetaItems, sprintWorkstreamBeta);
      // ceremony(10) + bug(3) + spike(2) + support(5) = 20
      expect(result.overheadHours).toBe(20);
      expect(result.overheadPercent).toBe(25); // 20/80 × 100
    });
  });

  describe('Carry-Over % Calculation', () => {
    it('workstream Alpha: carryOverPoints / plannedPoints × 100', () => {
      const result = calculateCarryOver(workstreamAlphaItems);
      expect(result).not.toBeNull();
      // Incomplete: Active US(10), Active Spike(5) → 2 items, 15 points
      expect(result!.carryOverItems).toBe(2);
      expect(result!.carryOverPoints).toBe(15);
      expect(result!.plannedPoints).toBe(45); // 20+10+10+0+5+0
      expect(result!.carryOverRate).toBeCloseTo(33.33, 1); // 15/45 × 100
    });

    it('workstream Beta: carryOverPoints / plannedPoints × 100', () => {
      const result = calculateCarryOver(workstreamBetaItems);
      expect(result).not.toBeNull();
      // Incomplete: Active US(10) only → 1 item, 10 points
      expect(result!.carryOverItems).toBe(1);
      expect(result!.carryOverPoints).toBe(10);
      expect(result!.plannedPoints).toBe(42); // 15+15+10+0+2+0
      expect(result!.carryOverRate).toBeCloseTo(23.81, 1); // 10/42 × 100
    });
  });

  describe('Program-Level Aggregation', () => {
    it('program velocity = sum of workstream velocities', () => {
      const alphaMetrics = buildWorkstreamMetrics(
        'ws-alpha',
        'Alpha',
        'sprint-1',
        'Sprint 1',
        workstreamAlphaItems,
        sprintWorkstreamAlpha
      );
      const betaMetrics = buildWorkstreamMetrics(
        'ws-beta',
        'Beta',
        'sprint-1',
        'Sprint 1',
        workstreamBetaItems,
        sprintWorkstreamBeta
      );

      const program = aggregateToProgram([alphaMetrics, betaMetrics], thresholds);
      expect(program).not.toBeNull();
      expect(program!.velocity.value).toBe(62); // 30 + 32
    });

    it('program overhead% = weighted average by planned points', () => {
      const alphaMetrics = buildWorkstreamMetrics(
        'ws-alpha',
        'Alpha',
        'sprint-1',
        'Sprint 1',
        workstreamAlphaItems,
        sprintWorkstreamAlpha
      );
      const betaMetrics = buildWorkstreamMetrics(
        'ws-beta',
        'Beta',
        'sprint-1',
        'Sprint 1',
        workstreamBetaItems,
        sprintWorkstreamBeta
      );

      const program = aggregateToProgram([alphaMetrics, betaMetrics], thresholds);
      expect(program).not.toBeNull();
      // (20×45 + 25×42) / (45+42) = (900+1050)/87 = 22.41
      expect(program!.overheadPercent.value).toBeCloseTo(22.41, 1);
    });

    it('program carryOver% = weighted average by planned points', () => {
      const alphaMetrics = buildWorkstreamMetrics(
        'ws-alpha',
        'Alpha',
        'sprint-1',
        'Sprint 1',
        workstreamAlphaItems,
        sprintWorkstreamAlpha
      );
      const betaMetrics = buildWorkstreamMetrics(
        'ws-beta',
        'Beta',
        'sprint-1',
        'Sprint 1',
        workstreamBetaItems,
        sprintWorkstreamBeta
      );

      const program = aggregateToProgram([alphaMetrics, betaMetrics], thresholds);
      expect(program).not.toBeNull();
      // (33.33×45 + 23.81×42) / 87 ≈ 28.74
      expect(program!.carryOverRate.value).toBeCloseTo(28.74, 1);
    });

    it('total planned/completed/overhead/gross match sums', () => {
      const alphaMetrics = buildWorkstreamMetrics(
        'ws-alpha',
        'Alpha',
        'sprint-1',
        'Sprint 1',
        workstreamAlphaItems,
        sprintWorkstreamAlpha
      );
      const betaMetrics = buildWorkstreamMetrics(
        'ws-beta',
        'Beta',
        'sprint-1',
        'Sprint 1',
        workstreamBetaItems,
        sprintWorkstreamBeta
      );

      const program = aggregateToProgram([alphaMetrics, betaMetrics], thresholds);
      expect(program).not.toBeNull();
      expect(program!.totalPlannedPoints).toBe(87); // 45 + 42
      expect(program!.totalCompletedPoints).toBe(62); // 30 + 32 (velocity = completed)
      expect(program!.totalOverheadHours).toBe(40); // 20 + 20
      expect(program!.totalGrossHours).toBe(180); // 100 + 80
      expect(program!.workstreamCount).toBe(2);
    });
  });
});
