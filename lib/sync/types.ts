/**
 * Types for ADO sync orchestration.
 */

import type { SyncType } from '@prisma/client';

/** Per-workstream execution summary (persisted to SyncLog and returned in API). */
export interface PerWorkstreamSummary {
  workstreamId: string;
  status: 'Success' | 'Failed';
  itemsFetched: number;
  itemsCreated: number;
  itemsUpdated: number;
  /** Count of work items skipped due to unsupported type (Story 3 diagnostics). */
  itemsSkipped?: number;
  /** Capacity sync summary (Story 4: retries, succeeded/failed, locked). */
  capacitySummary?: {
    sprintsUpserted: number;
    sprintsSkippedLocked: number;
    retries: number;
    error?: string;
  };
  /** Feature Goal Sync summary (Story 1 — Phase 1E). */
  milestoneSummary?: {
    featuresFetched: number;
    featuresUpserted: number;
    milestonesCreated: number;
    milestonesUpdated: number;
    childStoriesFetched?: number;
    childStoriesUpserted?: number;
  };
  error?: string;
}

/** Result from a single workstream sync phase. */
export interface WorkstreamSyncResult {
  itemsFetched: number;
  itemsCreated: number;
  itemsUpdated: number;
  /** Count of work items skipped due to unsupported type (Story 3 diagnostics). */
  itemsSkipped?: number;
}

/** ADO iteration shape for rolling window selection. */
export interface AdoIterationInput {
  path: string;
  name: string;
  /** ADO iteration GUID for capacity API (optional; populated when fetched from iterations endpoint). */
  id?: string;
  startDate?: Date;
  finishDate?: Date;
  isCurrent?: boolean;
}

/** ADO capacity API: activity with capacityPerDay. */
export interface AdoCapacityActivity {
  name: string;
  capacityPerDay: number;
}

/** ADO capacity API: day off date range. */
export interface AdoCapacityDaysOff {
  start?: string;
  end?: string;
}

/** ADO capacity API: single team member capacity. */
export interface AdoCapacityMember {
  teamMember?: { displayName?: string };
  activities?: AdoCapacityActivity[];
  daysOff?: AdoCapacityDaysOff[];
}

/** Aggregated capacity for SprintWorkstream. */
export interface AggregatedCapacity {
  grossHours: number;
  ptoHours: number;
  ceremonyHours: number;
  fteCount: number;
  /** Members counted for meeting overhead (dev / QA / BA); see countMeetingOverheadMembers. */
  meetingOverheadMemberCount: number;
}

/** Per-workstream capacity sync result (for SyncLog / diagnostics). */
export interface CapacitySyncResult {
  sprintsUpserted: number;
  sprintsSkippedLocked: number;
  retries: number;
  error?: string;
  locked?: boolean;
}

/** Sync orchestration input. */
export interface SyncOrchestratorInput {
  syncType?: SyncType;
  /** Optional override for testing (e.g. partial failure scenarios). */
  syncWorkstreamFn?: (
    workstreamId: string,
    syncType: 'Full' | 'WorkItems' | 'Iterations' | 'Capacity'
  ) => Promise<WorkstreamSyncResult>;
  /** Optional iterations fetcher for Iterations/Full sync. When omitted, iteration sync is skipped. */
  iterationsFetcher?: () => Promise<AdoIterationInput[]>;
}

/** Sync orchestration result returned to API. */
export interface SyncOrchestratorResult {
  syncLogId: string;
  summary: {
    status: 'Success' | 'Failed';
    /** Top-level orchestration errors (e.g., missing ADO config, iteration/capacity failures). */
    errorMessage?: string | null;
    workstreams: PerWorkstreamSummary[];
    totals: {
      itemsFetched: number;
      itemsCreated: number;
      itemsUpdated: number;
    };
    /** Current sprint ID for downstream exclusion from rolling averages. */
    currentSprintId?: string | null;
    /** Current sprint ADO iteration path for downstream exclusion. */
    currentSprintPath?: string | null;
    /** Number of sprints upserted in iteration sync (Story 2). */
    sprintsSynced?: number;
  };
}
