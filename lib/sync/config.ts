/**
 * Sync configuration for ADO iteration and workstream sync.
 * Story 2: iteration ingestion and sprint resolution.
 */

export const SYNC_CONFIG = {
  projectNameOrId: 'Event Streaming Platform',
  lookbackSprintCount: 5, // current + 4 prior
  /** Umbrella team for iteration queries (all sub-teams share same schedule). */
  iterationTeamId: 'b30190ac-1acd-41dd-bd50-97f93be264e4',
  workstreams: [
    {
      name: 'Streams',
      teamId: 'ae8bcdaa-d61b-475c-ba34-13c88b1adf8e',
      adoAreaPathSuffix: '\\Streams',
    },
    {
      name: 'Action Tracker',
      teamId: '69fee166-1ccb-43b5-afcd-5d3f08fa2198',
      adoAreaPathSuffix: '\\Action Tracker',
    },
    {
      name: 'Pitch Tracker',
      teamId: '178ad7d2-bd20-42f9-a992-43b20dfa9b9e',
      adoAreaPathSuffix: '\\Pitch Tracker',
    },
    {
      name: 'KPI Services + UCM',
      teamId: 'ad5cf6e2-be70-45e5-8e0f-366558717b46',
      adoAreaPathSuffix: '\\Tier Boards',
    },
  ],
} as const;
