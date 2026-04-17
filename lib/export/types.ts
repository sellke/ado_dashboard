import type { ApiMilestoneWithProgress, ApiProgramMilestoneRollup } from '@/lib/milestones/types';
import type {
  ApiWorkstream,
  MetricTileViewModel,
  TrendSprintViewModel,
  WorkstreamCardViewModel,
} from '@/lib/dashboard/types';

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
}
