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
  bugs?: Array<{ adoId: number; title: string; state: string }>;
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
  prediction?: {
    velocity: number | null;
    velocityRate: number | null;
    mode: 'predicted';
    formula: string;
  };
}

export interface ApiMilestoneMetric {
  value: number | null;
  rag: RagStatus;
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
      averageVelocityRate?: number | null;
      milestoneMonthly?: ApiMilestoneMetric | null;
      milestoneQuarterly?: ApiMilestoneMetric | null;
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
  trendSprints: TrendSprintViewModel[];
  prediction: {
    velocity: string;
    rawVelocity: number | null;
    velocityRate: string;
    rawVelocityRate: number | null;
    sprintLabel: string;
    isPredicted: boolean;
  } | null;
}

export interface TrendBugViewModel {
  adoId: string;
  title: string;
  isClosed: boolean;
}

export interface TrendSprintViewModel {
  sprintId: string;
  sprintName: string;
  velocity: string;
  velocityRate: string;
  activeBugs: string;
  bugsClosed: string;
  rawVelocity: number | null;
  rawVelocityRate: number | null;
  rawActiveBugs: number;
  rawBugsClosed: number;
  bugs: TrendBugViewModel[];
}

export interface DashboardViewModel {
  state: ViewState;
  sprintLabel: string | null;
  rollingWindowLabel: string | null;
  computedAtLabel: string | null;
  programMetrics: MetricTileViewModel[] | null;
  programTrendSprints: TrendSprintViewModel[];
  sprint5Prediction: {
    velocity: string;
    rawVelocity: number | null;
    sprintLabel: string;
    isPredicted: boolean;
  } | null;
  workstreamCards: WorkstreamCardViewModel[];
  errorMessage?: string;
}
