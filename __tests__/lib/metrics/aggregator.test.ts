import { aggregateToProgram } from '@/lib/metrics/aggregator';
import type { ThresholdConfigInput, WorkstreamMetrics } from '@/lib/metrics/types';

// ---------------------------------------------------------------------------
// Shared fixtures
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

function makeWsMetrics(overrides: Partial<WorkstreamMetrics>): WorkstreamMetrics {
  return {
    workstreamId: 'ws-1',
    workstreamName: 'Streams',
    sprintId: 'sprint-1',
    sprintName: 'Sprint 26.21',
    velocity: { value: 20, average: 18, rag: 'Green' },
    overheadPercent: { value: 15, average: 12, rag: 'Green' },
    predictability: { value: 85, average: 80, rag: 'Green' },
    carryOverRate: { value: 10, average: 8, rag: 'Green' },
    carryOverItems: 2,
    carryOverPoints: 5,
    plannedPoints: 50,
    completedPoints: 40,
    overheadHours: 10,
    grossHours: 80,
    computedAt: new Date('2026-02-12'),
    ...overrides,
  };
}

// ============================================================================
// aggregateToProgram
// ============================================================================

describe('aggregateToProgram', () => {
  it('should aggregate 4 workstreams with weighted averages', () => {
    const wsMetrics: WorkstreamMetrics[] = [
      makeWsMetrics({
        workstreamId: 'ws-1',
        workstreamName: 'Streams',
        velocity: { value: 20, average: 18, rag: 'Green' },
        overheadPercent: { value: 10, average: 12, rag: 'Green' },
        predictability: { value: 80, average: 78, rag: 'Green' },
        carryOverRate: { value: 5, average: 8, rag: 'Green' },
        plannedPoints: 40,
        completedPoints: 32,
        overheadHours: 8,
        grossHours: 80,
      }),
      makeWsMetrics({
        workstreamId: 'ws-2',
        workstreamName: 'Pitch Tracker',
        velocity: { value: 15, average: 14, rag: 'Green' },
        overheadPercent: { value: 20, average: 18, rag: 'Green' },
        predictability: { value: 90, average: 85, rag: 'Green' },
        carryOverRate: { value: 8, average: 6, rag: 'Green' },
        plannedPoints: 30,
        completedPoints: 27,
        overheadHours: 12,
        grossHours: 60,
      }),
      makeWsMetrics({
        workstreamId: 'ws-3',
        workstreamName: 'Action Tracker',
        velocity: { value: 10, average: 12, rag: 'Amber' },
        overheadPercent: { value: 25, average: 22, rag: 'Green' },
        predictability: { value: 70, average: 75, rag: 'Amber' },
        carryOverRate: { value: 15, average: 12, rag: 'Amber' },
        plannedPoints: 20,
        completedPoints: 14,
        overheadHours: 10,
        grossHours: 40,
      }),
      makeWsMetrics({
        workstreamId: 'ws-4',
        workstreamName: 'KPI Services',
        velocity: { value: 25, average: 22, rag: 'Green' },
        overheadPercent: { value: 12, average: 10, rag: 'Green' },
        predictability: { value: 95, average: 90, rag: 'Green' },
        carryOverRate: { value: 3, average: 5, rag: 'Green' },
        plannedPoints: 50,
        completedPoints: 47,
        overheadHours: 6,
        grossHours: 100,
      }),
    ];

    const result = aggregateToProgram(wsMetrics, thresholds);

    expect(result).not.toBeNull();
    // Velocity is simple SUM
    expect(result!.velocity.value).toBe(70); // 20+15+10+25

    // Totals
    expect(result!.totalPlannedPoints).toBe(140); // 40+30+20+50
    expect(result!.totalCompletedPoints).toBe(120); // 32+27+14+47
    expect(result!.totalOverheadHours).toBe(36); // 8+12+10+6
    expect(result!.totalGrossHours).toBe(280); // 80+60+40+100
    expect(result!.workstreamCount).toBe(4);

    // Weighted overhead: (10*40 + 20*30 + 25*20 + 12*50) / (40+30+20+50)
    // = (400 + 600 + 500 + 600) / 140 = 2100/140 = 15
    expect(result!.overheadPercent.value).toBe(15);

    // Weighted predictability: (80*40 + 90*30 + 70*20 + 95*50) / 140
    // = (3200 + 2700 + 1400 + 4750) / 140 = 12050/140 = 86.07...
    expect(result!.predictability.value).toBeCloseTo(86.07, 1);

    // Weighted carryOver: (5*40 + 8*30 + 15*20 + 3*50) / 140
    // = (200 + 240 + 300 + 150) / 140 = 890/140 = 6.357...
    expect(result!.carryOverRate.value).toBeCloseTo(6.36, 1);
  });

  it('should skip workstreams with null metric values for weighted averages', () => {
    const wsMetrics: WorkstreamMetrics[] = [
      makeWsMetrics({
        workstreamId: 'ws-1',
        velocity: { value: 20, average: 18, rag: 'Green' },
        overheadPercent: { value: null, average: null, rag: null }, // null overhead
        predictability: { value: 85, average: 80, rag: 'Green' },
        carryOverRate: { value: 10, average: 8, rag: 'Green' },
        plannedPoints: 40,
        completedPoints: 34,
        overheadHours: null,
        grossHours: null,
      }),
      makeWsMetrics({
        workstreamId: 'ws-2',
        velocity: { value: 15, average: 14, rag: 'Green' },
        overheadPercent: { value: 20, average: 18, rag: 'Green' },
        predictability: { value: 90, average: 85, rag: 'Green' },
        carryOverRate: { value: 5, average: 6, rag: 'Green' },
        plannedPoints: 30,
        completedPoints: 27,
        overheadHours: 12,
        grossHours: 60,
      }),
    ];

    const result = aggregateToProgram(wsMetrics, thresholds);

    expect(result).not.toBeNull();
    // Velocity is still summed (null velocity → skipped)
    expect(result!.velocity.value).toBe(35); // 20+15

    // Overhead only from ws-2 (ws-1 skipped due to null)
    expect(result!.overheadPercent.value).toBe(20);

    // Predictability weighted: (85*40 + 90*30) / (40+30) = (3400+2700)/70 = 87.14
    expect(result!.predictability.value).toBeCloseTo(87.14, 1);
  });

  it('should return null when all workstreams have 0 planned points', () => {
    const wsMetrics: WorkstreamMetrics[] = [
      makeWsMetrics({
        workstreamId: 'ws-1',
        plannedPoints: 0,
        completedPoints: 0,
      }),
      makeWsMetrics({
        workstreamId: 'ws-2',
        plannedPoints: 0,
        completedPoints: 0,
      }),
    ];

    const result = aggregateToProgram(wsMetrics, thresholds);

    expect(result).not.toBeNull();
    // Weighted metrics should be null (no weight)
    expect(result!.overheadPercent.value).toBeNull();
    expect(result!.predictability.value).toBeNull();
    expect(result!.carryOverRate.value).toBeNull();
  });

  it('should handle single workstream', () => {
    const wsMetrics: WorkstreamMetrics[] = [
      makeWsMetrics({
        workstreamId: 'ws-1',
        velocity: { value: 25, average: 22, rag: 'Green' },
        overheadPercent: { value: 18, average: 15, rag: 'Green' },
        predictability: { value: 92, average: 88, rag: 'Green' },
        carryOverRate: { value: 7, average: 5, rag: 'Green' },
        plannedPoints: 50,
        completedPoints: 46,
        overheadHours: 9,
        grossHours: 80,
      }),
    ];

    const result = aggregateToProgram(wsMetrics, thresholds);

    expect(result).not.toBeNull();
    expect(result!.velocity.value).toBe(25);
    expect(result!.overheadPercent.value).toBe(18);
    expect(result!.predictability.value).toBe(92);
    expect(result!.carryOverRate.value).toBe(7);
    expect(result!.workstreamCount).toBe(1);
  });

  it('should return null when no workstream metrics provided', () => {
    const result = aggregateToProgram([], thresholds);
    expect(result).toBeNull();
  });

  it('should skip workstreams with null plannedPoints for weighted metrics', () => {
    const wsMetrics: WorkstreamMetrics[] = [
      makeWsMetrics({
        workstreamId: 'ws-1',
        velocity: { value: 20, average: 18, rag: 'Green' },
        overheadPercent: { value: 15, average: 12, rag: 'Green' },
        predictability: { value: 85, average: 80, rag: 'Green' },
        carryOverRate: { value: 10, average: 8, rag: 'Green' },
        plannedPoints: null, // null planned points
      }),
      makeWsMetrics({
        workstreamId: 'ws-2',
        velocity: { value: 15, average: 14, rag: 'Green' },
        overheadPercent: { value: 20, average: 18, rag: 'Green' },
        predictability: { value: 90, average: 85, rag: 'Green' },
        carryOverRate: { value: 5, average: 6, rag: 'Green' },
        plannedPoints: 30,
      }),
    ];

    const result = aggregateToProgram(wsMetrics, thresholds);

    expect(result).not.toBeNull();
    // Velocity still sums: 20 + 15 = 35
    expect(result!.velocity.value).toBe(35);
    // Weighted metrics only from ws-2 (ws-1 skipped due to null plannedPoints)
    expect(result!.overheadPercent.value).toBe(20);
    expect(result!.predictability.value).toBe(90);
    expect(result!.carryOverRate.value).toBe(5);
  });

  it('should assign RAG colors to aggregated metrics', () => {
    const wsMetrics: WorkstreamMetrics[] = [
      makeWsMetrics({
        workstreamId: 'ws-1',
        velocity: { value: 20, average: 18, rag: 'Green' },
        overheadPercent: { value: 15, average: 12, rag: 'Green' },
        predictability: { value: 85, average: 80, rag: 'Green' },
        carryOverRate: { value: 5, average: 8, rag: 'Green' },
        plannedPoints: 50,
      }),
    ];

    const result = aggregateToProgram(wsMetrics, thresholds);

    expect(result).not.toBeNull();
    // Velocity RAG: 20 >= 18 avg → Green
    expect(result!.velocity.rag).toBe('Green');
    // Overhead RAG: 15 in [0,30] → Green
    expect(result!.overheadPercent.rag).toBe('Green');
    // Predictability RAG: 85 in [80,100] → Green
    expect(result!.predictability.rag).toBe('Green');
    // CarryOver RAG: 5 in [0,10] → Green
    expect(result!.carryOverRate.rag).toBe('Green');
  });
});
