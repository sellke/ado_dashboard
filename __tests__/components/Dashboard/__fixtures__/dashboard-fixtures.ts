/**
 * Shared mock factories for dashboard tests and stories.
 * Produces representative payloads that exercise all states.
 */

import { mapApiResponseToDashboardViewModel } from '@/lib/dashboard/adapter';
import type {
  ApiMetric,
  ApiOverheadItem,
  ApiResponse,
  ApiWorkstream,
  DashboardViewModel,
  MetricTileViewModel,
  OverheadCompositionViewModel,
  OverheadItemViewModel,
  WorkstreamCardViewModel,
} from '@/lib/dashboard/types';

/** Create a MetricTileViewModel with optional overrides. */
export function createMetricTile(
  overrides: Partial<MetricTileViewModel> = {}
): MetricTileViewModel {
  return {
    label: 'Velocity',
    value: '45 pts',
    rawValue: 45,
    unit: 'pts',
    rag: 'Green',
    avgLabel: null,
    ...overrides,
  };
}

/** Create a sample OverheadCompositionViewModel. */
export function createOverheadCompositionViewModel(
  overrides: Partial<OverheadCompositionViewModel> = {}
): OverheadCompositionViewModel {
  return {
    sprintName: 'Sprint 1',
    ceremonyHours: 10.25,
    bugHours: 5,
    spikeHours: 2,
    supportHours: 3,
    overheadPercent: '25%',
    ...overrides,
  };
}

/** Create a sample OverheadItemViewModel. */
export function createOverheadItemViewModel(
  overrides: Partial<OverheadItemViewModel> = {}
): OverheadItemViewModel {
  return {
    adoId: '#12345',
    title: 'Login crash',
    state: 'Active',
    hours: '4.5 hrs',
    isClosed: false,
    ...overrides,
  };
}

/** Create a sample ApiOverheadItem (API layer). */
export function createApiOverheadItem(overrides: Partial<ApiOverheadItem> = {}): ApiOverheadItem {
  return {
    adoId: 12345,
    title: 'Login crash',
    state: 'Active',
    hours: 4.5,
    ...overrides,
  };
}

/** Create a WorkstreamCardViewModel with optional overrides. */
export function createWorkstreamCard(
  overrides: Partial<WorkstreamCardViewModel> = {}
): WorkstreamCardViewModel {
  return {
    workstreamId: 'ws-1',
    workstreamName: 'Platform',
    metrics: [
      createMetricTile({
        label: 'Velocity',
        value: '45 pts',
        rawValue: 45,
        unit: 'pts',
        rag: 'Green',
      }),
      createMetricTile({
        label: 'Velocity Rate',
        value: '0.85 pts/hr',
        rawValue: 0.85,
        unit: 'pts/hr',
        rag: null,
      }),
      createMetricTile({
        label: 'Overhead %',
        value: '28%',
        rawValue: 28,
        unit: '%',
        rag: 'Green',
      }),
      createMetricTile({
        label: 'Carry-Over %',
        value: '12%',
        rawValue: 12,
        unit: '%',
        rag: 'Green',
      }),
    ],
    detail: {
      plannedPoints: '50',
      completedPoints: '45',
      carryOverItems: '3',
      carryOverPoints: '6',
    },
    trendSprints: [
      {
        sprintId: 's1',
        sprintName: 'Sprint 1',
        velocity: '40 pts',
        velocityRate: '0.67 pts/hr',
        activeBugs: '2',
        bugsClosed: '5',
        rawVelocity: 40,
        rawVelocityRate: 0.67,
        rawActiveBugs: 2,
        rawBugsClosed: 5,
        bugs: [
          { adoId: '12345', title: 'Login crash', isClosed: true },
          { adoId: '67890', title: 'Slow query', isClosed: false },
        ],
        overheadBreakdown: [
          { category: 'Meetings' as const, hours: 10.25 },
          { category: 'Spikes' as const, hours: 4 },
          { category: 'Bugs' as const, hours: 5 },
          { category: 'Support' as const, hours: 3 },
        ],
      },
      {
        sprintId: 's2',
        sprintName: 'Sprint 2',
        velocity: '42 pts',
        velocityRate: '0.70 pts/hr',
        activeBugs: '3',
        bugsClosed: '4',
        rawVelocity: 42,
        rawVelocityRate: 0.7,
        rawActiveBugs: 3,
        rawBugsClosed: 4,
        bugs: [{ adoId: '11111', title: 'Memory leak', isClosed: true }],
        overheadBreakdown: [
          { category: 'Meetings' as const, hours: 10.25 },
          { category: 'Spikes' as const, hours: 2 },
          { category: 'Bugs' as const, hours: 6 },
          { category: 'Support' as const, hours: 2 },
        ],
      },
    ],
    prediction: {
      velocity: '48 pts',
      rawVelocity: 48,
      velocityRate: '0.85 pts/hr',
      rawVelocityRate: 0.85,
      sprintLabel: 'Sprint 26.21',
      isPredicted: true,
    },
    overheadComposition: [
      createOverheadCompositionViewModel({ sprintName: 'Sprint 1' }),
      createOverheadCompositionViewModel({
        sprintName: 'Sprint 2',
        ceremonyHours: 10.25,
        bugHours: 6,
        overheadPercent: '27%',
      }),
    ],
    milestoneGroups: [],
    currentSprintBugItems: [
      createOverheadItemViewModel({
        adoId: '#12345',
        title: 'Login crash',
        state: 'Closed',
        hours: '4.5 hrs',
        isClosed: true,
      }),
      createOverheadItemViewModel({
        adoId: '#67890',
        title: 'Slow query',
        state: 'Active',
        hours: 'N/A',
        isClosed: false,
      }),
    ],
    currentSprintSupportItems: [
      createOverheadItemViewModel({
        adoId: '#11111',
        title: 'Infra request',
        state: 'Done',
        hours: '2 hrs',
        isClosed: true,
      }),
    ],
    ...overrides,
  };
}

