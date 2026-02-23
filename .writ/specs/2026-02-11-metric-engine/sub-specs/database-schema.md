# Metric Engine — Database Schema

> Created: 2026-02-11

## New Model: MetricSnapshot

```prisma
model MetricSnapshot {
  id                  String   @id @default(cuid())
  sprintId            String
  workstreamId        String

  // Core metrics (nullable = could not compute)
  velocity            Float?
  overheadPercent     Float?
  predictability      Float?
  carryOverRate       Float?

  // Carry-over detail
  carryOverItems      Int?
  carryOverPoints     Float?

  // Planning data (for audit / recalculation)
  plannedPoints       Float?
  completedPoints     Float?
  overheadHours       Float?
  grossHours          Float?

  // Rolling averages (4-sprint window)
  velocityAvg         Float?
  overheadPercentAvg  Float?
  predictabilityAvg   Float?
  carryOverRateAvg    Float?

  // RAG status
  velocityRag         String?
  overheadRag         String?
  predictabilityRag   String?
  carryOverRag        String?

  // Meta
  computedAt          DateTime @default(now())
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Relations
  sprint     Sprint     @relation(fields: [sprintId], references: [id], onDelete: Cascade)
  workstream Workstream @relation(fields: [workstreamId], references: [id], onDelete: Cascade)

  @@unique([sprintId, workstreamId])
  @@index([sprintId])
  @@map("metric_snapshots")
}
```

## Schema Changes Required

### 1. Add MetricSnapshot model (above)

### 2. Add relations to existing models

**Sprint model** — add:
```prisma
metricSnapshots MetricSnapshot[]
```

**Workstream model** — add:
```prisma
metricSnapshots MetricSnapshot[]
```

## Field Design Rationale

| Field | Type | Why |
|---|---|---|
| velocity | Float? | Null if no items or all items have null SP |
| overheadPercent | Float? | Null if grossHours missing |
| predictability | Float? | Null if plannedPoints is 0 |
| carryOverRate | Float? | Null if plannedPoints is 0 |
| carryOverItems/Points | Int?/Float? | Absolute count + SP of incomplete work |
| plannedPoints/completedPoints | Float? | Audit trail for predictability calculation |
| overheadHours/grossHours | Float? | Audit trail for overhead calculation |
| *Avg fields | Float? | Null if insufficient history |
| *Rag fields | String? | Null if metric is null or thresholds missing |
| computedAt | DateTime | When this snapshot was last computed |

## Migration Strategy

- Migration name: `add_metric_snapshot_model`
- No data migration needed (new table)
- Existing tables unchanged (only relation fields added to Sprint/Workstream)

## Indexes

- `@@unique([sprintId, workstreamId])` — One snapshot per sprint per workstream
- `@@index([sprintId])` — Fast lookup of all workstream metrics for a sprint

## Data Lifecycle

- **Created:** After sync completion (per workstream per sprint)
- **Updated:** Re-computed if sync runs again for the same sprint
- **Deleted:** Cascade when Sprint or Workstream is deleted
