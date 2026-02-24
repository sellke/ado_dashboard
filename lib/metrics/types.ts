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
