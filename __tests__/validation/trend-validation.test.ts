/**
 * Trend Series & Prediction Validation Tests
 *
 * Validates buildTrendSeries and velocity rate formulas using realistic
 * multi-sprint fixtures with hand-computed expected outputs.
 * Verifies trend aggregation and prediction correctness end-to-end.
 */

import {
  buildTrendSeries,
  calculateNetCapacityHours,
  calculateVelocityRate,
} from '@/lib/metrics/trend-service';
import type { TrendSnapshotInput, TrendSprintRef } from '@/lib/metrics/trend-service';

// ---------------------------------------------------------------------------
// Fixtures: 4 prior sprints + 1 current (Sprint 5)
// ---------------------------------------------------------------------------

const rollingSprintsDesc: TrendSprintRef[] = [
  {
    id: 's5',
    name: 'Sprint 5',
    startDate: new Date('2026-02-17'),
    endDate: new Date('2026-03-02'),
  },
  {
    id: 's4',
    name: 'Sprint 4',
    startDate: new Date('2026-02-03'),
    endDate: new Date('2026-02-16'),
  },
  {
    id: 's3',
    name: 'Sprint 3',
    startDate: new Date('2026-01-20'),
    endDate: new Date('2026-02-02'),
  },
  {
    id: 's2',
    name: 'Sprint 2',
    startDate: new Date('2026-01-06'),
    endDate: new Date('2026-01-19'),
  },
  {
    id: 's1',
    name: 'Sprint 1',
    startDate: new Date('2025-12-23'),
    endDate: new Date('2026-01-05'),
  },
];

// Snapshots: ws-1 and ws-2 across 5 sprints
// Sprint 1: ws-1 vel=20,gross=80,OH=20; ws-2 vel=15,gross=60,OH=10
// Sprint 2: ws-1 vel=25,gross=80,OH=20; ws-2 vel=18,gross=60,OH=10
// Sprint 3: ws-1 vel=22,gross=80,OH=20; ws-2 vel=12,gross=60,OH=10
// Sprint 4: ws-1 vel=28,gross=80,OH=20; ws-2 vel=20,gross=60,OH=10
// Sprint 5 (current): ws-1 gross=100,OH=20; ws-2 gross=60,OH=10 (no velocity yet)
const trendSnapshots: TrendSnapshotInput[] = [
  { sprintId: 's1', workstreamId: 'ws-1', velocity: 20, grossHours: 80, overheadHours: 20 },
  { sprintId: 's1', workstreamId: 'ws-2', velocity: 15, grossHours: 60, overheadHours: 10 },
  { sprintId: 's2', workstreamId: 'ws-1', velocity: 25, grossHours: 80, overheadHours: 20 },
  { sprintId: 's2', workstreamId: 'ws-2', velocity: 18, grossHours: 60, overheadHours: 10 },
  { sprintId: 's3', workstreamId: 'ws-1', velocity: 22, grossHours: 80, overheadHours: 20 },
  { sprintId: 's3', workstreamId: 'ws-2', velocity: 12, grossHours: 60, overheadHours: 10 },
  { sprintId: 's4', workstreamId: 'ws-1', velocity: 28, grossHours: 80, overheadHours: 20 },
  { sprintId: 's4', workstreamId: 'ws-2', velocity: 20, grossHours: 60, overheadHours: 10 },
  { sprintId: 's5', workstreamId: 'ws-1', velocity: null, grossHours: 100, overheadHours: 20 },
  { sprintId: 's5', workstreamId: 'ws-2', velocity: null, grossHours: 60, overheadHours: 10 },
];

const emptyBugItems = [
  { sprintId: 's1', workstreamId: 'ws-1', state: 'Closed' },
  { sprintId: 's1', workstreamId: 'ws-2', state: 'Closed' },
  { sprintId: 's2', workstreamId: 'ws-1', state: 'Closed' },
  { sprintId: 's2', workstreamId: 'ws-2', state: 'Closed' },
  { sprintId: 's3', workstreamId: 'ws-1', state: 'Closed' },
  { sprintId: 's3', workstreamId: 'ws-2', state: 'Closed' },
  { sprintId: 's4', workstreamId: 'ws-1', state: 'Closed' },
  { sprintId: 's4', workstreamId: 'ws-2', state: 'Closed' },
];

