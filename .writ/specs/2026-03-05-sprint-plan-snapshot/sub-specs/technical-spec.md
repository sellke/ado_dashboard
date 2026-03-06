# Technical Specification: Sprint Plan Snapshot

> Sub-spec for [Sprint Plan Snapshot](../spec.md)

## Database Schema

### New Model: SprintPlanSnapshot

```prisma
model SprintPlanSnapshot {
  id           String   @id @default(cuid())
  sprintId     String
  workstreamId String
  adoId        Int
  storyPoints  Float?
  state        String
  type         String
  capturedAt   DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  sprint     Sprint     @relation(fields: [sprintId], references: [id], onDelete: Cascade)
  workstream Workstream @relation(fields: [workstreamId], references: [id], onDelete: Cascade)

  @@unique([sprintId, workstreamId, adoId])
  @@index([sprintId, workstreamId])
  @@map("sprint_plan_snapshots")
}
```

**Relationships:**
- Add `planSnapshots SprintPlanSnapshot[]` to the `Sprint` model
- Add `planSnapshots SprintPlanSnapshot[]` to the `Workstream` model

**Key decisions:**
- `adoId` is NOT globally unique (unlike `WorkItem.adoId`) — the same item can appear across multiple sprint snapshots
- `@@unique([sprintId, workstreamId, adoId])` enables idempotent upserts
- `@@index([sprintId, workstreamId])` supports the primary query pattern
- Cascade deletes match existing patterns (`MetricSnapshot`, `SprintWorkstream`)

## Snapshot Capture Logic

### Location: `lib/metrics/snapshot.ts` → `computeWorkstreamMetrics()`

Insert after the work items fetch (line ~69), gated by `isCurrentSprint`:

```typescript
// After: const workItems = await db.workItem.findMany({ where: { sprintId, workstreamId } });
// After: const isCurrentSprint = sprint.startDate <= now && sprint.endDate >= now;

if (isCurrentSprint) {
  try {
    const capturedAt = new Date();
    const snapshotData = workItems.map(wi => ({
      sprintId,
      workstreamId,
      adoId: wi.adoId,
      storyPoints: wi.storyPoints,
      state: wi.state,
      type: wi.type,
      capturedAt,
    }));

    await db.$transaction(async (tx) => {
      // Upsert each item
      for (const item of snapshotData) {
        await tx.sprintPlanSnapshot.upsert({
          where: {
            sprintId_workstreamId_adoId: {
              sprintId: item.sprintId,
              workstreamId: item.workstreamId,
              adoId: item.adoId,
            },
          },
          create: item,
          update: {
            storyPoints: item.storyPoints,
            state: item.state,
            type: item.type,
            capturedAt: item.capturedAt,
          },
        });
      }

      // Remove stale rows (items no longer in the sprint)
      const currentAdoIds = workItems.map(wi => wi.adoId);
      if (currentAdoIds.length > 0) {
        await tx.sprintPlanSnapshot.deleteMany({
          where: {
            sprintId,
            workstreamId,
            adoId: { notIn: currentAdoIds },
          },
        });
      } else {
        // Sprint has no items — clear all snapshot rows
        await tx.sprintPlanSnapshot.deleteMany({
          where: { sprintId, workstreamId },
        });
      }
    });
  } catch {
    // Non-fatal: snapshot failure must not block metric computation
  }
}
```

### Performance

- Transaction wraps all writes for consistency
- Typical workstream: 10-40 items → 10-40 upserts per sync cycle
- `deleteMany` with `notIn` handles stale cleanup in one query
- Total: ~50ms per workstream (negligible vs. ADO API calls)

## Carry-Over Calculation Changes

### Location: `lib/metrics/snapshot.ts` → `computeWorkstreamMetrics()`

For completed sprints, query `SprintPlanSnapshot` and use it as the data source:

```typescript
// Before calculating carry-over, choose data source
let carryOverInput: WorkItemInput[];

if (!isCurrentSprint) {
  // Completed sprint: use snapshot if available
  const snapshots = await db.sprintPlanSnapshot.findMany({
    where: { sprintId, workstreamId },
  });

  if (snapshots.length > 0) {
    carryOverInput = snapshots.map(s => ({
      type: s.type,
      state: s.state,
      storyPoints: s.storyPoints,
      originalEstimate: null,
      completedWork: null,
    }));
  } else {
    // Fallback: no snapshot data (pre-feature sprint)
    carryOverInput = wiInputs;
  }
} else {
  carryOverInput = wiInputs;
}

const carryOverResult = calculateCarryOver(carryOverInput);
```

**The `calculateCarryOver()` function itself doesn't change.** It already accepts `WorkItemInput[]` and computes correctly. The change is only in what data gets passed.

## API Route Changes

### Location: `app/api/metrics/route.ts`

**Prior detail path (completed sprint detail):**

Replace the current `priorDetailMap` approach with snapshot-based data:

```typescript
if (isCurrentSprint && priorSprint) {
  // Query snapshots for prior sprint
  const priorSnapshots = await prisma.sprintPlanSnapshot.findMany({
    where: {
      sprintId: priorSprint.id,
      workstreamId: { in: allowedWsIds },
    },
  });

  // Group by workstream and compute carry-over
  for (const wsId of allowedWsIds) {
    const wsSnaps = priorSnapshots.filter(s => s.workstreamId === wsId);
    if (wsSnaps.length === 0) continue; // fallback to MetricSnapshot

    const plannedPoints = wsSnaps.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0);
    const completedPoints = wsSnaps
      .filter(s => DONE_STATES.includes(s.state))
      .reduce((sum, s) => sum + (s.storyPoints ?? 0), 0);
    const carryOverPoints = plannedPoints - completedPoints;
    const carryOverRate = plannedPoints > 0 ? (carryOverPoints / plannedPoints) * 100 : null;

    priorDetailMap.set(wsId, {
      plannedPoints,
      completedPoints,
      carryOverPoints,
      carryOverRate,
      // ... other fields from MetricSnapshot as needed
    });
  }
}
```

**Response shape change:**

Remove `carryOverItems` from the detail object:

```typescript
// Before:
detail: {
  plannedPoints, completedPoints, carryOverItems, carryOverPoints, overheadHours, grossHours
}

// After:
detail: {
  plannedPoints, completedPoints, carryOverPoints, overheadHours, grossHours
}
```

## Type Changes

### `lib/dashboard/types.ts`

Remove `carryOverItems` from:
- `ApiWorkstream.detail`
- `WorkstreamCardViewModel.detail`

### `lib/metrics/types.ts`

Add snapshot input type:

```typescript
export interface SprintPlanSnapshotInput {
  storyPoints: number | null;
  state: string;
  type: string;
}
```

## Backward Compatibility

- Sprints computed before this feature have no `SprintPlanSnapshot` rows
- Fallback: when no snapshot exists, use existing `MetricSnapshot` values (current behavior)
- The `carryOverItems` column remains in the `MetricSnapshot` table — not dropped, just unused in the API/UI
- The first sync after deployment creates snapshots for the current sprint only — historical sprints are unaffected

## Testing Strategy

| Layer | What to Test | Story |
|-------|-------------|-------|
| Unit | `calculateCarryOver` with snapshot-derived inputs | 3 |
| Unit | Snapshot capture writes correct data | 2 |
| Unit | Stale row cleanup works | 2 |
| Integration | API returns snapshot-based carry-over for completed sprints | 3 |
| Integration | Fallback when no snapshot exists | 3 |
| Component | Card detail renders without carry-over items | 4 |
