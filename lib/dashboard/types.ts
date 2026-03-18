/**
 * Dashboard data contract types.
 * API response shapes and UI view model types for the dashboard shell.
 */

import type { ApiBurnupPoint } from '../milestones/types';
import type { StatusGroup } from '../sprints/status-mapping';

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
  /** Explicit Qx quarter tag (e.g. "Q4"), or null if untagged. */
  quarter: string | null;
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

export interface ApiOverheadItemsBySprint {
  sprintId: string;
  bugs: ApiOverheadItem[];
  spikes: ApiOverheadItem[];
  support: ApiOverheadItem[];
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
  /** Bugs in open states (New|Active). */
  activeBugs: number;
  /** Bugs in resolved states (Resolved|Testing|Closed) with changedDate within sprint window. */
  bugsClosed: number;
  mode: 'actual';
  bugs?: Array<{ adoId: number; title: string; state: string }>;
  overheadComposition?: ApiOverheadComposition;
  /** Per-category overhead breakdown for the overhead trend chart (Story 6/7). */
  overheadBreakdown?: OverheadBreakdownItem[];

  /** Rolling avg velocity as-of this sprint (from MetricSnapshot). */
  velocityAvg?: number | null;
  /** Rolling avg overhead % as-of this sprint (from MetricSnapshot). */
  overheadPercentAvg?: number | null;
  /** Rolling avg carry-over % as-of this sprint (from MetricSnapshot). */
  carryOverRateAvg?: number | null;
  /** Planned points for this sprint (from MetricSnapshot). */
  plannedPoints?: number | null;
  /** Completed points for this sprint (from MetricSnapshot). */
  completedPoints?: number | null;
  /** Carry-over points for this sprint (from MetricSnapshot). */
  carryOverPoints?: number | null;
  /** Gross hours for this sprint (from MetricSnapshot). */
  grossHours?: number | null;
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
  overheadItemsBySprint?: ApiOverheadItemsBySprint[];
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
  adoUrl: string;
}

export interface OverheadSprintViewModel {
  sprintId: string;
  bugs: OverheadItemViewModel[];
  spikes: OverheadItemViewModel[];
  support: OverheadItemViewModel[];
}

export interface WorkstreamCardViewModel {
  workstreamId: string;
  workstreamName: string;
  metrics: MetricTileViewModel[];
  detailSprintLabel?: string | null;
  detail: {
    plannedPoints: string;
    completedPoints: string;
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
  overheadItemsBySprint: OverheadSprintViewModel[];
  milestoneGroups: MilestoneMonthGroup[];
}

export interface TrendBugViewModel {
  adoId: string;
  title: string;
  /** True when bug state is in BUG_RESOLVED_STATES (Resolved|Testing|Closed). */
  isClosed: boolean;
}

export interface TrendSprintViewModel {
  sprintId: string;
  sprintName: string;
  velocity: string;
  velocityRate: string;
  /** Formatted active bug count — bugs in New|Active states. */
  activeBugs: string;
  /** Formatted closed bug count — bugs in Resolved|Testing|Closed states. */
  bugsClosed: string;
  rawVelocity: number | null;
  rawVelocityRate: number | null;
  /** Raw active bug count — bugs in New|Active states. */
  rawActiveBugs: number;
  /** Raw closed bug count — bugs in Resolved|Testing|Closed states. */
  rawBugsClosed: number;
  bugs: TrendBugViewModel[];
  /** Per-category overhead breakdown for the overhead trend chart (Story 6/7). */
  overheadBreakdown?: OverheadBreakdownItem[];

  /** Rolling avg velocity as-of this sprint (raw number for component formatting). */
  velocityAvg: number | null;
  /** Rolling avg overhead % as-of this sprint. */
  overheadPercentAvg: number | null;
  /** Rolling avg carry-over % as-of this sprint. */
  carryOverRateAvg: number | null;
  /** Planned points for this sprint. */
  plannedPoints: number | null;
  /** Completed points for this sprint. */
  completedPoints: number | null;
  /** Carry-over points for this sprint. */
  carryOverPoints: number | null;
  /** Gross hours for this sprint. */
  grossHours: number | null;
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

// ============================================================================
// Sprint Stories types (Sprint Story List feature)
// ============================================================================

/** Raw API response shape from GET /api/sprints/stories */
export interface SprintStoriesApiResponse {
  sprints: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    stories: Array<{
      adoId: number;
      title: string;
      assignedTo: string | null;
      storyPoints: number | null;
      state: string;
      statusGroup: StatusGroup;
    }>;
  }>;
}

/** View model for a single story row in the sprint story list */
export interface StoryRowViewModel {
  adoId: string;
  title: string;
  assignedTo: string;
  storyPoints: string;
  state: string;
  statusGroup: StatusGroup;
  adoUrl: string;
}

/** View model for a group of stories sharing the same status */
export interface StatusGroupViewModel {
  group: StatusGroup;
  stories: StoryRowViewModel[];
}

/** View model for a single sprint tab in the story list panel */
export interface SprintStoryViewModel {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  statusGroups: StatusGroupViewModel[];
  totalStories: number;
}