// ============================================================================
// Test Suite
// ============================================================================

describe('Trend Series & Prediction Validation', () => {
  describe('Velocity Rate Formula', () => {
    it('rate = velocity / (grossHours - overheadHours)', () => {
      const net = calculateNetCapacityHours(80, 20);
      expect(net).toBe(60);
      expect(calculateVelocityRate(20, net)).toBeCloseTo(0.33, 2);
    });

    it('handles null/zero denominators', () => {
      expect(calculateVelocityRate(30, null)).toBeNull();
      expect(calculateVelocityRate(30, 0)).toBeNull();
      expect(calculateVelocityRate(30, undefined)).toBeNull();
    });

    it('handles null numerator', () => {
      expect(calculateVelocityRate(null, 60)).toBeNull();
    });
  });

  describe('Single Workstream Trends', () => {
    it('builds 4-sprint trend with correct velocity and velocity rates', () => {
      const result = buildTrendSeries({
        rollingSprintsDesc,
        currentSprintId: 's5',
        snapshots: trendSnapshots,
        bugItems: emptyBugItems,
        workstreamId: 'ws-1',
      });

      expect(result.sprints).toHaveLength(5); // s1..s4 (actual) + s5 (current)

      // Sprint 1: vel=20, net=60, rate rounded to 2 decimals
      expect(result.sprints[0]).toMatchObject({
        sprintId: 's1',
        sprintName: 'Sprint 1',
        velocity: 20,
        velocityRate: 0.33,
        mode: 'actual',
      });

      // Sprint 4: vel=28, net=60
      expect(result.sprints[3]).toMatchObject({
        sprintId: 's4',
        velocity: 28,
        velocityRate: 0.47,
      });
    });

    it('computes Sprint 5 prediction: avg velocity rate × current net capacity', () => {
      const result = buildTrendSeries({
        rollingSprintsDesc,
        currentSprintId: 's5',
        snapshots: trendSnapshots,
        bugItems: emptyBugItems,
        workstreamId: 'ws-1',
      });

      // Per-sprint rates are rounded before averaging (see trend-service)
      expect(result.prediction.mode).toBe('predicted');
      expect(result.prediction.velocity).toBeCloseTo(32, 0);
      expect(result.prediction.formula).toContain('average velocity rate');
    });
  });

  describe('Program-Level Trends (Multi-Workstream)', () => {
    it('aggregates velocity and net capacity across workstreams per sprint', () => {
      const result = buildTrendSeries({
        rollingSprintsDesc,
        currentSprintId: 's5',
        snapshots: trendSnapshots,
        bugItems: emptyBugItems,
        // no workstreamId = program level
      });

      expect(result.sprints).toHaveLength(5); // s1..s4 (actual) + s5 (current)

      // Sprint 1: vel=20+15=35, net=60+50=110
      expect(result.sprints[0]).toMatchObject({
        sprintId: 's1',
        velocity: 35,
        velocityRate: 0.32,
      });

      // Sprint 4: vel=28+20=48, net=60+50=110
      expect(result.sprints[3]).toMatchObject({
        sprintId: 's4',
        velocity: 48,
        velocityRate: 0.44,
      });
    });

    it('program prediction uses aggregated avg rate × aggregated net capacity', () => {
      const result = buildTrendSeries({
        rollingSprintsDesc,
        currentSprintId: 's5',
        snapshots: trendSnapshots,
        bugItems: emptyBugItems,
      });

      // Program-level rates use rounded per-sprint velocity rates before averaging
      expect(result.prediction.velocity).toBeCloseTo(48.1, 1);
    });
  });
});
