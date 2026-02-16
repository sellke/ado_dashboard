/**
 * Iteration ingestion and sprint resolution (Story 2).
 *
 * - Resolves rolling N-sprint window (current + N-1 prior)
 * - Upserts local Sprint records by ADO iteration path
 * - Deterministic selection across runs
 * - Future sprints excluded; output sorted by startDate descending (most recent first)
 */

import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { AdoIterationInput } from './types';

/** ADO iteration shape (alias for AdoIterationInput). */
export type AdoIteration = AdoIterationInput;

/** Result of upserting sprints from ADO iterations. */
export interface SprintUpsertResult {
  created: number;
  updated: number;
  sprintIds: Map<string, string>;
  currentSprintId: string | null;
  currentSprintPath: string | null;
}

/** Result of selectRollingSprints including current sprint reference. */
export interface RollingSprintSelection {
  sprints: AdoIterationInput[];
  currentSprint: AdoIterationInput | null;
}

/**
 * Select rolling N sprints: current + (count-1) most recent past.
 * Future sprints (startDate > now) excluded.
 * Output sorted by startDate descending (most recent first).
 * Deterministic across runs.
 *
 * @param iterations - All team iterations (with dates; isCurrent preferred when available)
 * @param count - Number of sprints to select (default 5)
 * @returns Selected sprints and current sprint reference
 */
export function selectRollingSprints(
  iterations: AdoIterationInput[],
  count: number = 5
): RollingSprintSelection {
  const now = new Date();
  const withDates = iterations.filter((i) => i.startDate != null && i.finishDate != null) as Array<
    AdoIterationInput & { startDate: Date; finishDate: Date }
  >;

  // Exclude future sprints (timeFrame=2): keep only past and current
  const pastAndCurrent = withDates.filter((i) => i.startDate <= now);
  if (pastAndCurrent.length === 0) {
    return { sprints: [], currentSprint: null };
  }

  const sorted = [...pastAndCurrent].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  // Prefer explicit isCurrent flag, fall back to date-range match, then last sprint
  let currentIdx = sorted.findIndex((i) => i.isCurrent === true);
  if (currentIdx < 0) {
    currentIdx = sorted.findIndex((i) => now >= i.startDate && now <= i.finishDate);
  }
  if (currentIdx < 0) {
    currentIdx = sorted.length - 1;
  }

  const startIdx = Math.max(0, currentIdx - (count - 1));
  const endIdx = Math.min(sorted.length, startIdx + count);
  const selected = sorted.slice(startIdx, endIdx).slice(0, count);

  // Sort most recent first (descending by startDate)
  const sprints = [...selected].sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  const currentSprint = selected.find((s) => s.isCurrent) ?? selected[selected.length - 1] ?? null;

  return { sprints, currentSprint };
}

/**
 * Select exactly 5 sprints for the rolling window: current + 4 prior.
 * Compatible with existing callers.
 *
 * @param iterations - All team iterations (with dates; isCurrent preferred when available)
 * @returns Selected 5 sprints (current + 4 prior), sorted by startDate descending
 */
export function selectRollingFiveSprints(iterations: AdoIterationInput[]): AdoIterationInput[] {
  const { sprints } = selectRollingSprints(iterations, 5);
  return sprints;
}

/**
 * Upsert Sprint records by ADO iteration path.
 * Uses iteration path as canonical key; updates name and dates when path matches.
 * Handles seed naming mismatch: match by path, update name from ADO.
 *
 * @param iterations - Selected iterations (e.g. from selectRollingFiveSprints)
 * @param currentPath - Path of the current sprint (for metadata)
 * @param db - Optional Prisma client (defaults to app prisma)
 * @returns Counts and sprint ID map
 */
export async function upsertSprintsFromIterations(
  iterations: AdoIterationInput[],
  currentPath: string | null,
  db?: PrismaClient
): Promise<SprintUpsertResult> {
  const client = db ?? prisma;
  const sprintIds = new Map<string, string>();
  let created = 0;
  let updated = 0;

  for (const it of iterations) {
    if (!it.path || !it.startDate || !it.finishDate) {
      continue;
    }

    const existing = await client.sprint.findUnique({
      where: { adoIterationPath: it.path },
    });

    if (existing) {
      await client.sprint.update({
        where: { id: existing.id },
        data: {
          name: it.name,
          startDate: it.startDate,
          endDate: it.finishDate,
        },
      });
      sprintIds.set(it.path, existing.id);
      updated++;
    } else {
      const sprint = await client.sprint.create({
        data: {
          name: it.name,
          adoIterationPath: it.path,
          startDate: it.startDate,
          endDate: it.finishDate,
        },
      });
      sprintIds.set(it.path, sprint.id);
      created++;
    }
  }

  const currentSprintId = currentPath ? (sprintIds.get(currentPath) ?? null) : null;

  return {
    created,
    updated,
    sprintIds,
    currentSprintId: currentSprintId ?? null,
    currentSprintPath: currentPath,
  };
}

/** Config for syncIterations. */
export interface SyncIterationsConfig {
  projectNameOrId: string;
  iterationTeamId: string;
  lookbackSprintCount?: number;
}

/** Result of syncIterations. */
export interface SyncIterationsResult {
  sprintIds: Map<string, string>;
  currentSprintId: string | null;
  currentSprintPath: string | null;
  sprintsSynced: number;
  created: number;
  updated: number;
}

/**
 * Top-level iteration sync: fetch team iterations, select rolling N, upsert sprints.
 *
 * @param db - Prisma client
 * @param config - Optional config (defaults to SYNC_CONFIG)
 * @param fetcher - Optional fetcher (defaults to fetchTeamIterations from ado-client)
 */
export async function syncIterations(
  db: PrismaClient,
  config?: SyncIterationsConfig,
  fetcher?: (project: string, team: string) => Promise<AdoIterationInput[]>
): Promise<SyncIterationsResult> {
  const { SYNC_CONFIG } = await import('./config');
  const { fetchTeamIterations } = await import('./ado-client');

  const cfg = config ?? SYNC_CONFIG;
  const fetchFn = fetcher ?? fetchTeamIterations;
  const count = cfg.lookbackSprintCount ?? 5;

  const allIterations = await fetchFn(cfg.projectNameOrId, cfg.iterationTeamId);
  const { sprints, currentSprint } = selectRollingSprints(allIterations, count);

  if (sprints.length === 0) {
    return {
      sprintIds: new Map(),
      currentSprintId: null,
      currentSprintPath: null,
      sprintsSynced: 0,
      created: 0,
      updated: 0,
    };
  }

  const currentPath = currentSprint?.path ?? null;
  const upsertResult = await upsertSprintsFromIterations(sprints, currentPath, db);

  return {
    sprintIds: upsertResult.sprintIds,
    currentSprintId: upsertResult.currentSprintId,
    currentSprintPath: upsertResult.currentSprintPath,
    sprintsSynced: upsertResult.created + upsertResult.updated,
    created: upsertResult.created,
    updated: upsertResult.updated,
  };
}
