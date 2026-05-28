import type { DashboardId } from './config';

export const DASHBOARD_WORKSTREAM_SCOPE_STORAGE_PREFIX = 'dashboardWorkstreamScope:v1';

export interface DashboardWorkstreamScopePayload {
  includedWorkstreamIds: string[];
  updatedAt: string;
}

export interface WorkstreamScopeOption {
  id: string;
  name: string;
}

export type ResolvedWorkstreamScopeSource = 'saved' | 'default';

export interface ResolvedWorkstreamScope {
  includedWorkstreamIds: string[];
  source: ResolvedWorkstreamScopeSource;
}

export type ParsedScopedQuery =
  | { kind: 'absent'; ids: null }
  | { kind: 'invalid'; ids: [] }
  | { kind: 'scoped'; ids: string[] };

export function dashboardWorkstreamScopeKey(dashboardId: DashboardId): string {
  return `${DASHBOARD_WORKSTREAM_SCOPE_STORAGE_PREFIX}:${dashboardId}`;
}

function normalizeIds(ids: readonly string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

export function parseDashboardWorkstreamScope(raw: string | null): string[] | null {
  if (!raw) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as Partial<DashboardWorkstreamScopePayload>;
    if (!Array.isArray(payload.includedWorkstreamIds)) {
      return null;
    }

    const ids = normalizeIds(
      payload.includedWorkstreamIds.filter((id): id is string => typeof id === 'string')
    );
    return ids.length > 0 ? ids : null;
  } catch {
    return null;
  }
}

export function loadDashboardWorkstreamScope(
  storage: Pick<Storage, 'getItem'> | null | undefined,
  dashboardId: DashboardId
): string[] | null {
  if (!storage) {
    return null;
  }

  try {
    return parseDashboardWorkstreamScope(storage.getItem(dashboardWorkstreamScopeKey(dashboardId)));
  } catch {
    return null;
  }
}

export function saveDashboardWorkstreamScope(
  storage: Pick<Storage, 'setItem'>,
  dashboardId: DashboardId,
  includedWorkstreamIds: readonly string[],
  updatedAt = new Date()
): DashboardWorkstreamScopePayload {
  const ids = normalizeIds(includedWorkstreamIds);
  if (ids.length === 0) {
    throw new Error('At least one workstream must be included');
  }

  const payload = {
    includedWorkstreamIds: ids,
    updatedAt: updatedAt.toISOString(),
  };
  storage.setItem(dashboardWorkstreamScopeKey(dashboardId), JSON.stringify(payload));
  return payload;
}

export function resolveDashboardWorkstreamScope(args: {
  storedIds: readonly string[] | null;
  workstreams: readonly WorkstreamScopeOption[];
  defaultWorkstreamNames: readonly string[];
}): ResolvedWorkstreamScope {
  const availableIds = new Set(args.workstreams.map((workstream) => workstream.id));

  if (args.storedIds && args.storedIds.length > 0) {
    const validStoredIds = normalizeIds(args.storedIds).filter((id) => availableIds.has(id));
    if (validStoredIds.length > 0) {
      return { includedWorkstreamIds: validStoredIds, source: 'saved' };
    }
  }

  const defaultNames = new Set(args.defaultWorkstreamNames);
  return {
    includedWorkstreamIds: args.workstreams
      .filter((workstream) => defaultNames.has(workstream.name))
      .map((workstream) => workstream.id),
    source: 'default',
  };
}

export function parseScopedWorkstreamIds(searchParams: URLSearchParams): ParsedScopedQuery {
  if (!searchParams.has('workstreamIds')) {
    return { kind: 'absent', ids: null };
  }

  const ids = normalizeIds((searchParams.get('workstreamIds') ?? '').split(','));
  if (ids.length === 0) {
    return { kind: 'invalid', ids: [] };
  }

  return { kind: 'scoped', ids };
}

export function validateScopedWorkstreamIds(
  requestedIds: readonly string[],
  availableIds: readonly string[]
): string[] {
  const available = new Set(availableIds);
  return normalizeIds(requestedIds).filter((id) => available.has(id));
}

export function buildWorkstreamIdsQuery(includedWorkstreamIds: readonly string[]): string {
  const ids = normalizeIds(includedWorkstreamIds);
  if (ids.length === 0) {
    return '';
  }

  return `workstreamIds=${encodeURIComponent(ids.join(','))}`;
}

export function appendWorkstreamIdsParam(url: string, includedWorkstreamIds: readonly string[]): string {
  const query = buildWorkstreamIdsQuery(includedWorkstreamIds);
  if (!query) {
    return url;
  }

  return `${url}${url.includes('?') ? '&' : '?'}${query}`;
}
