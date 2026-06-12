/**
 * Tests that the dashboard adapter attaches the correct `metricId` to every
 * in-scope program summary tile and workstream metric row.
 */

import { mapApiResponseToDashboardViewModel } from '@/lib/dashboard/adapter';
import type { ApiResponse } from '@/lib/dashboard/types';
import type { MetricId } from '@/lib/metrics/definitions';

const apiResponse: ApiResponse = {
  sprint: {
    id: 'sprint-1',
    name: 'Sprint 27.1',
    startDate: '2026-04-27T00:00:00Z',
    endDate: '2026-05-08T00:00:00Z',
  },
  workstreams: [
    {
      workstreamId: 'ws-1',
      workstreamName: 'Action Tracker',
      metrics: {
        velocity: { value: 34, avg: 31.5, rag: 'Green' },
        overheadPercent: { value: 28.5, avg: 26.2, rag: 'Green' },
        predictability: { value: 85, avg: 82, rag: 'Green' },
        carryOverRate: { value: 8.5, avg: 11, rag: 'Green' },
      },
      detail: {
        plannedPoints: 40,
        completedPoints: 34,
        carryOverPoints: 6,
        overheadHours: 22.8,
        grossHours: 80,
      },
      prediction: {
        velocity: 36,
        velocityRate: 0.75,
        deliveryToBugRatio: 0.12,
        deliveryToBugRag: 'Green',
        mode: 'predicted',
        formula: 'avg velocity rate × net capacity',
      },
    },
  ],
  program: {
    metrics: {
      velocity: { value: 128, avg: 120.5, rag: 'Green' },
      overheadPercent: { value: 31.2, avg: 29, rag: 'Amber' },
      predictability: { value: 82, avg: 80.5, rag: 'Green' },
      carryOverRate: { value: 12, avg: 13.5, rag: 'Amber' },
      averageVelocityRate: 0.85,
      deliveryToBugRatio: 0.12,
      deliveryToBugRag: 'Green',
    },
  },
  computedAt: '2026-04-28T18:30:00.000Z',
  rollingWindow: null,
};

describe('adapter metricId mapping', () => {
  const vm = mapApiResponseToDashboardViewModel(apiResponse);

  describe('program summary tiles', () => {
    const expected: Array<{ label: string; metricId: MetricId }> = [
      { label: 'Avg Total Velocity', metricId: 'velocity' },
      { label: 'Avg Total Velocity Rate', metricId: 'velocityRate' },
      { label: 'Avg Total Delivery/Bug', metricId: 'deliveryToBugRatio' },
      { label: 'Avg Total Overhead %', metricId: 'overheadPercent' },
      { label: 'Avg Total Carry-Over %', metricId: 'carryOverRate' },
    ];

    it.each(expected)('tile "$label" has metricId "$metricId"', ({ label, metricId }) => {
      const tile = vm.programMetrics?.find((m) => m.label === label);
      expect(tile).toBeDefined();
      expect(tile?.metricId).toBe(metricId);
    });

    it('attaches a metricId to all five program tiles', () => {
      expect(vm.programMetrics).toHaveLength(5);
      expect(vm.programMetrics?.every((m) => m.metricId !== undefined)).toBe(true);
    });
  });

  describe('workstream metric rows', () => {
    const expected: Array<{ label: string; metricId: MetricId }> = [
      { label: 'Avg Velocity', metricId: 'velocity' },
      { label: 'Velocity Rate', metricId: 'velocityRate' },
      { label: 'Delivery/Bug', metricId: 'deliveryToBugRatio' },
      { label: 'Overhead %', metricId: 'overheadPercent' },
      { label: 'Carry-Over %', metricId: 'carryOverRate' },
    ];

    it.each(expected)('row "$label" has metricId "$metricId"', ({ label, metricId }) => {
      const row = vm.workstreamCards[0].metrics.find((m) => m.label === label);
      expect(row).toBeDefined();
      expect(row?.metricId).toBe(metricId);
    });

    it('attaches a metricId to all five workstream rows', () => {
      const metrics = vm.workstreamCards[0].metrics;
      expect(metrics).toHaveLength(5);
      expect(metrics.every((m) => m.metricId !== undefined)).toBe(true);
    });
  });
});