/** Create a DashboardViewModel for a given state with optional overrides. */
export function createDashboardViewModel(
  state: 'loading' | 'success' | 'empty' | 'error',
  overrides: Partial<DashboardViewModel> = {}
): DashboardViewModel {
  const base: Record<string, DashboardViewModel> = {
    loading: {
      state: 'loading',
      sprintLabel: null,
      rollingWindowLabel: null,
      computedAtLabel: null,
      programMetrics: null,
      programTrendSprints: [],
      sprint5Prediction: null,
      workstreamCards: [],
    },
    success: {
      state: 'success',
      sprintLabel: 'Sprint 26.21',
      rollingWindowLabel: 'Rolling 5 sprints (current + 4 prior)',
      computedAtLabel: '2/11/2026, 6:30:00 PM',
      programMetrics: [
        createMetricTile({
          label: 'Avg Total Velocity',
          value: '120.5 pts',
          rawValue: 120.5,
          rag: 'Green',
        }),
        createMetricTile({
          label: 'Avg Total Velocity Rate',
          value: '0.85 pts/hr',
          rawValue: 0.85,
          unit: 'pts/hr',
          rag: null,
        }),
        createMetricTile({
          label: 'Avg Total Overhead %',
          value: '29.00%',
          rawValue: 29,
          unit: '%',
          rag: 'Amber',
        }),
        createMetricTile({
          label: 'Avg Total Carry-Over %',
          value: '13.50%',
          rawValue: 13.5,
          unit: '%',
          rag: 'Amber',
        }),
      ],
      programTrendSprints: [
        {
          sprintId: 's1',
          sprintName: 'Sprint 1',
          velocity: '110 pts',
          velocityRate: '1.20 pts/hr',
          activeBugs: '11',
          bugsClosed: '16',
          rawVelocity: 110,
          rawVelocityRate: 1.2,
          rawActiveBugs: 11,
          rawBugsClosed: 16,
          bugs: [],
        },
        {
          sprintId: 's2',
          sprintName: 'Sprint 2',
          velocity: '118 pts',
          velocityRate: '1.25 pts/hr',
          activeBugs: '9',
          bugsClosed: '18',
          rawVelocity: 118,
          rawVelocityRate: 1.25,
          rawActiveBugs: 9,
          rawBugsClosed: 18,
          bugs: [],
        },
      ],
      sprint5Prediction: {
        velocity: '124 pts',
        rawVelocity: 124,
        sprintLabel: 'Sprint 26.21',
        isPredicted: true,
      },
      workstreamCards: [
        createWorkstreamCard({ workstreamId: 'ws-1', workstreamName: 'Platform' }),
        createWorkstreamCard({ workstreamId: 'ws-2', workstreamName: 'Apps' }),
      ],
    },
    empty: {
      state: 'empty',
      sprintLabel: null,
      rollingWindowLabel: null,
      computedAtLabel: null,
      programMetrics: null,
      programTrendSprints: [],
      sprint5Prediction: null,
      workstreamCards: [],
    },
    error: {
      state: 'error',
      sprintLabel: null,
      rollingWindowLabel: null,
      computedAtLabel: null,
      programMetrics: null,
      programTrendSprints: [],
      sprint5Prediction: null,
      workstreamCards: [],
      errorMessage: 'Failed to load metrics',
    },
  };
  return { ...base[state], ...overrides };
}

/** Create an ApiMetric with optional overrides. */
function createApiMetric(overrides: Partial<ApiMetric> = {}): ApiMetric {
  return {
    value: 45,
    avg: 42,
    rag: 'Green',
    ...overrides,
  };
}

