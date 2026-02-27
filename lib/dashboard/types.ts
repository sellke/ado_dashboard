/**
 * Dashboard data contract types.
 * API response shapes and UI view model types for the dashboard shell.
 */

import type { ApiBurnupPoint } from '../milestones/types';

export type RagStatus = 'Green' | 'Amber' | 'Red' | null;

/** Re-export for adapter use */
export type { ApiBurnupPoint, ApiProgramMilestoneRollup } from '../milestones/types';
export type { ApiMilestoneWithProgress as ApiMilestoneProgress } from '../milestones/types';

/** View model for a single milestone goal with formatted display values */
export interface MilestoneGoalViewModel {
  id: string;
  title: string;
  workstreamId: string;
  targetMonth: string;
  monthLabel: string;
  isCurrentMonth: boolean;
  adoFeatureId: string | null;
  percentComplete: string;
  completedPoints: number;
  totalPoints: number;
  burnupData: ApiBurnupPoint[];
  status: string;
}

/** Group of milestones for a single month, ordered current → future → past */
export interface MilestoneMonthGroup {
  monthLabel: string;
  isCurrentMonth: boolean;
  milestones: MilestoneGoalViewModel[];
  groupCompletionPercent: string;
}

export interface ApiMetric {
  value: number | null;
  avg?: number | null;
  rag: string | null;
  mode?: 'actual' | 'projected';
}

export interface ApiOverheadComposition {
  ceremonyHours: number | null;
  bugHours: number | null;
  spikeHours: number | null;
  supportHours: number | null;
  totalOverheadHours: number | null;
  overheadPercent: number | null;
}

export interface ApiOverheadItem {
  adoId: number;
  title: string;
  state: string;
  hours: number | null;
}

/** Overhead category type for breakdown chart (Meetings, Spikes, Bugs, Support). */
export type OverheadCategory = 'Meetings' | 'Spikes' | 'Bugs' | 'Support';

/** Per-category overhead hours for a single sprint. */
export interface OverheadBreakdownItem {
  category: OverheadCategory;
  hours: number;
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
  overheadComposition?: ApiOverheadComposition;
  /** Per-category overhead breakdown for the overhead trend chart (Story 6/7). */
  overheadBreakdown?: OverheadBreakdownItem[];
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
  currentSprintOverheadItems?: {
    bugs: ApiOverheadItem[];
    support: ApiOverheadItem[];
  };
}

export interface ApiMilestoneMetric {
  value: number | null;
  rag: RagStatus;
}

export interface ApiResponse {
  sprint: { id: string; name: string; startDate: string; endDate: string } | null;
  detailSprint?: { name: string; startDate: string; endDate: string } | null;
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

export interface OverheadCompositionViewModel {
  sprintName: string;
  ceremonyHours: number;
  bugHours: number;
  spikeHours: number;
  supportHours: number;
  overheadPercent: string;
}

export interface OverheadItemViewModel {
  adoId: string;
  title: string;
  state: string;
  hours: string;
  isClosed: boolean;
}

export interface WorkstreamCardViewModel {
  workstreamId: string;
  workstreamName: string;
  metrics: MetricTileViewModel[];
  detailSprintLabel?: string | null;
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
  overheadComposition: OverheadCompositionViewModel[];
  currentSprintBugItems: OverheadItemViewModel[];
  currentSprintSupportItems: OverheadItemViewModel[];
  milestoneGroups: MilestoneMonthGroup[];
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
  /** Per-category overhead breakdown for the overhead trend chart (Story 6/7). */
  overheadBreakdown?: OverheadBreakdownItem[];
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
