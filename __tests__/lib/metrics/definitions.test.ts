/**
 * Tests for the metric definitions registry.
 * Locks copy structure, helper formatting, RAG presence, and seed-threshold alignment.
 */

import {
  METRIC_DEFINITIONS,
  getMetricTooltip,
  getRagTooltip,
  type MetricId,
} from '@/lib/metrics/definitions';
import { thresholdConfigs } from '../../../prisma/seed';

const ALL_METRIC_IDS: MetricId[] = [
  'velocity',
  'velocityRate',
  'overheadPercent',
  'carryOverRate',
  'chartVelocity',
  'chartBugBurndown',
];

const RAG_METRIC_IDS: MetricId[] = ['velocity', 'overheadPercent', 'carryOverRate'];
const NON_RAG_METRIC_IDS: MetricId[] = ['velocityRate', 'chartVelocity', 'chartBugBurndown'];

describe('metric definitions registry', () => {
  describe('METRIC_DEFINITIONS', () => {
    it('covers every MetricId with non-empty definition and calculation', () => {
      for (const id of ALL_METRIC_IDS) {
        const def = METRIC_DEFINITIONS[id];
        expect(def).toBeDefined();
        expect(def.definition.length).toBeGreaterThan(0);
        expect(def.calculation.length).toBeGreaterThan(0);
      }
    });

    it('has exactly the in-scope MetricId keys (no extras, no gaps)', () => {
      expect(Object.keys(METRIC_DEFINITIONS).sort()).toEqual([...ALL_METRIC_IDS].sort());
    });
  });

  describe('getMetricTooltip', () => {
    it('returns a multiline Definition/Calculation body for every MetricId', () => {
      for (const id of ALL_METRIC_IDS) {
        const body = getMetricTooltip(id);
        const lines = body.split('\n');
        expect(lines).toHaveLength(2);
        expect(lines[0].startsWith('Definition: ')).toBe(true);
        expect(lines[1].startsWith('Calculation: ')).toBe(true);
        expect(lines[0]).toContain(METRIC_DEFINITIONS[id].definition);
        expect(lines[1]).toContain(METRIC_DEFINITIONS[id].calculation);
      }
    });

    it('returns an empty string for an unknown id (defensive)', () => {
      expect(getMetricTooltip('bogus' as MetricId)).toBe('');
    });

    it('encodes scope qualifiers for shared program/workstream metrics', () => {
      expect(getMetricTooltip('velocity')).toMatch(/rolling average/i);
      expect(getMetricTooltip('velocity')).toMatch(/program tile/i);
      expect(getMetricTooltip('overheadPercent')).toMatch(/weighted average/i);
      expect(getMetricTooltip('carryOverRate')).toMatch(/weighted average/i);
    });

    it('reflects velocity Done-like states and Bug/Spike exclusion', () => {
      const body = getMetricTooltip('velocity');
      expect(body).toMatch(/Closed, Done, Resolved/);
      expect(body).toMatch(/Bugs and Spikes excluded/i);
    });

    it('reflects the velocity-rate net-capacity denominator', () => {
      const body = getMetricTooltip('velocityRate');
      expect(body).toMatch(/gross hours.{0,3}.{0,3}overhead hours/i);
    });
  });

  describe('getRagTooltip', () => {
    it('returns RAG copy for RAG-bearing metrics', () => {
      for (const id of RAG_METRIC_IDS) {
        const rag = getRagTooltip(id);
        expect(rag).not.toBeNull();
        expect(rag!.length).toBeGreaterThan(0);
      }
    });

    it('returns null for non-RAG metrics', () => {
      for (const id of NON_RAG_METRIC_IDS) {
        expect(getRagTooltip(id)).toBeNull();
      }
    });

    it('returns null for an unknown id', () => {
      expect(getRagTooltip('bogus' as MetricId)).toBeNull();
    });

    it('velocity RAG copy matches the trend rules in rag.ts (100% / 70% thresholds)', () => {
      const rag = getRagTooltip('velocity')!;
      expect(rag).toMatch(/rolling average/i);
      expect(rag).toMatch(/100%/);
      expect(rag).toMatch(/70/);
    });

    it('overhead RAG copy matches seeded ThresholdConfig (0–30 / 30.01–45 / >45)', () => {
      const rag = getRagTooltip('overheadPercent')!;
      expect(rag).toContain('0–30%');
      expect(rag).toContain('30.01–45%');
      expect(rag).toMatch(/45%/);
    });

    it('carry-over RAG copy matches seeded ThresholdConfig (0–10 / 10.01–25 / >25)', () => {
      const rag = getRagTooltip('carryOverRate')!;
      expect(rag).toContain('0–10%');
      expect(rag).toContain('10.01–25%');
      expect(rag).toMatch(/25%/);
    });
  });

  describe('seed threshold drift guard', () => {
    const seedFor = (metricName: string) => {
      const config = thresholdConfigs.find((t) => t.metricName === metricName);
      if (!config) {
        throw new Error(`Missing seeded ThresholdConfig for ${metricName}`);
      }
      return config;
    };

    // The registry MetricId maps onto the same metricName used in prisma/seed.ts
    // for threshold-based metrics. Velocity is trend-based (no ThresholdConfig row).
    it.each(['overheadPercent', 'carryOverRate'] as const)(
      '%s RAG copy reflects the exact seeded green/amber/red boundaries',
      (metricId) => {
        const config = seedFor(metricId);
        const rag = getRagTooltip(metricId)!;

        // Green range: greenMin–greenMax
        expect(rag).toContain(`${config.greenMin}–${config.greenMax}%`);
        // Amber range: amberMin–amberMax
        expect(rag).toContain(`${config.amberMin}–${config.amberMax}%`);
        // Red boundary: copy says "above {greenMax}/{amberMax}" — assert the amber ceiling appears.
        expect(rag).toContain(`above ${config.amberMax}%`);
      }
    );
  });
});