/** Create an ApiWorkstream with optional overrides. */
function createApiWorkstream(overrides: Partial<ApiWorkstream> = {}): ApiWorkstream {
  return {
    workstreamId: 'ws-1',
    workstreamName: 'Platform',
    metrics: {
      velocity: createApiMetric({ value: 45, avg: 42, rag: 'Green' }),
      overheadPercent: createApiMetric({ value: 28, avg: 26, rag: 'Green' }),
      predictability: createApiMetric({ value: 92, avg: 88, rag: 'Green' }),
      carryOverRate: createApiMetric({ value: 12, avg: 10, rag: 'Green' }),
    },
    detail: {
      plannedPoints: 50,
      completedPoints: 45,
      carryOverItems: 3,
      carryOverPoints: 6,
      overheadHours: 22,
      grossHours: 80,
    },
    currentSprintOverheadItems: {
      bugs: [
        createApiOverheadItem({ adoId: 12345, title: 'Login crash', state: 'Closed', hours: 4.5 }),
        createApiOverheadItem({ adoId: 67890, title: 'Slow query', state: 'Active', hours: null }),
      ],
      support: [
        createApiOverheadItem({ adoId: 11111, title: 'Infra request', state: 'Done', hours: 2 }),
      ],
    },
    ...overrides,
  };
}

/** Create an ApiResponse with optional overrides. */
export function createApiResponse(overrides: Partial<ApiResponse> = {}): ApiResponse {
  return {
    sprint: {
      id: 's1',
      name: 'Sprint 26.21',
      startDate: '2026-01-06',
      endDate: '2026-01-19',
    },
    workstreams: [
      createApiWorkstream({ workstreamId: 'ws-1', workstreamName: 'Platform' }),
      createApiWorkstream({ workstreamId: 'ws-2', workstreamName: 'Apps' }),
    ],
    program: {
      metrics: {
        velocity: createApiMetric({ value: 128, avg: 120.5, rag: 'Green' }),
        overheadPercent: createApiMetric({ value: 31.2, avg: 29, rag: 'Amber' }),
        predictability: createApiMetric({ value: 82, avg: 80.5, rag: 'Green' }),
        carryOverRate: createApiMetric({ value: 12, avg: 13.5, rag: 'Amber' }),
        milestoneMonthly: { value: null, rag: null },
        milestoneQuarterly: { value: null, rag: null },
      },
    },
    computedAt: '2026-02-11T18:30:00.000Z',
    rollingWindow: {
      count: 5,
      currentSprintId: 's1',
      sprints: [
        { id: 's1', name: 'Sprint 26.21', startDate: '2026-01-06', endDate: '2026-01-19' },
        { id: 's2', name: 'Sprint 26.20', startDate: '2025-12-23', endDate: '2026-01-05' },
        { id: 's3', name: 'Sprint 26.19', startDate: '2025-12-09', endDate: '2025-12-22' },
        { id: 's4', name: 'Sprint 26.18', startDate: '2025-11-25', endDate: '2025-12-08' },
        { id: 's5', name: 'Sprint 26.17', startDate: '2025-11-11', endDate: '2025-11-24' },
      ],
    },
    ...overrides,
  };
}

/** Create empty ApiResponse (null payload). */
export function createEmptyApiResponse(): ApiResponse {
  return {
    sprint: null,
    workstreams: [],
    program: null,
    computedAt: null,
    rollingWindow: null,
  };
}

/** Create ApiResponse with mixed RAG statuses across workstreams. */
export function createMixedRagApiResponse(): ApiResponse {
  return createApiResponse({
    workstreams: [
      createApiWorkstream({
        workstreamId: 'ws-1',
        workstreamName: 'Platform',
        metrics: {
          velocity: createApiMetric({ value: 45, rag: 'Green' }),
          overheadPercent: createApiMetric({ value: 35, rag: 'Amber' }),
          predictability: createApiMetric({ value: 72, rag: 'Red' }),
          carryOverRate: createApiMetric({ value: 18, rag: 'Amber' }),
        },
      }),
      createApiWorkstream({
        workstreamId: 'ws-2',
        workstreamName: 'Apps',
        metrics: {
          velocity: createApiMetric({ value: 32, rag: 'Amber' }),
          overheadPercent: createApiMetric({ value: 42, rag: 'Red' }),
          predictability: createApiMetric({ value: 88, rag: 'Green' }),
          carryOverRate: createApiMetric({ value: 5, rag: 'Green' }),
        },
      }),
    ],
    program: {
      metrics: {
        velocity: createApiMetric({ value: 77, rag: 'Amber' }),
        overheadPercent: createApiMetric({ value: 38, rag: 'Red' }),
        predictability: createApiMetric({ value: 80, rag: 'Green' }),
        carryOverRate: createApiMetric({ value: 11, rag: 'Amber' }),
        milestoneMonthly: { value: null, rag: null },
        milestoneQuarterly: { value: null, rag: null },
      },
    },
  });
}

/** Map ApiResponse to DashboardViewModel via adapter (for integration tests). */
export function apiResponseToViewModel(response: ApiResponse): DashboardViewModel {
  return mapApiResponseToDashboardViewModel(response);
}
