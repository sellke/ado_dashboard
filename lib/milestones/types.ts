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
