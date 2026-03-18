/**
 * Tests for the dashboard data adapter.
 * Verifies null-safe mapping of API response to UI view models.
 */

import {
  createErrorViewModel,
  createLoadingViewModel,
  formatHours,
  formatMetricValue,
  formatPercent,
  groupMilestonesByMonth,
  mapApiResponseToDashboardViewModel,
  mapMilestoneToGoalViewModel,
  mapOverheadComposition,
  mapOverheadItem,
  mapProgramMilestoneRollup,
  toRagStatus,
} from '@/lib/dashboard/adapter';
import type {
  ApiOverheadItem,
  ApiOverheadItemsBySprint,
  ApiResponse,
  ApiTrendSprint,
} from '@/lib/dashboard/types';
import type { ApiMilestoneWithProgress, ApiProgramMilestoneRollup } from '@/lib/milestones/types';

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

      const programVelocityRate = vm.programMetrics?.find(
        (m) => m.label === 'Avg Total Velocity Rate'
      );
      expect(programVelocityRate?.value).toBe('N/A');
      expect(programVelocityRate?.rawValue).toBeNull();
      expect(programVelocityRate?.unit).toBe('pts/hr');
      expect(programVelocityRate?.rag).toBeNull();

      const programOverhead = vm.programMetrics?.find((m) => m.label === 'Avg Total Overhead %');
      expect(programOverhead?.value).toBe('29.00%');
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
        expect(ws.metrics[0].label).toBe('Avg Velocity');
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
                      { adoId: 11111, title: 'Memory leak', state: 'Testing' },
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
      const velocity = ws.metrics.find((m) => m.label === 'Avg Velocity');
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

  describe('formatHours', () => {
    it('formats a positive number with " hrs" suffix', () => {
      expect(formatHours(4.5)).toBe('4.5 hrs');
      expect(formatHours(10)).toBe('10 hrs');
      expect(formatHours(0)).toBe('0 hrs');
    });

    it('returns "N/A" for null', () => {
      expect(formatHours(null)).toBe('N/A');
    });
  });

  describe('mapOverheadItem', () => {
    const baseItem: ApiOverheadItem = {
      adoId: 12345,
      title: 'Fix login crash',
      state: 'Active',
      hours: 4.5,
    };

    it('formats adoId as "#12345" string', () => {
      const vm = mapOverheadItem(baseItem);
      expect(vm.adoId).toBe('#12345');
    });

    it('constructs adoUrl from numeric adoId', () => {
      const vm = mapOverheadItem(baseItem);
      expect(vm.adoUrl).toBe(
        'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit/12345'
      );
    });

    it('formats hours as "4.5 hrs" when completedWork is provided', () => {
      const vm = mapOverheadItem(baseItem);
      expect(vm.hours).toBe('4.5 hrs');
    });

    it('formats hours as "N/A" when hours is null', () => {
      const vm = mapOverheadItem({ ...baseItem, hours: null });
      expect(vm.hours).toBe('N/A');
    });

    it('sets isClosed: true for "Closed" state', () => {
      expect(mapOverheadItem({ ...baseItem, state: 'Closed' }).isClosed).toBe(true);
    });

    it('sets isClosed: true for "Done" state', () => {
      expect(mapOverheadItem({ ...baseItem, state: 'Done' }).isClosed).toBe(true);
    });

    it('sets isClosed: true for "Resolved" state', () => {
      expect(mapOverheadItem({ ...baseItem, state: 'Resolved' }).isClosed).toBe(true);
    });

    it('sets isClosed: false for open states', () => {
      expect(mapOverheadItem({ ...baseItem, state: 'Active' }).isClosed).toBe(false);
      expect(mapOverheadItem({ ...baseItem, state: 'New' }).isClosed).toBe(false);
    });

    it('maps title and state passthrough', () => {
      const vm = mapOverheadItem(baseItem);
      expect(vm.title).toBe('Fix login crash');
      expect(vm.state).toBe('Active');
    });
  });

  describe('mapOverheadComposition', () => {
    const makeSprintWithComposition = (
      sprintId: string,
      sprintName: string,
      overrides: Partial<{
        ceremonyHours: number | null;
        bugHours: number | null;
        spikeHours: number | null;
        supportHours: number | null;
        totalOverheadHours: number | null;
        overheadPercent: number | null;
      }> = {}
    ): ApiTrendSprint => ({
      sprintId,
      sprintName,
      velocity: 40,
      velocityRate: 0.5,
      activeBugs: 2,
      bugsClosed: 3,
      mode: 'actual',
      overheadComposition: {
        ceremonyHours: 10,
        bugHours: 5,
        spikeHours: 2,
        supportHours: 3,
        totalOverheadHours: 20,
        overheadPercent: 25,
        ...overrides,
      },
    });

    it('maps overhead composition for each sprint', () => {
      const sprints = [
        makeSprintWithComposition('s1', 'Sprint 1'),
        makeSprintWithComposition('s2', 'Sprint 2', { bugHours: 8 }),
      ];

      const result = mapOverheadComposition(sprints);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        sprintName: 'Sprint 1',
        ceremonyHours: 10,
        bugHours: 5,
        spikeHours: 2,
        supportHours: 3,
        overheadPercent: '25%',
      });
      expect(result[1].bugHours).toBe(8);
    });

    it('defaults null hour values to 0', () => {
      const sprints = [
        makeSprintWithComposition('s1', 'Sprint 1', {
          ceremonyHours: null,
          bugHours: null,
          spikeHours: null,
          supportHours: null,
        }),
      ];

      const result = mapOverheadComposition(sprints);

      expect(result[0].ceremonyHours).toBe(0);
      expect(result[0].bugHours).toBe(0);
      expect(result[0].spikeHours).toBe(0);
      expect(result[0].supportHours).toBe(0);
    });

    it('formats null overheadPercent as "N/A"', () => {
      const sprints = [makeSprintWithComposition('s1', 'Sprint 1', { overheadPercent: null })];

      const result = mapOverheadComposition(sprints);

      expect(result[0].overheadPercent).toBe('N/A');
    });

    it('skips sprints that have no overheadComposition', () => {
      const sprints: ApiTrendSprint[] = [
        {
          sprintId: 's1',
          sprintName: 'Sprint 1',
          velocity: 40,
          velocityRate: 0.5,
          activeBugs: 2,
          bugsClosed: 3,
          mode: 'actual',
        },
        makeSprintWithComposition('s2', 'Sprint 2'),
      ];

      const result = mapOverheadComposition(sprints);

      expect(result).toHaveLength(1);
      expect(result[0].sprintName).toBe('Sprint 2');
    });

    it('returns empty array for empty sprints input', () => {
      expect(mapOverheadComposition([])).toEqual([]);
    });
  });

  describe('mapApiResponseToDashboardViewModel - overhead integration', () => {
    it('populates overheadComposition and overheadItemsBySprint on workstream cards', () => {
      const overheadItemsBySprint: ApiOverheadItemsBySprint[] = [
        {
          sprintId: 'sprint-a',
          bugs: [
            { adoId: 12345, title: 'Login crash', state: 'Closed', hours: 4.5 },
            { adoId: 67890, title: 'Slow query', state: 'Active', hours: null },
          ],
          spikes: [{ adoId: 99999, title: 'Perf spike', state: 'New', hours: 3 }],
          support: [{ adoId: 11111, title: 'Infra request', state: 'Done', hours: 2 }],
        },
      ];

      const responseWithOverhead: ApiResponse = {
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
                  mode: 'actual',
                  overheadComposition: {
                    ceremonyHours: 10,
                    bugHours: 5,
                    spikeHours: 2,
                    supportHours: 3,
                    totalOverheadHours: 20,
                    overheadPercent: 25,
                  },
                },
              ],
            },
            overheadItemsBySprint,
          },
        ],
      };

      const vm = mapApiResponseToDashboardViewModel(responseWithOverhead);
      const ws = vm.workstreamCards[0];

      expect(ws.overheadComposition).toHaveLength(1);
      expect(ws.overheadComposition[0]).toEqual({
        sprintName: 'Sprint 1',
        ceremonyHours: 10,
        bugHours: 5,
        spikeHours: 2,
        supportHours: 3,
        overheadPercent: '25%',
      });

      expect(ws.overheadItemsBySprint).toHaveLength(1);
      const sprint = ws.overheadItemsBySprint[0];
      expect(sprint.sprintId).toBe('sprint-a');

      expect(sprint.bugs).toHaveLength(2);
      expect(sprint.bugs[0]).toEqual({
        adoId: '#12345',
        title: 'Login crash',
        state: 'Closed',
        hours: '4.5 hrs',
        isClosed: true,
        adoUrl: 'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit/12345',
      });
      expect(sprint.bugs[1]).toEqual({
        adoId: '#67890',
        title: 'Slow query',
        state: 'Active',
        hours: 'N/A',
        isClosed: false,
        adoUrl: 'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit/67890',
      });

      expect(sprint.spikes).toHaveLength(1);
      expect(sprint.spikes[0]).toMatchObject({
        adoId: '#99999',
        title: 'Perf spike',
        adoUrl: expect.stringContaining('/99999'),
      });

      expect(sprint.support).toHaveLength(1);
      expect(sprint.support[0]).toEqual({
        adoId: '#11111',
        title: 'Infra request',
        state: 'Done',
        hours: '2 hrs',
        isClosed: true,
        adoUrl: 'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit/11111',
      });
    });

    it('returns empty arrays when overheadItemsBySprint is missing', () => {
      const vm = mapApiResponseToDashboardViewModel(fullApiResponse);
      const ws = vm.workstreamCards[0];

      expect(ws.overheadComposition).toEqual([]);
      expect(ws.overheadItemsBySprint).toEqual([]);
    });
  });

  describe('mapMilestoneToGoalViewModel', () => {
    const baseMilestone: ApiMilestoneWithProgress = {
      id: 'm1',
      title: 'Launch Feature X',
      workstreamId: 'ws-1',
      targetMonth: '2026-02-01T00:00:00.000Z',
      status: 'InProgress',
      adoFeatureId: 12345,
      notes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      workstream: { id: 'ws-1', name: 'Action Tracker' },
      completedPoints: 73,
      totalPoints: 100,
      percentComplete: 73,
      burnupData: [],
      quarter: null,
    };

    it('formats percentComplete as "73%"', () => {
      const vm = mapMilestoneToGoalViewModel(baseMilestone);
      expect(vm.percentComplete).toBe('73%');
    });

    it('formats percentComplete null as "N/A"', () => {
      const m = { ...baseMilestone, percentComplete: null };
      const vm = mapMilestoneToGoalViewModel(m);
      expect(vm.percentComplete).toBe('N/A');
    });

    it('formats adoFeatureId as "#12345"', () => {
      const vm = mapMilestoneToGoalViewModel(baseMilestone);
      expect(vm.adoFeatureId).toBe('#12345');
    });

    it('formats adoFeatureId null as null', () => {
      const m = { ...baseMilestone, adoFeatureId: null };
      const vm = mapMilestoneToGoalViewModel(m);
      expect(vm.adoFeatureId).toBeNull();
    });

    it('formats targetMonth "2026-02-01T00:00:00.000Z" to monthLabel "February 2026"', () => {
      const vm = mapMilestoneToGoalViewModel(baseMilestone);
      expect(vm.monthLabel).toBe('February 2026');
      expect(vm.targetMonth).toBe('2026-02-01T00:00:00.000Z');
    });

    it('sets isCurrentMonth true when targetMonth matches today', () => {
      const today = new Date('2026-02-15T12:00:00.000Z');
      const vm = mapMilestoneToGoalViewModel(baseMilestone, today);
      expect(vm.isCurrentMonth).toBe(true);
    });

    it('sets isCurrentMonth false when targetMonth is different month', () => {
      const today = new Date('2026-03-15T12:00:00.000Z');
      const vm = mapMilestoneToGoalViewModel(baseMilestone, today);
      expect(vm.isCurrentMonth).toBe(false);
    });

    it('rounds percentComplete correctly (73.6 → "74%")', () => {
      const m = { ...baseMilestone, percentComplete: 73.6 };
      const vm = mapMilestoneToGoalViewModel(m);
      expect(vm.percentComplete).toBe('74%');
    });

    it('passes through id, title, workstreamId, completedPoints, totalPoints, burnupData, status', () => {
      const m = {
        ...baseMilestone,
        burnupData: [{ sprintName: 'S1', sprintId: 's1', cumulativeCompletedSP: 50, totalSP: 100 }],
      };
      const vm = mapMilestoneToGoalViewModel(m);
      expect(vm.id).toBe('m1');
      expect(vm.title).toBe('Launch Feature X');
      expect(vm.workstreamId).toBe('ws-1');
      expect(vm.completedPoints).toBe(73);
      expect(vm.totalPoints).toBe(100);
      expect(vm.burnupData).toHaveLength(1);
      expect(vm.status).toBe('InProgress');
    });
  });

  describe('groupMilestonesByMonth', () => {
    const makeVm = (
      targetMonth: string,
      monthLabel: string,
      isCurrentMonth: boolean,
      completedPoints: number,
      totalPoints: number
    ) => ({
      id: `m-${targetMonth}`,
      title: 'Milestone',
      workstreamId: 'ws-1',
      targetMonth,
      monthLabel,
      isCurrentMonth,
      adoFeatureId: null as string | null,
      percentComplete: '0%',
      completedPoints,
      totalPoints,
      burnupData: [] as {
        sprintName: string;
        sprintId: string;
        cumulativeCompletedSP: number;
        totalSP: number;
      }[],
      status: 'InProgress',
      quarter: null,
    });

    it('returns empty array for empty input', () => {
      expect(groupMilestonesByMonth([])).toEqual([]);
    });

    it('places current month milestones first', () => {
      const today = new Date('2026-02-15T12:00:00.000Z');
      const past = makeVm('2026-01-01T00:00:00.000Z', 'January 2026', false, 50, 100);
      const current = makeVm('2026-02-01T00:00:00.000Z', 'February 2026', true, 30, 80);
      const future = makeVm('2026-03-01T00:00:00.000Z', 'March 2026', false, 0, 50);
      const groups = groupMilestonesByMonth([past, current, future], today);
      expect(groups).toHaveLength(3);
      expect(groups[0].monthLabel).toBe('February 2026');
      expect(groups[0].isCurrentMonth).toBe(true);
    });

    it('places future months after current, ascending', () => {
      const today = new Date('2026-02-15T12:00:00.000Z');
      const current = makeVm('2026-02-01T00:00:00.000Z', 'February 2026', true, 30, 80);
      const future1 = makeVm('2026-03-01T00:00:00.000Z', 'March 2026', false, 0, 50);
      const future2 = makeVm('2026-04-01T00:00:00.000Z', 'April 2026', false, 0, 40);
      const groups = groupMilestonesByMonth([future2, future1, current], today);
      expect(groups[0].monthLabel).toBe('February 2026');
      expect(groups[1].monthLabel).toBe('March 2026');
      expect(groups[2].monthLabel).toBe('April 2026');
    });

    it('places past months last, most recent past first (descending)', () => {
      const today = new Date('2026-02-15T12:00:00.000Z');
      const past1 = makeVm('2026-01-01T00:00:00.000Z', 'January 2026', false, 50, 100);
      const past2 = makeVm('2025-12-01T00:00:00.000Z', 'December 2025', false, 80, 100);
      const groups = groupMilestonesByMonth([past2, past1], today);
      expect(groups[0].monthLabel).toBe('January 2026');
      expect(groups[1].monthLabel).toBe('December 2025');
    });

    it('calculates groupCompletionPercent as "45%" from sum(completedPoints)/sum(totalPoints)', () => {
      const today = new Date('2026-02-15T12:00:00.000Z');
      const m1 = makeVm('2026-02-01T00:00:00.000Z', 'February 2026', true, 45, 100);
      const m2 = makeVm('2026-02-01T00:00:00.000Z', 'February 2026', true, 45, 100);
      const groups = groupMilestonesByMonth([m1, m2], today);
      expect(groups).toHaveLength(1);
      expect(groups[0].groupCompletionPercent).toBe('45%');
    });

    it('returns groupCompletionPercent "N/A" when all totalPoints are 0', () => {
      const today = new Date('2026-02-15T12:00:00.000Z');
      const m1 = makeVm('2026-02-01T00:00:00.000Z', 'February 2026', true, 0, 0);
      const m2 = makeVm('2026-02-01T00:00:00.000Z', 'February 2026', true, 0, 0);
      const groups = groupMilestonesByMonth([m1, m2], today);
      expect(groups).toHaveLength(1);
      expect(groups[0].groupCompletionPercent).toBe('N/A');
    });

    it('sets isCurrentMonth true on current month group', () => {
      const today = new Date('2026-02-15T12:00:00.000Z');
      const current = makeVm('2026-02-01T00:00:00.000Z', 'February 2026', true, 30, 80);
      const groups = groupMilestonesByMonth([current], today);
      expect(groups[0].isCurrentMonth).toBe(true);
    });

    it('sets isCurrentMonth false on non-current month groups', () => {
      const today = new Date('2026-02-15T12:00:00.000Z');
      const future = makeVm('2026-03-01T00:00:00.000Z', 'March 2026', false, 0, 50);
      const groups = groupMilestonesByMonth([future], today);
      expect(groups[0].isCurrentMonth).toBe(false);
    });

    it('uses monthLabel from first milestone in group', () => {
      const today = new Date('2026-02-15T12:00:00.000Z');
      const m1 = makeVm('2026-02-01T00:00:00.000Z', 'February 2026', true, 30, 80);
      const m2 = makeVm('2026-02-01T00:00:00.000Z', 'February 2026', true, 20, 50);
      const groups = groupMilestonesByMonth([m1, m2], today);
      expect(groups[0].monthLabel).toBe('February 2026');
      expect(groups[0].milestones).toHaveLength(2);
    });
  });

  describe('mapProgramMilestoneRollup', () => {
    const baseRollup: ApiProgramMilestoneRollup = {
      currentMonth: 'February 2026',
      currentMonthCompletionPercent: 45.5,
      currentMonthTotalSP: 200,
      currentMonthCompletedSP: 91,
      quarterlyMilestones: {
        total: 10,
        complete: 3,
        inProgress: 5,
        notStarted: 2,
      },
      quarter: null,
    };

    it('formats currentMonthCompletionPercent as percent', () => {
      const vm = mapProgramMilestoneRollup(baseRollup);
      expect(vm.currentMonthCompletionPercent).toBe('46%');
    });

    it('formats currentMonthCompletionPercent null as "N/A"', () => {
      const rollup = { ...baseRollup, currentMonthCompletionPercent: null };
      const vm = mapProgramMilestoneRollup(rollup);
      expect(vm.currentMonthCompletionPercent).toBe('N/A');
    });

    it('passes through currentMonth, currentMonthTotalSP, currentMonthCompletedSP', () => {
      const vm = mapProgramMilestoneRollup(baseRollup);
      expect(vm.currentMonth).toBe('February 2026');
      expect(vm.currentMonthTotalSP).toBe(200);
      expect(vm.currentMonthCompletedSP).toBe(91);
    });

    it('maps quarterlyMilestones to quarterlyTotal, quarterlyComplete, quarterlyInProgress, quarterlyNotStarted', () => {
      const vm = mapProgramMilestoneRollup(baseRollup);
      expect(vm.quarterlyTotal).toBe(10);
      expect(vm.quarterlyComplete).toBe(3);
      expect(vm.quarterlyInProgress).toBe(5);
      expect(vm.quarterlyNotStarted).toBe(2);
    });
  });

  describe('mapApiResponseToDashboardViewModel with milestones', () => {
    const milestoneFeb: ApiMilestoneWithProgress = {
      id: 'm1',
      title: 'Launch Feature X',
      workstreamId: 'ws-1',
      targetMonth: '2026-02-01T00:00:00.000Z',
      status: 'InProgress',
      adoFeatureId: 12345,
      notes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      workstream: { id: 'ws-1', name: 'Action Tracker' },
      completedPoints: 73,
      totalPoints: 100,
      percentComplete: 73,
      burnupData: [],
      quarter: null,
    };

    it('populates milestoneGroups on workstreamCards when milestones provided', () => {
      const milestones = [milestoneFeb];
      const vm = mapApiResponseToDashboardViewModel(fullApiResponse, milestones);

      expect(vm.workstreamCards).toHaveLength(1);
      const ws = vm.workstreamCards[0];
      expect(ws.milestoneGroups).toBeDefined();
      expect(Array.isArray(ws.milestoneGroups)).toBe(true);
      expect(ws.milestoneGroups.length).toBeGreaterThan(0);
      expect(ws.milestoneGroups[0]).toMatchObject({
        monthLabel: 'February 2026',
        milestones: expect.any(Array),
        groupCompletionPercent: expect.any(String),
      });
    });

    it('filters milestones to correct workstream', () => {
      const milestoneWs2: ApiMilestoneWithProgress = {
        ...milestoneFeb,
        id: 'm2',
        workstreamId: 'ws-2',
        workstream: { id: 'ws-2', name: 'Other' },
      };
      const responseWithTwoWorkstreams: ApiResponse = {
        ...fullApiResponse,
        workstreams: [
          fullApiResponse.workstreams[0]!,
          { ...fullApiResponse.workstreams[0]!, workstreamId: 'ws-2', workstreamName: 'Other' },
        ],
      };
      const vm = mapApiResponseToDashboardViewModel(responseWithTwoWorkstreams, [
        milestoneFeb,
        milestoneWs2,
      ]);

      const ws1 = vm.workstreamCards.find((c) => c.workstreamId === 'ws-1');
      const ws2 = vm.workstreamCards.find((c) => c.workstreamId === 'ws-2');
      expect(ws1?.milestoneGroups.some((g) => g.milestones.some((m) => m.id === 'm1'))).toBe(true);
      expect(ws2?.milestoneGroups.some((g) => g.milestones.some((m) => m.id === 'm2'))).toBe(true);
      expect(ws1?.milestoneGroups.some((g) => g.milestones.some((m) => m.id === 'm2'))).toBe(false);
      expect(ws2?.milestoneGroups.some((g) => g.milestones.some((m) => m.id === 'm1'))).toBe(false);
    });

    it('has milestoneGroups as [] when no milestones for that workstream', () => {
      const responseWithTwoWorkstreams: ApiResponse = {
        ...fullApiResponse,
        workstreams: [
          fullApiResponse.workstreams[0]!,
          { ...fullApiResponse.workstreams[0]!, workstreamId: 'ws-2', workstreamName: 'Other' },
        ],
      };
      const vm = mapApiResponseToDashboardViewModel(responseWithTwoWorkstreams, [milestoneFeb]);

      const ws2 = vm.workstreamCards.find((c) => c.workstreamId === 'ws-2');
      expect(ws2?.milestoneGroups).toEqual([]);
    });

    it('is backwards compatible - milestoneGroups is [] when no milestones parameter', () => {
      const vm = mapApiResponseToDashboardViewModel(fullApiResponse);

      expect(vm.workstreamCards).toHaveLength(1);
      expect(vm.workstreamCards[0].milestoneGroups).toEqual([]);
    });
  });

  describe('carry-over % formatting (2 decimal places)', () => {
    it('formats carry-over % with 2 decimal places', () => {
      const responseWithCarryOver: ApiResponse = {
        ...fullApiResponse,
        workstreams: [
          {
            ...fullApiResponse.workstreams[0]!,
            metrics: {
              ...fullApiResponse.workstreams[0]!.metrics,
              carryOverRate: { value: 12.3456, avg: 8.999, rag: 'Green' },
            },
          },
        ],
      };

      const vm = mapApiResponseToDashboardViewModel(responseWithCarryOver);
      const carryOver = vm.workstreamCards[0].metrics.find((m) => m.label === 'Carry-Over %');

      expect(carryOver?.value).toBe('12.35%');
      expect(carryOver?.avgLabel).toBe('9.00%');
    });

    it('formats whole-number carry-over % with .00 suffix', () => {
      const responseWithCarryOver: ApiResponse = {
        ...fullApiResponse,
        workstreams: [
          {
            ...fullApiResponse.workstreams[0]!,
            metrics: {
              ...fullApiResponse.workstreams[0]!.metrics,
              carryOverRate: { value: 15, avg: 10, rag: 'Green' },
            },
          },
        ],
      };

      const vm = mapApiResponseToDashboardViewModel(responseWithCarryOver);
      const carryOver = vm.workstreamCards[0].metrics.find((m) => m.label === 'Carry-Over %');

      expect(carryOver?.value).toBe('15.00%');
      expect(carryOver?.avgLabel).toBe('10.00%');
    });

    it('shows "N/A" for null carry-over %', () => {
      const responseWithNullCarryOver: ApiResponse = {
        ...fullApiResponse,
        workstreams: [
          {
            ...fullApiResponse.workstreams[0]!,
            metrics: {
              ...fullApiResponse.workstreams[0]!.metrics,
              carryOverRate: { value: null, avg: null, rag: null },
            },
          },
        ],
      };

      const vm = mapApiResponseToDashboardViewModel(responseWithNullCarryOver);
      const carryOver = vm.workstreamCards[0].metrics.find((m) => m.label === 'Carry-Over %');

      expect(carryOver?.value).toBe('N/A');
    });
  });

  describe('overhead % adapter mapping (task 2.12)', () => {
    it('correctly passes non-null overheadPercent from API to metric tile', () => {
      const responseWithOverhead: ApiResponse = {
        ...fullApiResponse,
        workstreams: [
          {
            ...fullApiResponse.workstreams[0]!,
            metrics: {
              ...fullApiResponse.workstreams[0]!.metrics,
              overheadPercent: { value: 18.5, avg: 22.0, rag: 'Green' },
            },
          },
        ],
      };

      const vm = mapApiResponseToDashboardViewModel(responseWithOverhead);
      const overhead = vm.workstreamCards[0].metrics.find((m) => m.label === 'Overhead %');

      expect(overhead?.rawValue).toBe(18.5);
      expect(overhead?.value).toBe('18.50%');
      expect(overhead?.avgLabel).toBe('22.00%');
    });
  });

  describe('overheadBreakdown mapping in mapTrendSprint (tasks 2.13-2.15)', () => {
    it('maps overheadBreakdown from API trend sprint to view model with all 4 categories', () => {
      const responseWithBreakdown: ApiResponse = {
        ...fullApiResponse,
        workstreams: [
          {
            ...fullApiResponse.workstreams[0]!,
            trends: {
              sprints: [
                {
                  sprintId: 's1',
                  sprintName: 'Sprint 1',
                  velocity: 30,
                  velocityRate: 0.5,
                  activeBugs: 1,
                  bugsClosed: 0,
                  mode: 'actual',
                  overheadBreakdown: [
                    { category: 'Meetings', hours: 20.5 },
                    { category: 'Bugs', hours: 8 },
                    { category: 'Spikes', hours: 4 },
                    { category: 'Support', hours: 2 },
                  ],
                },
              ],
            },
          },
        ],
      };

      const vm = mapApiResponseToDashboardViewModel(responseWithBreakdown);
      const sprint = vm.workstreamCards[0].trendSprints[0];

      expect(sprint.overheadBreakdown).toHaveLength(4);
      expect(sprint.overheadBreakdown!.find((i) => i.category === 'Meetings')?.hours).toBe(20.5);
      expect(sprint.overheadBreakdown!.find((i) => i.category === 'Bugs')?.hours).toBe(8);
      expect(sprint.overheadBreakdown!.find((i) => i.category === 'Spikes')?.hours).toBe(4);
      expect(sprint.overheadBreakdown!.find((i) => i.category === 'Support')?.hours).toBe(2);
    });

    it('defaults missing categories to 0 when overheadBreakdown is partial', () => {
      const responseWithPartialBreakdown: ApiResponse = {
        ...fullApiResponse,
        workstreams: [
          {
            ...fullApiResponse.workstreams[0]!,
            trends: {
              sprints: [
                {
                  sprintId: 's1',
                  sprintName: 'Sprint 1',
                  velocity: 30,
                  velocityRate: 0.5,
                  activeBugs: 0,
                  bugsClosed: 0,
                  mode: 'actual',
                  overheadBreakdown: [{ category: 'Meetings', hours: 10.25 }],
                },
              ],
            },
          },
        ],
      };

      const vm = mapApiResponseToDashboardViewModel(responseWithPartialBreakdown);
      const sprint = vm.workstreamCards[0].trendSprints[0];

      expect(sprint.overheadBreakdown).toHaveLength(4);
      expect(sprint.overheadBreakdown!.find((i) => i.category === 'Meetings')?.hours).toBe(10.25);
      expect(sprint.overheadBreakdown!.find((i) => i.category === 'Spikes')?.hours).toBe(0);
      expect(sprint.overheadBreakdown!.find((i) => i.category === 'Bugs')?.hours).toBe(0);
      expect(sprint.overheadBreakdown!.find((i) => i.category === 'Support')?.hours).toBe(0);
    });

    it('returns all 4 categories with hours=0 when overheadBreakdown is absent', () => {
      const vm = mapApiResponseToDashboardViewModel(fullApiResponse);
      const sprint = vm.workstreamCards[0].trendSprints[0];

      expect(sprint.overheadBreakdown).toHaveLength(4);
      sprint.overheadBreakdown!.forEach((item) => expect(item.hours).toBe(0));
    });
  });

  describe('enriched trend sprint fields (sprint-tabs spec)', () => {
    it('maps enriched snapshot fields to TrendSprintViewModel', () => {
      const responseWithEnriched: ApiResponse = {
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
                  velocityAvg: 32.5,
                  overheadPercentAvg: 24.8,
                  carryOverRateAvg: 9.5,
                  plannedPoints: 40,
                  completedPoints: 36,
                  carryOverPoints: 4,
                  grossHours: 75,
                },
              ],
            },
          },
        ],
      };

      const vm = mapApiResponseToDashboardViewModel(responseWithEnriched);
      const sprint = vm.workstreamCards[0].trendSprints[0];

      expect(sprint.velocityAvg).toBe(32.5);
      expect(sprint.overheadPercentAvg).toBe(24.8);
      expect(sprint.carryOverRateAvg).toBe(9.5);
      expect(sprint.plannedPoints).toBe(40);
      expect(sprint.completedPoints).toBe(36);
      expect(sprint.carryOverPoints).toBe(4);
      expect(sprint.grossHours).toBe(75);
    });

    it('defaults enriched fields to null when not present in API response', () => {
      const vm = mapApiResponseToDashboardViewModel(fullApiResponse);
      const sprint = vm.workstreamCards[0].trendSprints[0];

      expect(sprint.velocityAvg).toBeNull();
      expect(sprint.overheadPercentAvg).toBeNull();
      expect(sprint.carryOverRateAvg).toBeNull();
      expect(sprint.plannedPoints).toBeNull();
      expect(sprint.completedPoints).toBeNull();
      expect(sprint.carryOverPoints).toBeNull();
      expect(sprint.grossHours).toBeNull();
    });

    it('maps explicit null enriched fields to null', () => {
      const responseWithNulls: ApiResponse = {
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
                  velocityAvg: null,
                  overheadPercentAvg: null,
                  carryOverRateAvg: null,
                  plannedPoints: null,
                  completedPoints: null,
                  carryOverPoints: null,
                  grossHours: null,
                },
              ],
            },
          },
        ],
      };

      const vm = mapApiResponseToDashboardViewModel(responseWithNulls);
      const sprint = vm.workstreamCards[0].trendSprints[0];

      expect(sprint.velocityAvg).toBeNull();
      expect(sprint.overheadPercentAvg).toBeNull();
      expect(sprint.carryOverRateAvg).toBeNull();
      expect(sprint.plannedPoints).toBeNull();
      expect(sprint.completedPoints).toBeNull();
      expect(sprint.carryOverPoints).toBeNull();
      expect(sprint.grossHours).toBeNull();
    });
  });
});
