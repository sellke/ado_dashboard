# Technical Spec: Accurate Current Sprint

> **Spec:** `.writ/specs/2026-06-22-accurate-current-sprint/spec.md`
> **Stories:** 1–5 in `user-stories/`

## Architecture

```
ADO sync (ado-client)
    │ isCurrent from timeFrame
    ▼
selectRollingSprints + upsertSprintsFromIterations
    │ resolveCurrentSprint(iterations, now)
    │ persist isCurrent on Sprint rows
    ▼
PostgreSQL Sprint { id, startDate, endDate, isCurrent }
    │
    ├── /api/metrics ──► resolveCurrentSprint(dbSprints, now)
    ├── /api/sprints/stories ──► per-list isCurrent via resolver
    └── snapshot.ts ──► isCurrentSprint via resolver
```

## Schema Change

```prisma
model Sprint {
  // ... existing fields
  isCurrent Boolean @default(false)
}
```

**Migration:** `pnpm prisma migrate dev --name add-sprint-is-current`

**Backfill:** No script — next sync sets flags from ADO.

## Resolver API

**Module:** `lib/sprint/resolve-current.ts`

```typescript
export interface SprintCurrentInput {
  id?: string;
  startDate: Date;
  endDate: Date;
  isCurrent?: boolean;
}

export function isSprintActiveByDate(sprint: SprintCurrentInput, now?: Date): boolean;
export function isAdoCurrentFlagValid(sprint: SprintCurrentInput, now?: Date): boolean;
export function resolveCurrentSprint<T extends SprintCurrentInput>(
  sprints: T[],
  now?: Date
): T | null;
export function resolveCurrentSprintId<T extends SprintCurrentInput & { id: string }>(
  sprints: T[],
  now?: Date
): string | null;
```

### Resolution Algorithm

```
Input: sprints[], now (default new Date())
Filter: candidates = sprints where startDate <= now

1. flagged = candidates where isCurrent===true AND endDate>=now AND startDate<=now
   if flagged.length === 1 → return flagged[0]
   if flagged.length > 1 → return max(startDate) among flagged

2. inRange = candidates where startDate <= now <= endDate
   if inRange.length >= 1 → prefer isCurrent===true, else max(startDate)

3. if candidates.length >= 1 → return max(startDate) among candidates (most recent past)

4. return null
```

Note: Step 1 rejects stale flags (`endDate < now`) before step 2.

## Sync Changes

### `upsertSprintsFromIterations`

Before loop:

```typescript
const currentIteration = resolveCurrentSprint(iterations, new Date());
const currentPathResolved = currentIteration?.path ?? null;
```

Per iteration upsert:

```typescript
data: {
  name, startDate, endDate,
  isCurrent: it.path === currentPathResolved,
}
```

Use `currentPathResolved` (not separate `currentPath` param) for `currentSprintId` lookup — or keep param but assert it matches resolver output.

### `selectRollingSprints`

Replace lines 61–67 and 75 with:

```typescript
const current = resolveCurrentSprint(sorted, now);
const currentIdx = current ? sorted.indexOf(current) : sorted.length - 1;
// ...
return { sprints, currentSprint: current };
```

## API Changes

### `/api/metrics` (Story 3)

**Default sprintId (when param absent):**

```typescript
const pastSprints = await prisma.sprint.findMany({
  where: { startDate: { lte: now } },
  orderBy: { startDate: 'asc' },
  select: { id: true, startDate: true, endDate: true, isCurrent: true },
});
const current = resolveCurrentSprint(pastSprints, now);
sprintId = current?.id ?? (await fallbackLatestSnapshot())?.sprintId;
```

**isCurrentSprint for loaded sprint:**

```typescript
const isCurrentSprint = resolveCurrentSprint(rollingSprints, now)?.id === sprint.id;
```

**rollingWindow.currentSprintId:** same resolver over `rollingSprints`.

Add `isCurrent` to sprint selects where resolver needs it.

### `/api/sprints/stories` (Story 3)

```typescript
const currentId = resolveCurrentSprintId(sprints, now);
// map: isCurrent: sprint.id === currentId
```

## Snapshot (Story 4)

```typescript
const isCurrentSprint =
  resolveCurrentSprint([{ ...sprint, isCurrent: sprint.isCurrent }], now)?.id === sprint.id;
```

Requires `isCurrent` in sprint select in `computeWorkstreamMetrics`.

## Error & Rescue Map

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| Prisma migration | DB unavailable | Standard deploy failure; no app code change until migrated | CI migration step |
| Sync upsert isCurrent | DB write error | Existing orchestrator error handling; sprint row partial update rolled back per transaction if wrapped | Mock DB throw in upsert test |
| resolveCurrentSprint | Empty input | Return `null` | Unit test |
| Metrics default sprint | No sprints in DB | Return empty payload (existing) | API test |
| Metrics default sprint | Resolver null, snapshots exist | Fall back to latest snapshot | API test |
| Stale isCurrent in DB | endDate passed | Resolver ignores flag; falls back | Unit test |

## Shadow Paths

| Flow | Happy Path | Nil Input | Empty Input | Upstream Error |
|---|---|---|---|---|
| Resolver | Valid flag → that sprint | `[]` → null | all future excluded → past or null | N/A (pure fn) |
| Sync persist | isCurrent set on winner | no iterations → no upsert | no dates → skip rows | ADO fetch throws → orchestrator catch |
| Metrics default load | resolver current sprint | no sprints → empty JSON | no current → snapshot fallback | DB error → 500 |
| Stories isCurrent flag | one sprint marked current | no sprints → `[]` | gap → most recent past marked | DB error → 500 |

## Interaction Edge Cases

| Edge Case | Planned Handling |
|---|---|
| Multiple ADO isCurrent flags | Resolver picks max `startDate` among valid flagged |
| Overlapping date ranges | Prefer flagged; else max `startDate` |
| Sprint gap (weekend) | Most recent past sprint is current |
| Stale flag after sprint end | Flag ignored; date or past fallback |
| User passes explicit sprintId | Honor param; compute `isCurrentSprint` via resolver comparison |
| Pre-migration rows (isCurrent=false) | Date-range and past fallback until next sync |

## Traceability

| Story | Primary modules |
|---|---|
| 1 | `prisma/schema.prisma`, `lib/sprint/resolve-current.ts` |
| 2 | `lib/sync/iterations.ts` |
| 3 | `app/api/metrics/route.ts`, `app/api/sprints/stories/route.ts` |
| 4 | `lib/metrics/snapshot.ts`, `lib/metrics/orchestrator.ts` |
| 5 | `__tests__/lib/sprint/*`, API + dashboard tests |
