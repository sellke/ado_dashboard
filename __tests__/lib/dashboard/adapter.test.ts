/**
 * Tests for the dashboard data adapter.
 * Verifies null-safe mapping of API response to UI view models.
 */

import {
  createErrorViewModel,
  createLoadingViewModel,
  formatMetricValue,
  formatPercent,
  mapApiResponseToDashboardViewModel,
  toRagStatus,
} from '@/lib/dashboard/adapter';
import type { ApiResponse } from '@/lib/dashboard/types';

describe('dashboard adapter', () => {
  const fullApiResponse: ApiResponse = {
    sprint: {
      id: 'sprint-1',
      name: 'Sprint 26.21',
      startDate: '2026-01-06T00:00:00Z',
      endDate: '2026-01-19T00:00:00Z',
    },
    workstreams: [
      {
        workstreamId: 'ws-1',
        workstreamName: 'Streams',
        metrics: {
          velocity: { value: 34, avg: 31.5, rag: 'Green' },
          overheadPercent: { value: 28.5, avg: 26.2, rag: 'Green' },
          predictability: { value: 85, avg: 82, rag: 'Green' },
          carryOverRate: { value: 8.5, avg: 11, rag: 'Green' },
        },
        detail: {
          plannedPoints: 40,
          completedPoints: 34,
          carryOverItems: 3,
          carryOverPoints: 6,
          overheadHours: 22.8,
          grossHours: 80,
        },
        trends: {
          sprints: [
            {
              sprintId: 'sprint-a',
              sprintName: 'Sprint 1',
              velocity: 30,
              velocityRate: 0.5,
              activeBugs: 2,
              bugsClosed: 3,
              mode: 'actual',
            },
          ],
        },
      },
    ],
    program: {
      metrics: {
        velocity: { value: 128, avg: 120.5, rag: 'Green' },
        overheadPercent: { value: 31.2, avg: 29, rag: 'Amber' },
        predictability: { value: 82, avg: 80.5, rag: 'Green' },
        carryOverRate: { value: 12, avg: 13.5, rag: 'Amber' },
      },
      trends: {
        sprints: [
          {
            sprintId: 'sprint-a',
            sprintName: 'Sprint 1',
            velocity: 120,
            velocityRate: 1.2,
            activeBugs: 11,
            bugsClosed: 16,
            mode: 'actual',
          },
        ],
      },
      prediction: {
        sprint5: {
          velocity: 130,
          mode: 'predicted',
          formula: 'average velocity rate × current sprint net capacity hours',
        },
      },
    },
    computedAt: '2026-02-11T18:30:00.000Z',
    rollingWindow: {
      count: 5,
      currentSprintId: 'sprint-1',
      sprints: [
        {
          id: 'sprint-1',
          name: 'Sprint 26.21',
          startDate: '2026-01-06T00:00:00Z',
          endDate: '2026-01-19T00:00:00Z',
        },
      ],
    },
  };

  describe('mapApiResponseToDashboardViewModel', () => {
    it('maps a full, healthy API response to success view model', () => {
      const vm = mapApiResponseToDashboardViewModel(fullApiResponse);

      expect(vm.state).toBe('success');
      expect(vm.sprintLabel).toBe('Sprint 26.21');
      expect(vm.rollingWindowLabel).toBe('Rolling 5 sprints (current + 4 prior)');
      expect(vm.computedAtLabel).toBeTruthy();
      expect(vm.programMetrics).toHaveLength(4);
      expect(vm.workstreamCards).toHaveLength(1);

      const programVelocity = vm.programMetrics?.find((m) => m.label === 'Velocity');
      expect(programVelocity?.value).toBe('128 pts');
      expect(programVelocity?.rag).toBe('Green');
      expect(programVelocity?.unit).toBe('pts');

      const ws = vm.workstreamCards[0];
      expect(ws.workstreamName).toBe('Streams');
      expect(ws.detail.plannedPoints).toBe('40');
      expect(ws.detail.completedPoints).toBe('34');
      expect(ws.trendSprints).toHaveLength(1);
      expect(ws.trendSprints[0]).toMatchObject({
        sprintId: 'sprint-a',
        velocity: '30 pts',
        velocityRate: '0.50 pts/hr',
        activeBugs: '2',
        bugsClosed: '3',
      });
      expect(vm.programTrendSprints).toHaveLength(1);
      expect(vm.programTrendSprints[0]).toMatchObject({
        sprintId: 'sprint-a',
        velocity: '120 pts',
      });
      expect(vm.sprint5Prediction).toMatchObject({
        velocity: '130 pts',
        isPredicted: true,
      });
    });

    it('maps empty/null API response to empty state', () => {
      const emptyResponse: ApiResponse = {
        sprint: null,
        workstreams: [],
        program: null,
        computedAt: null,
        rollingWindow: null,
      };

      const vm = mapApiResponseToDashboardViewModel(emptyResponse);

      expect(vm.state).toBe('empty');
      expect(vm.sprintLabel).toBeNull();
      expect(vm.rollingWindowLabel).toBeNull();
      expect(vm.computedAtLabel).toBeNull();
      expect(vm.programMetrics).toBeNull();
      expect(vm.workstreamCards).toEqual([]);
    });

    it('preserves null metric values as "N/A" strings', () => {
      const nullMetricResponse: ApiResponse = {
        sprint: { id: 's1', name: 'Sprint 1', startDate: '', endDate: '' },
        workstreams: [
          {
            workstreamId: 'ws-1',
            workstreamName: 'Test',
            metrics: {
              velocity: { value: null, avg: null, rag: null },
              overheadPercent: { value: null, avg: null, rag: null },
              predictability: { value: null, avg: null, rag: null },
              carryOverRate: { value: null, avg: null, rag: null },
            },
            detail: {
              plannedPoints: null,
              completedPoints: null,
              carryOverItems: null,
              carryOverPoints: null,
              overheadHours: null,
              grossHours: null,
            },
          },
        ],
        program: null,
        computedAt: null,
        rollingWindow: null,
      };

      const vm = mapApiResponseToDashboardViewModel(nullMetricResponse);

      expect(vm.state).toBe('success');
      const ws = vm.workstreamCards[0];
      expect(ws.metrics.every((m) => m.value === 'N/A')).toBe(true);
      expect(ws.detail.plannedPoints).toBe('N/A');
      expect(ws.detail.completedPoints).toBe('N/A');
    });

    it('handles mixed RAG values correctly', () => {
      const mixedRagResponse: ApiResponse = {
        ...fullApiResponse,
        workstreams: [
          {
            ...fullApiResponse.workstreams[0]!,
            metrics: {
              velocity: { value: 34, avg: 31.5, rag: 'Green' },
              overheadPercent: { value: 45, avg: 42, rag: 'Amber' },
              predictability: { value: 50, avg: 55, rag: 'Red' },
              carryOverRate: { value: 25, avg: 20, rag: null },
            },
          },
        ],
      };

      const vm = mapApiResponseToDashboardViewModel(mixedRagResponse);

      const ws = vm.workstreamCards[0];
      const velocity = ws.metrics.find((m) => m.label === 'Velocity');
      const overhead = ws.metrics.find((m) => m.label === 'Overhead %');
      const predictability = ws.metrics.find((m) => m.label === 'Predictability');
      const carryOver = ws.metrics.find((m) => m.label === 'Carry-over rate');

      expect(velocity?.rag).toBe('Green');
      expect(overhead?.rag).toBe('Amber');
      expect(predictability?.rag).toBe('Red');
      expect(carryOver?.rag).toBeNull();
    });
  });

  describe('formatPercent', () => {
    it('formats percent values with % sign', () => {
      expect(formatPercent(28.5)).toBe('28.5%');
      expect(formatPercent(0)).toBe('0%');
      expect(formatPercent(100)).toBe('100%');
    });

    it('returns "N/A" for null', () => {
      expect(formatPercent(null)).toBe('N/A');
    });
  });

  describe('formatMetricValue', () => {
    it('formats number values correctly', () => {
      expect(formatMetricValue(34, 'pts')).toBe('34 pts');
      expect(formatMetricValue(85, '%')).toBe('85 %');
      expect(formatMetricValue(0, 'pts')).toBe('0 pts');
    });

    it('returns "N/A" for null', () => {
      expect(formatMetricValue(null, 'pts')).toBe('N/A');
    });
  });

  describe('toRagStatus', () => {
    it('safely casts valid rag strings', () => {
      expect(toRagStatus('Green')).toBe('Green');
      expect(toRagStatus('Amber')).toBe('Amber');
      expect(toRagStatus('Red')).toBe('Red');
    });

    it('returns null for invalid or null rag', () => {
      expect(toRagStatus(null)).toBeNull();
      expect(toRagStatus('')).toBeNull();
      expect(toRagStatus('invalid')).toBeNull();
    });
  });

  describe('createLoadingViewModel', () => {
    it('returns loading state', () => {
      const vm = createLoadingViewModel();

      expect(vm.state).toBe('loading');
      expect(vm.sprintLabel).toBeNull();
      expect(vm.rollingWindowLabel).toBeNull();
      expect(vm.computedAtLabel).toBeNull();
      expect(vm.programMetrics).toBeNull();
      expect(vm.workstreamCards).toEqual([]);
    });
  });

  describe('createErrorViewModel', () => {
    it('returns error state with message', () => {
      const vm = createErrorViewModel('Network error');

      expect(vm.state).toBe('error');
      expect(vm.errorMessage).toBe('Network error');
      expect(vm.sprintLabel).toBeNull();
      expect(vm.rollingWindowLabel).toBeNull();
      expect(vm.programMetrics).toBeNull();
      expect(vm.workstreamCards).toEqual([]);
    });
  });
});
