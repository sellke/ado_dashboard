/**
 * Milestone API response shape from GET /api/milestones
 */
export interface ApiMilestone {
  id: string;
  title: string;
  workstreamId: string;
  targetMonth: string;
  status: string;
  adoFeatureId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  workstream: { id: string; name: string };
}

export interface ApiBurnupPoint {
  sprintName: string;
  sprintId: string;
  cumulativeCompletedSP: number;
  totalSP: number;
}

/** ApiMilestone extended with ADO-computed progress fields. */
export interface ApiMilestoneWithProgress extends ApiMilestone {
  completedPoints: number;
  totalPoints: number;
  /** null when totalPoints === 0 */
  percentComplete: number | null;
  burnupData: ApiBurnupPoint[];
}

export interface ApiProgramMilestoneRollup {
  /** e.g. "February 2026" */
  currentMonth: string;
  currentMonthCompletionPercent: number | null;
  currentMonthTotalSP: number;
  currentMonthCompletedSP: number;
  quarterlyMilestones: {
    total: number;
    complete: number;
    inProgress: number;
    notStarted: number;
  };
}

/** Wrapper response shape for GET /api/milestones (breaking change from plain array). */
export interface ApiMilestonesResponse {
  milestones: ApiMilestoneWithProgress[];
  programRollup: ApiProgramMilestoneRollup;
}
