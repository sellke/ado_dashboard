/**
 * Metric engine types for velocity, overhead, predictability, and carry-over.
 * Used by calculator functions, orchestrator, and API routes.
 * @module lib/metrics/types
 */

// ============================================================================
// Constants
// ============================================================================

/** Work item states that indicate completion */
export const DONE_STATES = ['Closed', 'Done', 'Resolved'] as const;
export type DoneState = (typeof DONE_STATES)[number];

/** Bug-specific state sets (explicit ADO state classification). */
export const BUG_OPEN_STATES = ['New', 'Active'] as const;
export const BUG_RESOLVED_STATES = ['Resolved', 'Testing', 'Closed'] as const;
export type BugOpenState = (typeof BUG_OPEN_STATES)[number];
export type BugResolvedState = (typeof BUG_RESOLVED_STATES)[number];

/** Singleton key for program-wide metric engine configuration. */
export const DEFAULT_METRIC_ENGINE_CONFIG_KEY = 'default' as const;

/** Scalar knobs that control metric engine behavior outside threshold bands. */
export interface MetricEngineConfigInput {
  velocityGreenFloor: number;
  velocityAmberFloor: number;
  rollingWindow: number;
  cycleTimeRollingWindow: number;
  includeAdpMetrics: boolean;
}

/** Defaults that reproduce the pre-configuration metric engine behavior. */
export const DEFAULT_ENGINE_CONFIG: MetricEngineConfigInput = {
  velocityGreenFloor: 1.0,
  velocityAmberFloor: 0.7,
  rollingWindow: 4,
  cycleTimeRollingWindow: 4,
  includeAdpMetrics: true,
};

export type MetricCategory = 'deliveryPoints' | 'overheadHours';

/** Per-category work-item inclusion rule persisted by MetricRuleConfig. */
export interface MetricRuleConfigInput {
  category: MetricCategory;
  workItemType: string;
  included: boolean;
}

export const METRIC_CATEGORIES = ['deliveryPoints', 'overheadHours'] as const;
export const CONFIGURABLE_WORK_ITEM_TYPES = [
  'Epic',
  'UserStory',
  'Task',
  'Feature',
  'Bug',
  'Spike',
  'Support',
] as const;

/** Encodes current behavior: only Bug and Spike are excluded from delivery-point metrics. */
export const DEFAULT_DELIVERY_EXCLUDED_TYPES = ['Bug', 'Spike'] as const;
export const DEFAULT_OVERHEAD_INCLUDED_TYPES = ['Bug', 'Spike', 'Support'] as const;

export const DEFAULT_METRIC_RULE_CONFIGS: MetricRuleConfigInput[] =
  CONFIGURABLE_WORK_ITEM_TYPES.flatMap((workItemType) => [
    {
      category: 'deliveryPoints',
      workItemType,
      included: !(DEFAULT_DELIVERY_EXCLUDED_TYPES as readonly string[]).includes(workItemType),
    },
    {
      category: 'overheadHours',
      workItemType,
      included: (DEFAULT_OVERHEAD_INCLUDED_TYPES as readonly string[]).includes(workItemType),
    },
  ]);

export const CYCLE_TIME_WORK_ITEM_TYPES = ['UserStory', 'Spike', 'Bug'] as const;
export type CycleTimeWorkItemType = (typeof CYCLE_TIME_WORK_ITEM_TYPES)[number];

// ============================================================================
// Input types for pure calculator functions
// ============================================================================

/** Minimal work item shape accepted by metric calculators (pure functions) */
export interface WorkItemInput {
  type: string;
  state: string;
  storyPoints: number | null;
  originalEstimate: number | null;
  completedWork: number | null;
}

/** Minimal work item shape accepted by pure cycle-time calculators. */
export interface CycleTimeWorkItemInput {
  type: string;
  workstreamId: string | null;
  adoActivatedDate: Date | null;
  adoClosedDate: Date | null;
}

/** Inclusive done-date window used to scope cycle-time calculations. */
export interface CycleTimeWindow {
  startDate: Date;
  endDate: Date;
}

/** Minimal SprintWorkstream shape for overhead calculation */
export interface SprintWorkstreamInput {
  grossHours: number | null;
  ceremonyHours: number | null;
}

/** Threshold config shape for RAG assignment */
export interface ThresholdConfigInput {
  metricName: string;
  greenMin: number;
  greenMax: number;
  amberMin: number;
  amberMax: number;
}

export const DEFAULT_THRESHOLD_CONFIGS: ThresholdConfigInput[] = [
  {
    metricName: 'sprintPredictability',
    greenMin: 80,
    greenMax: 100,
    amberMin: 60,
    amberMax: 79.99,
  },
  { metricName: 'carryOverRate', greenMin: 0, greenMax: 10, amberMin: 10.01, amberMax: 25 },
  { metricName: 'overheadPercent', greenMin: 0, greenMax: 30, amberMin: 30.01, amberMax: 45 },
  {
    metricName: 'deliveryToBugRatio',
    greenMin: 0,
    greenMax: 0.25,
    amberMin: 0.26,
    amberMax: 0.5,
  },
  { metricName: 'agingWipDays', greenMin: 0, greenMax: 5, amberMin: 5.01, amberMax: 10 },
  { metricName: 'scopeCreepIndex', greenMin: 0, greenMax: 10, amberMin: 10.01, amberMax: 20 },
  {
    metricName: 'milestoneMonthly',
    greenMin: 80,
    greenMax: 100,
    amberMin: 60,
    amberMax: 79.99,
  },
  {
    metricName: 'milestoneQuarterly',
    greenMin: 80,
    greenMax: 100,
    amberMin: 60,
    amberMax: 79.99,
  },
];

