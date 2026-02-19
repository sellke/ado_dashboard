/**
 * Dashboard configuration.
 * Maps dashboard identifiers to the workstream names they include.
 * Workstreams still sync and compute metrics independently;
 * this config controls which workstreams surface on which dashboard.
 */

export type DashboardId = 'main' | 'streams';

export interface DashboardConfig {
  id: DashboardId;
  title: string;
  workstreamNames: string[];
}

export const DASHBOARDS: Record<DashboardId, DashboardConfig> = {
  main: {
    id: 'main',
    title: 'Dashboard',
    workstreamNames: ['Action Tracker', 'Pitch Tracker', 'KPI Services', 'UCM'],
  },
  streams: {
    id: 'streams',
    title: 'Streams Dashboard',
    workstreamNames: ['Streams'],
  },
};

/** Resolve dashboard config; falls back to 'main' for unknown values. */
export function resolveDashboard(raw: string | null | undefined): DashboardConfig {
  if (raw && raw in DASHBOARDS) {
    return DASHBOARDS[raw as DashboardId];
  }
  return DASHBOARDS.main;
}
