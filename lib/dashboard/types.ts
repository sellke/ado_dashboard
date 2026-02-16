/**
 * Dashboard data contract types.
 * API response shapes and UI view model types for the dashboard shell.
 */

export type RagStatus = 'Green' | 'Amber' | 'Red' | null;

export interface ApiMetric {
  value: number | null;
  avg?: number | null;
  rag: string | null;
}

export interface ApiWorkstream {
  workstreamId: string;
  workstreamName: string;
  metrics: {
    velocity: ApiMetric;
    overheadPercent: ApiMetric;
    predictability: ApiMetric;
    carryOverRate: ApiMetric;
  };
  detail: {
    plannedPoints: number | null;
    completedPoints: number | null;
    carryOverItems: number | null;
    carryOverPoints: number | null;
    overheadHours: number | null;
    grossHours: number | null;
  };
}

export interface ApiResponse {
  sprint: { id: string; name: string; startDate: string; endDate: string } | null;
  workstreams: ApiWorkstream[];
  program: {
    metrics: {
      velocity: ApiMetric;
      overheadPercent: ApiMetric;
      predictability: ApiMetric;
      carryOverRate: ApiMetric;
    };
  } | null;
  computedAt: string | null;
}

export type ViewState = 'loading' | 'success' | 'empty' | 'error';

export interface MetricTileViewModel {
  label: string;
  value: string;
  rawValue: number | null;
  unit: string;
  rag: RagStatus;
  avgLabel: string | null;
}

export interface WorkstreamCardViewModel {
  workstreamId: string;
  workstreamName: string;
  metrics: MetricTileViewModel[];
  detail: {
    plannedPoints: string;
    completedPoints: string;
    carryOverItems: string;
    carryOverPoints: string;
  };
}

export interface DashboardViewModel {
  state: ViewState;
  sprintLabel: string | null;
  computedAtLabel: string | null;
  programMetrics: MetricTileViewModel[] | null;
  workstreamCards: WorkstreamCardViewModel[];
  errorMessage?: string;
}
