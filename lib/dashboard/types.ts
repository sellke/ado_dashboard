/**
 * Dashboard data contract types.
 * API response shapes and UI view model types for the dashboard shell.
 */

export type RagStatus = 'Green' | 'Amber' | 'Red' | null;

export interface ApiMetric {
  value: number | null;
  avg?: number | null;
  rag: string | null;
  mode?: 'actual' | 'projected';
}

export interface ApiTrendSprint {
  sprintId: string;
  sprintName: string;
  velocity: number | null;
  velocityRate: number | null;
  activeBugs: number;
  bugsClosed: number;
  mode: 'actual';
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
  trends?: {
    sprints: ApiTrendSprint[];
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
    trends?: {
      sprints: ApiTrendSprint[];
    };
    prediction?: {
      sprint5?: {
        velocity: number | null;
        mode: 'predicted';
        formula: string;
      };
    };
  } | null;
  computedAt: string | null;
  rollingWindow?: {
    count: number;
    currentSprintId: string | null;
    sprints: Array<{ id: string; name: string; startDate: string; endDate: string }>;
  } | null;
}

export type ViewState = 'loading' | 'success' | 'empty' | 'error';

export interface MetricTileViewModel {
  label: string;
  value: string;
  rawValue: number | null;
  unit: string;
  rag: RagStatus;
  avgLabel: string | null;
  mode?: 'actual' | 'projected';
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
  trendSprints: Array<{
    sprintId: string;
    sprintName: string;
    velocity: string;
    velocityRate: string;
    activeBugs: string;
    bugsClosed: string;
  }>;
}

export interface DashboardViewModel {
  state: ViewState;
  sprintLabel: string | null;
  rollingWindowLabel: string | null;
  computedAtLabel: string | null;
  programMetrics: MetricTileViewModel[] | null;
  programTrendSprints: Array<{
    sprintId: string;
    sprintName: string;
    velocity: string;
    velocityRate: string;
    activeBugs: string;
    bugsClosed: string;
  }>;
  sprint5Prediction: {
    velocity: string;
    isPredicted: boolean;
  } | null;
  workstreamCards: WorkstreamCardViewModel[];
  errorMessage?: string;
}
