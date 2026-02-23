/**
 * ADO REST API client for server-side sync.
 * Thin wrapper around fetch for team iterations, WIQL queries, and work item batch fetch.
 * Uses ADO_PAT and ADO_ORG from environment.
 */

import type { AdoWorkItemRaw } from './mappers';
import type { AdoCapacityMember, AdoIterationInput } from './types';

/** Retry options for transient failures. */
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 500;

function getAdoEnv(): { org: string; pat: string } {
  const org = process.env.ADO_ORG?.trim();
  const pat = process.env.ADO_PAT?.trim();

  if (!org) {
    throw new Error('Missing ADO_ORG environment variable.');
  }

  if (!pat) {
    throw new Error('Missing ADO_PAT environment variable.');
  }

  return { org, pat };
}

async function buildAdoError(res: Response, context: string): Promise<Error> {
  const body = await res
    .text()
    .then((t) => t.slice(0, 300))
    .catch(() => '');
  const bodySuffix = body ? ` Body: ${body}` : '';
  return new Error(`${context} failed (${res.status} ${res.statusText}).${bodySuffix}`);
}

interface AdoIterationResponse {
  id?: string;
  name?: string;
  path?: string;
  attributes?: {
    startDate?: string;
    finishDate?: string;
    /** ADO: 0=past, 1=current, 2=future. API may return string "current" etc. */
    timeFrame?: number | string;
  };
}

/**
 * Fetch team iterations from Azure DevOps REST API.
 *
 * @param project - Project name or ID
 * @param team - Team ID (GUID) or name
 * @returns Normalized iterations for rolling window selection
 * @throws on network/permission errors; returns [] when org not configured
 */
export async function fetchTeamIterations(
  project: string,
  team: string
): Promise<AdoIterationInput[]> {
  const { org, pat } = getAdoEnv();
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/${encodeURIComponent(team)}/_apis/work/teamsettings/iterations?api-version=7.0&$top=100`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const auth = Buffer.from(`:${pat}`).toString('base64');
  headers.Authorization = `Basic ${auth}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw await buildAdoError(res, 'ADO team iterations request');
  }

  const data = (await res.json()) as { value?: AdoIterationResponse[] };
  const raw = data.value ?? [];

  return raw
    .filter((i) => i.path && i.attributes?.startDate && i.attributes?.finishDate)
    .map((i) => {
      const tf = i.attributes!.timeFrame;
      const isCurrent = tf === 1 || tf === 'current' || tf === 'Current';
      return {
        path: i.path!,
        name: i.name ?? i.path!,
        id: i.id,
        startDate: new Date(i.attributes!.startDate!),
        finishDate: new Date(i.attributes!.finishDate!),
        isCurrent,
      };
    });
}

// ---------------------------------------------------------------------------
// WIQL Query (Story 3)
// ---------------------------------------------------------------------------

interface WiqlResponse {
  workItems?: Array<{ id: number; url?: string }>;
}

/**
 * Execute a WIQL query against the ADO REST API and return matching work item IDs.
 *
 * @param project - Project name or ID
 * @param query - WIQL query string (SELECT [System.Id] FROM WorkItems WHERE ...)
 * @returns Array of work item IDs; empty on error or when org not configured
 */
export async function fetchWorkItemIdsByWiql(project: string, query: string): Promise<number[]> {
  const { org, pat } = getAdoEnv();
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/wit/wiql?api-version=7.0`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const auth = Buffer.from(`:${pat}`).toString('base64');
  headers.Authorization = `Basic ${auth}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw await buildAdoError(res, 'ADO WIQL request');
  }

  const data = (await res.json()) as WiqlResponse;
  return (data.workItems ?? []).map((wi) => wi.id);
}

// ---------------------------------------------------------------------------
// Work Items Batch Fetch (Story 3)
// ---------------------------------------------------------------------------

interface WorkItemBatchResponse {
  count?: number;
  value?: Array<{
    id: number;
    rev: number;
    fields: Record<string, unknown>;
  }>;
}

/** Maximum IDs per batch request (ADO REST API limit). */
const BATCH_SIZE = 200;

/**
 * Batch-fetch work item details by IDs from the ADO REST API.
 * Handles batching internally when more than 200 IDs are requested.
 *
 * @param project - Project name or ID
 * @param ids - Work item IDs to fetch
 * @param fields - ADO field reference names to include in the response
 * @returns Array of raw work item objects (id, rev, fields); skips failed batches
 */
export async function fetchWorkItemsBatch(
  project: string,
  ids: number[],
  fields: string[]
): Promise<AdoWorkItemRaw[]> {
  if (ids.length === 0) {
    return [];
  }
  const { org, pat } = getAdoEnv();

  const baseUrl = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/wit/workitemsbatch?api-version=7.0`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const auth = Buffer.from(`:${pat}`).toString('base64');
  headers.Authorization = `Basic ${auth}`;

  const results: AdoWorkItemRaw[] = [];

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids: batch, fields }),
    });
    if (!res.ok) {
      throw await buildAdoError(res, 'ADO workitems batch request');
    }

    const data = (await res.json()) as WorkItemBatchResponse;
    if (data.value) {
      for (const v of data.value) {
        results.push({
          id: v.id,
          rev: v.rev,
          fields: v.fields as AdoWorkItemRaw['fields'],
        });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Team Capacity (Story 4)
// ---------------------------------------------------------------------------

/**
 * ADO capacity API response uses `teamMembers` (not `value`).
 * Shape: { teamMembers: AdoCapacityMember[], totalCapacityPerDay: number, totalDaysOff: number }
 */
interface CapacityApiResponse {
  teamMembers?: AdoCapacityMember[];
  totalCapacityPerDay?: number;
  totalDaysOff?: number;
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Result of fetchTeamCapacity including retry count for SyncLog. */
export interface FetchTeamCapacityResult {
  members: AdoCapacityMember[];
  retries: number;
}

/**
 * Fetch team capacity for a specific iteration from ADO REST API.
 * Uses exponential backoff: max 3 retries for transient failures (5xx, timeout).
 *
 * @param project - Project name or ID
 * @param team - Team ID (GUID) or name
 * @param iterationId - ADO iteration GUID
 * @returns Members and retry count; empty members on error or when org not configured
 */
export async function fetchTeamCapacity(
  project: string,
  team: string,
  iterationId: string
): Promise<FetchTeamCapacityResult> {
  if (!iterationId) {
    return { members: [], retries: 0 };
  }
  const { org, pat } = getAdoEnv();

  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/${encodeURIComponent(team)}/_apis/work/teamsettings/iterations/${iterationId}/capacities?api-version=7.0`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  const auth = Buffer.from(`:${pat}`).toString('base64');
  headers.Authorization = `Basic ${auth}`;

  let lastError: Error | undefined;
  for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = (await res.json()) as CapacityApiResponse;
        return { members: data.teamMembers ?? [], retries: attempt };
      }
      // Retry on 5xx or 429
      if (res.status >= 500 || res.status === 429) {
        lastError = new Error(`ADO capacity API ${res.status}: ${res.statusText}`);
        if (attempt < RETRY_MAX_ATTEMPTS - 1) {
          const delay = RETRY_BASE_MS * 2 ** attempt;
          await sleep(delay);
        }
        continue;
      }
      throw await buildAdoError(res, 'ADO capacity request');
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < RETRY_MAX_ATTEMPTS - 1) {
        const delay = RETRY_BASE_MS * 2 ** attempt;
        await sleep(delay);
      }
    }
  }

  if (lastError) {
    throw lastError;
  }
  return { members: [], retries: RETRY_MAX_ATTEMPTS - 1 };
}
