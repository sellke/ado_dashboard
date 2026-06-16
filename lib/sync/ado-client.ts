/**
 * ADO REST API client for server-side sync.
 * Wraps node:https (see {@link adoFetch}) for team iterations, WIQL queries, and
 * work item batch fetch. Resolves ADO_PAT from the encrypted credential store
 * first, then falls back to environment bootstrap.
 */

import { getResolvedPat, isPlaceholderPat } from './credentials';
import type { AdoWorkItemRaw } from './mappers';
import type { AdoCapacityMember, AdoIterationInput } from './types';

/** Retry options for transient failures. */
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 500;

export async function resolveAdoEnv(): Promise<{ org: string; pat: string }> {
  const org = process.env.ADO_ORG?.trim();
  const pat = await getResolvedPat();

  if (!org) {
    throw new Error('Missing ADO_ORG environment variable.');
  }

  if (!pat) {
    throw new Error('Missing ADO_PAT credential.');
  }

  return { org, pat };
}

/**
 * Minimal fetch-shaped response returned by {@link adoFetch}.
 */
interface AdoHttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

interface AdoFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export class AdoRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'AdoRequestError';
  }
}

/**
 * Corporate TLS-intercepting proxies re-sign HTTPS with a root CA that lives in
 * the OS trust store but not in Node's bundled CA list. Node's global fetch
 * (undici) cannot be reconfigured to trust it on this runtime
 * (tls.setDefaultCACertificates is unavailable on some Node builds), so ADO
 * requests go through node:https with an Agent that trusts the system CA store.
 * This avoids "unable to get local issuer certificate" errors behind such proxies.
 */
let cachedCaAgent: unknown;

function getSystemCaAgent(): unknown {
  if (cachedCaAgent !== undefined) {
    return cachedCaAgent;
  }
  const getBuiltinModule = (
    process as unknown as {
      getBuiltinModule?: (id: string) => unknown;
    }
  ).getBuiltinModule;
  if (typeof getBuiltinModule !== 'function') {
    cachedCaAgent = null;
    return cachedCaAgent;
  }
  try {
    const tls = getBuiltinModule('node:tls') as {
      getCACertificates?: (type: string) => string[];
    };
    const https = getBuiltinModule('node:https') as {
      Agent: new (opts: { ca: string[]; keepAlive: boolean }) => unknown;
    };
    const getCa = typeof tls.getCACertificates === 'function' ? tls.getCACertificates : null;
    const ca = getCa ? Array.from(new Set([...getCa('default'), ...getCa('system')])) : [];
    cachedCaAgent = new https.Agent({ ca, keepAlive: true });
  } catch {
    cachedCaAgent = null;
  }
  return cachedCaAgent;
}

/**
 * fetch-shaped HTTPS request that trusts the OS/system CA store.
 * Falls back to global fetch when the node:https path is unavailable.
 */
async function adoFetch(url: string, options: AdoFetchOptions = {}): Promise<AdoHttpResponse> {
  const agent = getSystemCaAgent();
  const getBuiltinModule = (
    process as unknown as {
      getBuiltinModule?: (id: string) => unknown;
    }
  ).getBuiltinModule;

  if (!agent || typeof getBuiltinModule !== 'function') {
    const res = await fetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
      redirect: 'manual',
    });
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      json: () => res.json(),
      text: () => res.text(),
    };
  }

  const https = getBuiltinModule('node:https') as {
    request: (
      url: string,
      opts: { method?: string; headers?: Record<string, string>; agent: unknown },
      cb: (res: {
        statusCode?: number;
        statusMessage?: string;
        on: (ev: string, cb: (chunk?: unknown) => void) => void;
      }) => void
    ) => {
      on: (ev: string, cb: (err: Error) => void) => void;
      write: (data: string) => void;
      end: () => void;
    };
  };

  return new Promise<AdoHttpResponse>((resolve, reject) => {
    const req = https.request(
      url,
      { method: options.method ?? 'GET', headers: options.headers, agent },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk?: unknown) => {
          chunks.push(chunk as Buffer);
        });
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          const status = res.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: res.statusMessage ?? '',
            json: async () => JSON.parse(text),
            text: async () => text,
          });
        });
      }
    );
    req.on('error', (err: Error) => {
      reject(err);
    });
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function buildAdoError(res: AdoHttpResponse, context: string): Promise<Error> {
  const body = await res
    .text()
    .then((t) => t.slice(0, 300))
    .catch(() => '');
  const bodySuffix = body ? ` Body: ${body}` : '';
  return new AdoRequestError(
    `${context} failed (${res.status} ${res.statusText}).${bodySuffix}`,
    res.status
  );
}

