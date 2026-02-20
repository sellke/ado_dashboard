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
        milestoneMonthly: { value: null, rag: null },
        milestoneQuarterly: { value: null, rag: null },
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

      const programVelocity = vm.programMetrics?.find((m) => m.label === 'Avg Total Velocity');
      expect(programVelocity?.value).toBe('120.5 pts');
      expect(programVelocity?.rawValue).toBe(120.5);
      expect(programVelocity?.rag).toBe('Green');
      expect(programVelocity?.unit).toBe('pts');
      expect(programVelocity?.avgLabel).toBeNull();

      const programVelocityRate = vm.programMetrics?.find((m) => m.label === 'Avg Total Velocity Rate');
      expect(programVelocityRate?.value).toBe('N/A');
      expect(programVelocityRate?.rawValue).toBeNull();
      expect(programVelocityRate?.unit).toBe('pts/hr');
      expect(programVelocityRate?.rag).toBeNull();

      const programOverhead = vm.programMetrics?.find((m) => m.label === 'Avg Total Overhead %');
      expect(programOverhead?.value).toBe('29%');
      expect(programOverhead?.rawValue).toBe(29);
      expect(programOverhead?.rag).toBe('Amber');

      const programCarryOver = vm.programMetrics?.find((m) => m.label === 'Avg Total Carry-Over %');
      expect(programCarryOver?.value).toBe('13.50%');
      expect(programCarryOver?.rawValue).toBe(13.5);
      expect(programCarryOver?.rag).toBe('Amber');

      const ws = vm.workstreamCards[0];
      expect(ws.workstreamName).toBe('Action Tracker');
      expect(ws.detail.plannedPoints).toBe('40');
      expect(ws.detail.completedPoints).toBe('34');
      expect(ws.trendSprints).toHaveLength(1);
      expect(ws.trendSprints[0]).toMatchObject({
        sprintId: 'sprint-a',
        velocity: '30 pts',
        velocityRate: '0.50 pts/hr',
        activeBugs: '2',
        bugsClosed: '3',
        rawVelocity: 30,
        rawVelocityRate: 0.5,
        rawActiveBugs: 2,
        rawBugsClosed: 3,
      });
      expect(vm.programTrendSprints).toHaveLength(1);
      expect(vm.programTrendSprints[0]).toMatchObject({
        sprintId: 'sprint-a',
        velocity: '120 pts',
        rawVelocity: 120,
        rawVelocityRate: 1.2,
        rawActiveBugs: 11,
        rawBugsClosed: 16,
      });
      expect(vm.sprint5Prediction).toMatchObject({
        velocity: '130 pts',
        rawVelocity: 130,
        sprintLabel: 'Sprint 26.21',
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

    it('shows average velocity rate as its own tile when available', () => {
      const responseWithRate: ApiResponse = {
        ...fullApiResponse,
        program: {
          ...fullApiResponse.program!,
          metrics: {
            ...fullApiResponse.program!.metrics,
            averageVelocityRate: 0.85,
          },
        },
      };

      const vm = mapApiResponseToDashboardViewModel(responseWithRate);

      const velocityTile = vm.programMetrics?.find((m) => m.label === 'Avg Total Velocity');
      expect(velocityTile?.avgLabel).toBeNull();

      const rateTile = vm.programMetrics?.find((m) => m.label === 'Avg Total Velocity Rate');
      expect(rateTile?.value).toBe('0.85 pts/hr');
      expect(rateTile?.rawValue).toBe(0.85);
      expect(rateTile?.unit).toBe('pts/hr');
      expect(rateTile?.rag).toBeNull();
    });

    describe('velocity rate tile', () => {
      it('adds velocity rate as 4th metric between Velocity and Overhead %', () => {
        const responseWithPrediction: ApiResponse = {
          ...fullApiResponse,
          workstreams: [
            {
              ...fullApiResponse.workstreams[0]!,
              prediction: {
                velocity: 36,
                velocityRate: 0.75,
                mode: 'predicted' as const,
                formula: 'avg velocity rate × net capacity',
              },
            },
          ],
        };

        const vm = mapApiResponseToDashboardViewModel(responseWithPrediction);
        const ws = vm.workstreamCards[0];

        expect(ws.metrics).toHaveLength(4);
        expect(ws.metrics[0].label).toBe('Velocity');
        expect(ws.metrics[1].label).toBe('Velocity Rate');
        expect(ws.metrics[2].label).toBe('Overhead %');
        expect(ws.metrics[3].label).toBe('Carry-Over %');

        const rateTile = ws.metrics[1];
        expect(rateTile.value).toBe('0.75 pts/hr');
        expect(rateTile.rawValue).toBe(0.75);
        expect(rateTile.unit).toBe('pts/hr');
        expect(rateTile.rag).toBeNull();
        expect(rateTile.avgLabel).toBeNull();
      });

      it('shows "N/A" for velocity rate when prediction is missing', () => {
        const vm = mapApiResponseToDashboardViewModel(fullApiResponse);
        const ws = vm.workstreamCards[0];

        expect(ws.metrics).toHaveLength(4);
        const rateTile = ws.metrics.find((m) => m.label === 'Velocity Rate');
        expect(rateTile?.value).toBe('N/A');
        expect(rateTile?.rawValue).toBeNull();
      });

      it('shows "N/A" for velocity rate when velocityRate is null', () => {
        const responseWithNullRate: ApiResponse = {
          ...fullApiResponse,
          workstreams: [
            {
              ...fullApiResponse.workstreams[0]!,
              prediction: {
                velocity: 36,
                velocityRate: null,
                mode: 'predicted' as const,
                formula: 'avg velocity rate × net capacity',
              },
            },
          ],
        };

        const vm = mapApiResponseToDashboardViewModel(responseWithNullRate);
        const ws = vm.workstreamCards[0];

        const rateTile = ws.metrics.find((m) => m.label === 'Velocity Rate');
        expect(rateTile?.value).toBe('N/A');
        expect(rateTile?.rawValue).toBeNull();
      });
    });

    describe('trend sprint bug mapping', () => {
      it('maps API bugs to TrendBugViewModel with string adoId and isClosed', () => {
        const responseWithBugs: ApiResponse = {
          ...fullApiResponse,
          workstreams: [
            {
              ...fullApiResponse.workstreams[0]!,
              trends: {
                sprints: [
                  {
                    sprintId: 'sprint-a',
                    sprintName: 'Sprint 1',
                    velocity: 30,
                    velocityRate: 0.5,
                    activeBugs: 2,
                    bugsClosed: 3,
                    mode: 'actual' as const,
                    bugs: [
                      { adoId: 12345, title: 'Login crash', state: 'Closed' },
                      { adoId: 67890, title: 'Slow query', state: 'Active' },
                      { adoId: 11111, title: 'Memory leak', state: 'Done' },
                      { adoId: 22222, title: 'UI glitch', state: 'Resolved' },
                    ],
                  },
                ],
              },
            },
          ],
        };

        const vm = mapApiResponseToDashboardViewModel(responseWithBugs);
        const bugs = vm.workstreamCards[0].trendSprints[0].bugs;

        expect(bugs).toHaveLength(4);
        expect(bugs[0]).toEqual({ adoId: '12345', title: 'Login crash', isClosed: true });
        expect(bugs[1]).toEqual({ adoId: '67890', title: 'Slow query', isClosed: false });
        expect(bugs[2]).toEqual({ adoId: '11111', title: 'Memory leak', isClosed: true });
        expect(bugs[3]).toEqual({ adoId: '22222', title: 'UI glitch', isClosed: true });
      });

      it('returns empty bugs array when bugs field is missing', () => {
        const vm = mapApiResponseToDashboardViewModel(fullApiResponse);
        const sprint = vm.workstreamCards[0].trendSprints[0];

        expect(sprint.bugs).toEqual([]);
      });
    });

    describe('workstream prediction mapping', () => {
      it('maps workstream prediction to WorkstreamCardViewModel', () => {
        const responseWithPrediction: ApiResponse = {
          ...fullApiResponse,
          workstreams: [
            {
              ...fullApiResponse.workstreams[0]!,
              prediction: {
                velocity: 36,
                velocityRate: 0.75,
                mode: 'predicted' as const,
                formula: 'avg velocity rate × net capacity',
              },
            },
          ],
        };

        const vm = mapApiResponseToDashboardViewModel(responseWithPrediction);
        const ws = vm.workstreamCards[0];

        expect(ws.prediction).toEqual({
          velocity: '36 pts',
          rawVelocity: 36,
          velocityRate: '0.75 pts/hr',
          rawVelocityRate: 0.75,
          sprintLabel: 'Sprint 26.21',
          isPredicted: true,
        });
      });

      it('sets prediction to null when workstream has no prediction', () => {
        const vm = mapApiResponseToDashboardViewModel(fullApiResponse);
        const ws = vm.workstreamCards[0];

        expect(ws.prediction).toBeNull();
      });

      it('handles null velocity and velocityRate in prediction', () => {
        const responseWithNullPrediction: ApiResponse = {
          ...fullApiResponse,
          workstreams: [
            {
              ...fullApiResponse.workstreams[0]!,
              prediction: {
                velocity: null,
                velocityRate: null,
                mode: 'predicted' as const,
                formula: 'avg velocity rate × net capacity',
              },
            },
          ],
        };

        const vm = mapApiResponseToDashboardViewModel(responseWithNullPrediction);
        const ws = vm.workstreamCards[0];

        expect(ws.prediction).toEqual({
          velocity: 'N/A',
          rawVelocity: null,
          velocityRate: 'N/A',
          rawVelocityRate: null,
          sprintLabel: 'Sprint 26.21',
          isPredicted: true,
        });
      });
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
      const carryOver = ws.metrics.find((m) => m.label === 'Carry-Over %');

      expect(velocity?.rag).toBe('Green');
      expect(overhead?.rag).toBe('Amber');
      expect(carryOver?.rag).toBeNull();
      expect(ws.metrics.find((m) => m.label === 'Predictability')).toBeUndefined();
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
