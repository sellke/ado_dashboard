# Metric Calculation Engine Specification

> Created: 2026-02-11
> Status: Planning
> Contract Locked: ?

## Contract Summary

**Deliverable:** Server-side metric calculation engine that computes Velocity, Overhead%, Predictability, and Carry-Over from raw WorkItem data, persists results in a new MetricSnapshot table after each ADO sync, assigns RAG status via ThresholdConfig, and exposes per-workstream + program-level metrics through API routes.

**Must Include:**
- 4 core metrics computed per-workstream per-sprint from raw WorkItem records
- Rolling averages across prior 4 sprints (current sprint excluded per ADO sync contract)
- Program-level weighted aggregation (by story points)
- MetricSnapshot persistence triggered automatically after each sync
- RAG color assignment from existing ThresholdConfig thresholds
- Dedicated API routes for dashboard consumption

**Hardest Constraint:** Overhead% mixes data sources (WorkItem hours for bugs/spikes/support + SprintWorkstream ceremonyHours/grossHours) with fallback logic, and carry-over requires item-level incomplete detection which depends on accurate sprint assignment from the sync layer.

**Success Criteria:**
- Metrics validated against at least 1 known historical sprint
- RAG colors match expected green/amber/red for known data
- API returns all 4 metrics per workstream + program aggregate + rolling averages
- MetricSnapshot table populated automatically after sync completes

**Scope Boundaries:**
- **Included:** Velocity, Overhead%, Predictability, Carry-over; RAG assignment; rolling averages; MetricSnapshot table + migration; API routes (`GET /api/metrics`)
- **Excluded:** Advanced metrics (aging WIP, scope creep index ? Phase 2), trend chart visualization, forecasting, dashboard UI

---

## Detailed Requirements

### Metric Definitions

#### 1. Velocity (Story Points Completed)

**Formula:** `velocity = SUM(storyPoints) WHERE workItem.sprintId = S AND workItem.workstreamId = W AND workItem.state IN ('Closed', 'Done', 'Resolved')`

- **Source:** Raw `WorkItem` records
- **Done-like states:** Closed, Done, Resolved
- **Null storyPoints:** Items with `storyPoints = null` are excluded from the sum (they contribute 0)
- **Granularity:** Per-workstream per-sprint
- **Rolling average:** Mean velocity of prior 4 completed sprints (current sprint excluded)

#### 2. Overhead% (Non-Feature Work Ratio)

**Formula:** `overheadPercent = ((ceremonyHours + bugHours + spikeHours + supportHours) / grossHours) � 100`

**Data sources:**
- `ceremonyHours` ? `SprintWorkstream.ceremonyHours` for the given sprint+workstream
- `bugHours` ? `SUM(completedWork ?? originalEstimate ?? 0)` from WorkItems WHERE `type = Bug`
- `spikeHours` ? `SUM(storyPoints � 1.0)` from WorkItems WHERE `type = Spike` (1 SP = 1 hour conversion)
- `supportHours` ? `SUM(completedWork ?? originalEstimate ?? 0)` from WorkItems WHERE `type = Support`
- `grossHours` ? `SprintWorkstream.grossHours` for the given sprint+workstream

**Edge cases:**
- If `grossHours` is null or 0: return `null` (cannot compute)
- If `ceremonyHours` is null: treat as 0
- Fallback chain for Bug/Support hours: `completedWork` ? `originalEstimate` ? `0`

#### 3. Predictability (Sprint Commitment Accuracy)

**Formula:** `predictability = (completedPoints / plannedPoints) � 100`

**Data sources:**
- `plannedPoints` ? `SUM(storyPoints)` of all WorkItems assigned to sprint+workstream at sprint start (approximated as all items with `sprintId = S` and `workstreamId = W`)
- `completedPoints` ? Same as velocity: `SUM(storyPoints)` of Done-like items in sprint+workstream

**Edge cases:**
- If `plannedPoints` is 0 or null: return `null` (no commitment to measure against)
- Values can exceed 100% if team pulls in additional work and completes it

#### 4. Carry-Over Rate (Incomplete Work Ratio)

**Formula:** `carryOverRate = (carryOverPoints / plannedPoints) � 100`

**Detection:** Item-level ? WorkItems with `sprintId = S` AND `workstreamId = W` AND `state NOT IN ('Closed', 'Done', 'Resolved')`

**Data tracked:**
- `carryOverItems` ? COUNT of incomplete WorkItems
- `carryOverPoints` ? `SUM(storyPoints)` of incomplete WorkItems
- `plannedPoints` ? Total SP assigned to sprint+workstream

**Edge cases:**
- If `plannedPoints` is 0 or null: return `null`
- Items with null `storyPoints` contribute to item count but not to points

### RAG Color Assignment

Each metric is evaluated against `ThresholdConfig` records:

| Metric | ThresholdConfig.metricName | Green (Healthy) | Amber (Warning) | Red (At Risk) |
|---|---|---|---|---|
| Predictability | `sprintPredictability` | 80?100% | 60?79.99% | < 60% |
| Carry-Over | `carryOverRate` | 0?10% | 10.01?25% | 25.01?100% |
| Overhead% | `overheadPercent` | 0?30% | 30.01?45% | 45.01?100% |
| Velocity | N/A (trend-based) | See note | See note | See note |

**Velocity RAG:** Velocity doesn't have absolute thresholds ? its RAG is based on trend:
- **Green:** Current sprint velocity ? rolling average
- **Amber:** Current velocity is 70?99% of rolling average
- **Red:** Current velocity < 70% of rolling average
- If no rolling average available (< 2 prior sprints): RAG = null

