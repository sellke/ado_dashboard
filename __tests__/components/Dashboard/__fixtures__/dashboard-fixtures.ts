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
      computedAtLabel: null,
      programMetrics: null,
      workstreamCards: [],
    },
    success: {
      state: 'success',
      sprintLabel: 'Sprint 26.21',
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
      workstreamCards: [
        createWorkstreamCard({ workstreamId: 'ws-1', workstreamName: 'Platform' }),
        createWorkstreamCard({ workstreamId: 'ws-2', workstreamName: 'Apps' }),
      ],
    },
    empty: {
      state: 'empty',
      sprintLabel: null,
      computedAtLabel: null,
      programMetrics: null,
      workstreamCards: [],
    },
    error: {
      state: 'error',
      sprintLabel: null,
      computedAtLabel: null,
      programMetrics: null,
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
