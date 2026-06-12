import { SYNC_CONFIG } from './config';

export const DEFAULT_ADO_ORG = 'Operations-Innovation';
export const DEFAULT_SYNC_PROGRAM_CONFIG_KEY = 'default';

export const DEFAULT_SYNC_WORKSTREAMS = [
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
    name: 'KPI Services',
    teamId: 'ad5cf6e2-be70-45e5-8e0f-366558717b46',
    adoAreaPathSuffix: '\\Tier Boards',
  },
  {
    name: 'UCM',
    teamId: 'a30ebc14-025a-4960-be36-1eafb5a4c009',
    adoAreaPathSuffix: '\\Unified Configuration Manager',
  },
] as const;

export function buildDefaultAdoAreaPath(adoAreaPathSuffix: string) {
  return `${SYNC_CONFIG.projectNameOrId}\\App\\LiveLink - Yellow Box${adoAreaPathSuffix}`;
}
