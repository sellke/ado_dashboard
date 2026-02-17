/**
 * Shared mock factories for dashboard tests and stories.
 * Produces representative payloads that exercise all states.
 */

import { mapApiResponseToDashboardViewModel } from '@/lib/dashboard/adapter';
import type {
  ApiMetric,
  ApiResponse,
  ApiWorkstream,
  DashboardViewModel,
  MetricTileViewModel,
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
        label: 'Overhead %',
        value: '28%',
        rawValue: 28,
        unit: '%',
        rag: 'Green',
      }),
      createMetricTile({
        label: 'Predictability',
        value: '92%',
        rawValue: 92,
        unit: '%',
        rag: 'Green',
      }),
      createMetricTile({
        label: 'Carry-over rate',
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
      },
      {
        sprintId: 's2',
        sprintName: 'Sprint 2',
        velocity: '42 pts',
        velocityRate: '0.70 pts/hr',
        activeBugs: '3',
        bugsClosed: '4',
      },
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
          label: 'Velocity',
          value: '128 pts',
          rawValue: 128,
          avgLabel: '120.5 pts',
          rag: 'Green',
        }),
        createMetricTile({ label: 'Overhead %', value: '31.2%', rawValue: 31.2, rag: 'Amber' }),
        createMetricTile({ label: 'Predictability', value: '82%', rawValue: 82, rag: 'Green' }),
        createMetricTile({ label: 'Carry-over rate', value: '12%', rawValue: 12, rag: 'Amber' }),
      ],
      programTrendSprints: [
        {
          sprintId: 's1',
          sprintName: 'Sprint 1',
          velocity: '110 pts',
          velocityRate: '1.20 pts/hr',
          activeBugs: '11',
          bugsClosed: '16',
        },
        {
          sprintId: 's2',
          sprintName: 'Sprint 2',
          velocity: '118 pts',
          velocityRate: '1.25 pts/hr',
          activeBugs: '9',
          bugsClosed: '18',
        },
      ],
      sprint5Prediction: { velocity: '124 pts', isPredicted: true },
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
      },
    },
  });
}

/** Map ApiResponse to DashboardViewModel via adapter (for integration tests). */
export function apiResponseToViewModel(response: ApiResponse): DashboardViewModel {
  return mapApiResponseToDashboardViewModel(response);
}
