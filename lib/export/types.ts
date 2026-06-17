import type { ApiMilestoneWithProgress, ApiProgramMilestoneRollup } from '@/lib/milestones/types';
import type {
  ApiWorkstream,
  MetricTileViewModel,
  TrendSprintViewModel,
  WorkstreamCardViewModel,
} from '@/lib/dashboard/types';

export interface ExportRagCounts {
  green: number;
  amber: number;
  red: number;
  unset: number;
}

/** Display-ready program health summary for snapshot slides. */
export interface ExportVisualizationSummary {
  healthLabel: string;
  ragCounts: ExportRagCounts;
  sprintWindowLabel: string;
  computedDateLabel: string | null;
  topRiskItems: string[];
  caveats: string[];
}

export interface ExportWorkstreamSnapshotMetric {
  label: string;
  value: string;
  rag: string | null;
}

/** Compact workstream card data for snapshot slides. */
export interface ExportWorkstreamSnapshot {
  workstreamId: string;
  workstreamName: string;
  keyMetrics: ExportWorkstreamSnapshotMetric[];
  statusCue: string | null;
  primaryCaveat: string | null;
  milestoneSummary: string | null;
}

export interface ExportRollingMetricRow {
  sprintName: string;
  value: string;
  rollingAverageValue: string | null;
}

export interface ExportRollingMetricSection {
  scope: 'program' | 'workstream';
  scopeLabel: string;
  metricLabel: string;
  summaryValue: string;
  rollingWindowLabel: string | null;
  rows: ExportRollingMetricRow[];
  emptyMessage: string | null;
}

export interface ExportCycleTimeTypeRow {
  typeLabel: string;
  averageLabel: string;
  completedItemCount: number;
  unavailableItemCount: number;
  unavailableLabel: string | null;
}

export interface ExportCycleTimeSection {
  scopeLabel: string;
  typeRows: ExportCycleTimeTypeRow[];
  caveat: string | null;
}

export interface ExportMilestoneContext {
  monthlyRollupLabel: string | null;
  quarterlyRollupLabel: string | null;
  sparseDataCaveat: string | null;
}

export interface ExportDataCaveat {
  severity: 'info' | 'warning' | 'critical';
  scopeLabel: string;
  message: string;
  sectionId?: string;
}

export interface ExportInput {
  sprintName: string;
  computedAt: string | null;
  /** Program-level metric tiles — null when metrics have not yet loaded. */
  programMetrics: MetricTileViewModel[] | null;
  /** Program-level milestone rollup — null when milestones are unavailable. */
  programRollup: ApiProgramMilestoneRollup | null;
  /** Program-level sprint trend — empty array when unavailable. */
  programTrendSprints: TrendSprintViewModel[];
  /** Forecasted velocity for the upcoming sprint (null when prediction unavailable). */
  sprint5Prediction: {
    rawVelocity: number | null;
    sprintLabel: string;
    isPredicted: boolean;
  } | null;
  /** View models for each workstream card (formatted strings + chart data). */
  workstreams: WorkstreamCardViewModel[];
  /** Raw API workstream shapes — used for workstream ID matching in milestone filtering. */
  rawWorkstreams: ApiWorkstream[];
  /** Milestone goals with burnup data — empty array when milestone data is unavailable. */
  milestones: ApiMilestoneWithProgress[];

  /** Optional layered-deck visualization fields — absent during incremental rollout. */
  visualizationSummary?: ExportVisualizationSummary;
  workstreamSnapshots?: ExportWorkstreamSnapshot[];
  rollingMetricAppendix?: ExportRollingMetricSection[];
  cycleTimeAppendix?: ExportCycleTimeSection[];
  milestoneContext?: ExportMilestoneContext | null;
  dataCaveats?: ExportDataCaveat[];
}