/** Minimal shape for sprint plan snapshot rows used by carry-over calculation */
export interface SprintPlanSnapshotInput {
  storyPoints: number | null;
  state: string;
  type: string;
}

/** Prior sprint snapshot shape for rolling average calculation */
export interface PriorSnapshot {
  velocity: number | null;
  overheadPercent: number | null;
  predictability: number | null;
  carryOverRate: number | null;
}

// ============================================================================
// Calculator result types
// ============================================================================

/** Overhead calculation result with both hours and percentage */
export interface OverheadResult {
  overheadHours: number;
  overheadPercent: number | null;
  ceremonyHours: number;
  bugHours: number;
  spikeHours: number;
  supportHours: number;
}

// ============================================================================
// Core metric types
// ============================================================================

/** RAG (Red/Amber/Green) color for metric health indicators */
export type RagColor = 'Green' | 'Amber' | 'Red' | null;

/**
 * Raw computed metric values before RAG/rolling enrichment.
 * Output of calculator functions; consumed by orchestrator for persistence.
 */
export interface MetricValues {
  /** Completed points per sprint (velocity) */
  velocity: number | null;
  /** Overhead hours as % of gross hours */
  overheadPercent: number | null;
  /** completedPoints / plannedPoints × 100 (percentage, 0–100+) */
  predictability: number | null;
  /** carryOverPoints / plannedPoints × 100 (percentage, 0–100) */
  carryOverRate: number | null;
  /** Number of items carried over from prior sprint */
  carryOverItems: number | null;
  /** Story points carried over from prior sprint */
  carryOverPoints: number | null;
  /** Planned points for the sprint */
  plannedPoints: number | null;
  /** Completed points for the sprint */
  completedPoints: number | null;
  /** Non-delivery hours (ceremony, PTO, etc.) */
  overheadHours: number | null;
  /** Total capacity hours */
  grossHours: number | null;
}

/**
 * A single metric with its value, rolling average, and RAG color.
 * Used in WorkstreamMetrics and ProgramMetrics for display/API.
 */
export interface MetricWithRag {
  /** Current sprint value */
  value: number | null;
  /** Rolling average from prior 4 sprints */
  average: number | null;
  /** Health indicator from threshold config */
  rag: RagColor;
}

/**
 * Per-workstream metric bundle for a single sprint.
 * Maps to one MetricSnapshot row; used by orchestrator and API.
 */
export interface WorkstreamMetrics {
  workstreamId: string;
  workstreamName: string;
  sprintId: string;
  sprintName: string;
  velocity: MetricWithRag;
  overheadPercent: MetricWithRag;
  predictability: MetricWithRag;
  carryOverRate: MetricWithRag;
  carryOverItems: number | null;
  carryOverPoints: number | null;
  plannedPoints: number | null;
  completedPoints: number | null;
  overheadHours: number | null;
  grossHours: number | null;
  computedAt: Date;
}

/**
 * Program-level weighted aggregate metrics.
 * Sums/weighted averages across workstreams for a sprint.
 */
export interface ProgramMetrics {
  sprintId: string;
  sprintName: string;
  velocity: MetricWithRag;
  overheadPercent: MetricWithRag;
  predictability: MetricWithRag;
  carryOverRate: MetricWithRag;
  totalPlannedPoints: number;
  totalCompletedPoints: number;
  totalOverheadHours: number;
  totalGrossHours: number;
  workstreamCount: number;
}

/**
 * Rolling averages from prior sprint snapshots (4-sprint window).
 * Used to enrich MetricSnapshot with *_Avg fields.
 */
export interface RollingAverages {
  velocityAvg: number | null;
  overheadPercentAvg: number | null;
  predictabilityAvg: number | null;
  carryOverRateAvg: number | null;
}

/**
 * Result of a predictability calculation.
 * Planned vs completed points and ratio.
 */
export interface PredictabilityResult {
  plannedPoints: number;
  completedPoints: number;
  predictability: number;
}

/**
 * Result of a carry-over calculation.
 * Items/points carried over and rate vs planned.
 */
export interface CarryOverResult {
  carryOverItems: number;
  carryOverPoints: number;
  plannedPoints: number;
  carryOverRate: number;
}

export interface CycleTimeByType {
  totalBusinessDays: number;
  averageBusinessDays: number | null;
  completedItemCount: number;
  unavailableItemCount: number;
}

export type CycleTimeBreakdown = Record<CycleTimeWorkItemType, CycleTimeByType>;

export interface WorkstreamCycleTimeResult {
  workstreamId: string | null;
  byType: CycleTimeBreakdown;
}

export interface CycleTimeResult {
  program: CycleTimeBreakdown;
  workstreams: WorkstreamCycleTimeResult[];
}

/**
 * Result returned by the metric computation orchestrator.
 * Includes per-workstream metrics, optional program aggregate, and errors.
 */
export interface ComputeMetricsResult {
  sprintId: string;
  sprintName: string;
  workstreams: WorkstreamMetrics[];
  program: ProgramMetrics | null;
  errors: Array<{ workstreamId: string; error: string }>;
  computedAt: Date;
}