**Lookup:** `ThresholdConfig.findUnique({ where: { metricName } })` ? compare metric value against green/amber/red ranges.

### Rolling Averages

- **Window:** 4 prior completed sprints (current sprint excluded)
- **Calculation:** Arithmetic mean of per-workstream metric values across the window
- **Minimum data:** At least 1 prior sprint with non-null metric to produce a rolling average; otherwise null
- **Storage:** Persisted in MetricSnapshot alongside individual sprint values

### Program-Level Aggregation

- **Strategy:** Weighted average by total story points per workstream
- **Formula:** `programMetric = SUM(workstreamMetric � workstreamTotalSP) / SUM(workstreamTotalSP)`
- **Edge case:** If total SP across all workstreams = 0, return null
- **Storage:** Computed on-the-fly from per-workstream MetricSnapshot records (no separate storage needed ? avoids nullable workstreamId complexity)

---

## MetricSnapshot Data Model

New Prisma model to persist computed metrics:

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

---

## API Design

### `GET /api/metrics`

**Query parameters:**
- `sprintId` (optional) ? specific sprint; defaults to most recent completed sprint
- `workstreamId` (optional) ? specific workstream; omit for all workstreams + program aggregate
- `includeRolling` (optional, default `true`) ? include rolling averages
- `includeProgram` (optional, default `true`) ? include program-level aggregate

**Response shape:**
```json
{
  "sprint": { "id": "...", "name": "Sprint 26.20" },
  "workstreams": [
    {
      "workstreamId": "...",
      "workstreamName": "Streams",
      "metrics": {
        "velocity": { "value": 34, "avg": 31.5, "rag": "Green" },
        "overheadPercent": { "value": 28.5, "avg": 26.2, "rag": "Green" },
        "predictability": { "value": 85.0, "avg": 82.0, "rag": "Green" },
        "carryOverRate": { "value": 8.5, "avg": 11.0, "rag": "Green" }
      },
      "detail": {
        "plannedPoints": 40,
        "completedPoints": 34,
        "carryOverItems": 3,
        "carryOverPoints": 6,
        "overheadHours": 22.8,
        "grossHours": 80.0
      }
    }
  ],
  "program": {
    "metrics": {
      "velocity": { "value": 128, "avg": 120.5, "rag": "Green" },
      "overheadPercent": { "value": 31.2, "avg": 29.0, "rag": "Amber" },
      "predictability": { "value": 82.0, "avg": 80.5, "rag": "Green" },
      "carryOverRate": { "value": 12.0, "avg": 13.5, "rag": "Amber" }
    }
  },
  "computedAt": "2026-02-11T18:30:00Z"
}
```

### `POST /api/metrics/compute`

Manually trigger metric computation for a specific sprint (or auto-triggered after sync).

**Body:** `{ "sprintId": "..." }` (optional ? defaults to current sprint)
**Response:** `{ "success": true, "snapshotsCreated": 4, "sprintId": "..." }`

---

## Implementation Approach

### File Structure

```
lib/metrics/
  calculators.ts     ? Pure functions: velocity, overhead%, predictability, carry-over
  rag.ts             ? ThresholdConfig lookup + RAG assignment
  rolling.ts         ? Rolling average computation across sprint window
  aggregator.ts      ? Program-level weighted aggregation
  snapshot.ts        ? MetricSnapshot persistence (upsert after computation)
  orchestrator.ts    ? Coordinates full metric computation pipeline
  types.ts           ? TypeScript interfaces for metric results
app/api/metrics/
  route.ts           ? GET handler (read snapshots)
  compute/
    route.ts         ? POST handler (trigger computation)
```

### Computation Flow

1. **Trigger:** Sync orchestrator completes ? calls `computeMetrics(sprintId)`
2. **For each workstream:**
   a. Query WorkItems for sprint+workstream
   b. Compute velocity, overhead%, predictability, carry-over
   c. Fetch prior 4 sprint snapshots ? compute rolling averages
   d. Look up ThresholdConfig ? assign RAG colors
   e. Upsert MetricSnapshot record
3. **Return:** Summary of snapshots created/updated

### Integration with Sync

The metric computation hooks into the sync orchestrator's completion:
- After `SyncLog` is marked `Success`, call `computeMetrics()` for the synced sprint window
- If sync partially fails (some workstreams OK), compute metrics only for successful workstreams
- Metric computation errors do NOT fail the sync ? they are logged separately

---

## Dependencies

- **ADO Data Sync** (spec: `2026-02-11-ado-data-sync`) ? Must be complete. WorkItems and SprintWorkstream records must be populated.
- **Database Schema** (spec: `2026-02-08-database-schema`) ? Existing Prisma models used as data source.
- **ThresholdConfig seed data** ? Already seeded with RAG thresholds for `sprintPredictability`, `carryOverRate`, `overheadPercent`.

## Risks

1. **Overhead% accuracy:** Spike SP?hours conversion at 1:1 may not match reality; teams could adjust the ratio later
2. **Carry-over timing:** Metrics are computed post-sync; if items change state between sync and computation, results may drift
3. **Missing capacity data:** If `grossHours` isn't populated from capacity sync, overhead% returns null ? dashboard must handle this gracefully
4. **Velocity RAG:** Trend-based RAG (vs. rolling average) requires at least 2 historical sprints ? early sprints will have no RAG
