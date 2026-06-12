/**
 * Sync configuration for ADO iteration and workstream sync.
 * Story 2: iteration ingestion and sprint resolution.
 */

import { INGEST_SPRINT_DEPTH } from './window';

export const SYNC_CONFIG = {
  projectNameOrId: 'Event Streaming Platform',
  lookbackSprintCount: INGEST_SPRINT_DEPTH,
  /** Umbrella team for iteration queries (all sub-teams share same schedule). */
  iterationTeamId: 'b30190ac-1acd-41dd-bd50-97f93be264e4',
} as const;