function buildAdoHeadersForPat(pat: string, contentType?: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  headers.Authorization = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
  return headers;
}

async function buildAdoHeaders(contentType?: string): Promise<Record<string, string>> {
  const { pat } = await resolveAdoEnv();
  return buildAdoHeadersForPat(pat, contentType);
}

export interface AdoProject {
  id: string;
  name: string;
}

export interface AdoTeam {
  id: string;
  name: string;
  projectName?: string;
}

interface AdoProjectResponse {
  value?: Array<{ id?: string; name?: string }>;
}

interface AdoTeamResponse {
  value?: Array<{ id?: string; name?: string; projectName?: string }>;
}

export interface AdoProbeResult {
  ok: boolean;
  status: number;
  statusText?: string;
}

export async function probeAdoPat(pat: string, org: string): Promise<AdoProbeResult> {
  const trimmedPat = pat.trim();
  const trimmedOrg = org.trim();
  if (!trimmedOrg) {
    throw new Error('Missing ADO_ORG environment variable.');
  }
  if (!trimmedPat || isPlaceholderPat(trimmedPat)) {
    return { ok: false, status: 401, statusText: 'Missing or placeholder PAT' };
  }

  const url = `https://dev.azure.com/${trimmedOrg}/_apis/projects?$top=1&api-version=7.0`;
  const res = await adoFetch(url, { headers: buildAdoHeadersForPat(trimmedPat) });
  return { ok: res.ok, status: res.status, statusText: res.statusText };
}

export function isAdoAuthError(error: unknown): boolean {
  if (error instanceof AdoRequestError) {
    return error.status === 302 || error.status === 401 || error.status === 403;
  }

  if (error instanceof Error) {
    return /Missing ADO_PAT|Missing ADO_ORG|credential|placeholder|\b(302|401|403)\b/i.test(
      error.message
    );
  }

  return false;
}

export async function fetchAdoProjects(): Promise<AdoProject[]> {
  const { org } = await resolveAdoEnv();
  const url = `https://dev.azure.com/${org}/_apis/projects?api-version=7.0`;
  const res = await adoFetch(url, { headers: await buildAdoHeaders() });

  if (!res.ok) {
    throw await buildAdoError(res, 'ADO projects request');
  }

  const data = (await res.json()) as AdoProjectResponse;
  return (data.value ?? [])
    .filter((project): project is { id: string; name: string } =>
      Boolean(project.id && project.name)
    )
    .map((project) => ({ id: project.id, name: project.name }));
}

export async function fetchAdoTeams(project: string): Promise<AdoTeam[]> {
  const { org } = await resolveAdoEnv();
  const encodedProject = encodeURIComponent(project);
  const url = `https://dev.azure.com/${org}/_apis/projects/${encodedProject}/teams?api-version=7.0`;
  const res = await adoFetch(url, { headers: await buildAdoHeaders() });

  if (!res.ok) {
    throw await buildAdoError(res, 'ADO teams request');
  }

  const data = (await res.json()) as AdoTeamResponse;
  return (data.value ?? [])
    .filter((team): team is { id: string; name: string; projectName?: string } =>
      Boolean(team.id && team.name)
    )
    .map((team) => ({ id: team.id, name: team.name, projectName: team.projectName }));
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
  const { org } = await resolveAdoEnv();
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/${encodeURIComponent(team)}/_apis/work/teamsettings/iterations?api-version=7.0&$top=100`;

  const headers = await buildAdoHeaders();

  const res = await adoFetch(url, { headers });
  if (!res.ok) {
    throw await buildAdoError(res, 'ADO team iterations request');
  }

  const data = (await res.json()) as { value?: AdoIterationResponse[] };
  const raw = data.value ?? [];

  const iterations = raw
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

  return iterations;
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
  const { org } = await resolveAdoEnv();
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/wit/wiql?api-version=7.0`;

  const headers = await buildAdoHeaders('application/json');

  const res = await adoFetch(url, {
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
  const { org } = await resolveAdoEnv();

  const baseUrl = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_apis/wit/workitemsbatch?api-version=7.0`;

  const headers = await buildAdoHeaders('application/json');

  const results: AdoWorkItemRaw[] = [];

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const res = await adoFetch(baseUrl, {
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
  const { org } = await resolveAdoEnv();

  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/${encodeURIComponent(team)}/_apis/work/teamsettings/iterations/${iterationId}/capacities?api-version=7.0`;

  const headers = await buildAdoHeaders();

  let lastError: Error | undefined;
  for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await adoFetch(url, { headers });
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
