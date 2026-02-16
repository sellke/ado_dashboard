# Database Schema Specification

**Created:** 2026-02-08  
**Status:** Completed ✅  
**Version:** 1.0

## Overview

This specification defines the complete database schema for the LiveLink Health Report application. The schema is implemented using Prisma 6 ORM with PostgreSQL 16 as the underlying database.

### Purpose

The schema replaces boilerplate User/Post models with 10 domain-specific models that support:
- Workstream and sprint management
- Azure DevOps (ADO) work item synchronization
- Capacity planning and tracking
- Milestone tracking
- Health metric calculations
- Ceremony transcript processing and insight extraction (Phase 2)

### Scope

This specification includes:
- Complete Prisma schema definition with all models, enums, fields, relations, indexes, and table mappings
- Entity-relationship diagram
- Index strategy and rationale
- Seed data specifications
- Migration planning notes
- Metric calculation query references

---

## Entity-Relationship Diagram

```
┌─────────────────┐
│   Workstream    │
│─────────────────│
│ id (CUID)       │
│ name            │
│ adoAreaPath     │
│ timestamps      │
└────────┬────────┘
         │
         │ 1:N
         │
    ┌────┴──────────────────────────────────────────────┐
    │                                                    │
    │ 1:N                                               │ 1:N
    │                                                    │
┌───▼──────────────┐                          ┌────────▼──────────┐
│ SprintWorkstream │                          │    WorkItem       │
│──────────────────│                          │───────────────────│
│ id (CUID)        │                          │ id (CUID)         │
│ sprintId ────────┼──┐                       │ adoId (unique)    │
│ workstreamId ────┼──┼──┐                    │ type (enum)       │
│ plannedPoints    │  │  │                    │ title             │
│ completedPoints  │  │  │                    │ state             │
│ grossHours       │  │  │                    │ storyPoints       │
│ ptoHours         │  │  │                    │ workstreamId ────┼──┐
│ ceremonyHours    │  │  │                    │ sprintId ─────────┼──┼──┐
│ fteCount         │  │  │                    │ timestamps        │  │  │
│ capacityLocked   │  │  │                    └───────────────────┘  │  │
│ notes            │  │  │                                            │  │
│ timestamps       │  │  │                                            │  │
│ @@unique(sprint, │  │  │                                            │  │
│         workstream)│  │  │                                            │  │
└──────────────────┘  │  │                                            │  │
                      │  │                                            │  │
                      │  │                                            │  │
┌─────────────────────┘  │                                            │  │
│                        │                                            │  │
│  N:1                   │                                            │  │
│                        │                                            │  │
┌────────▼──────────┐    │                                            │  │
│     Sprint        │    │                                            │  │
│───────────────────│    │                                            │  │
│ id (CUID)         │    │                                            │  │
│ name              │    │                                            │  │
│ adoIterationPath  │    │                                            │  │
│ startDate         │    │                                            │  │
│ endDate           │    │                                            │  │
│ timestamps        │    │                                            │  │
└───────────────────┘    │                                            │  │
                         │                                            │  │
                         │ 1:N                                         │  │
                         │                                            │  │
                    ┌────┴────────────────────────────────────────────┘  │
                    │                                                    │
                    │ 1:N                                                │
                    │                                                    │
               ┌────▼────────────┐                                       │
               │   Transcript    │                                       │
               │─────────────────│                                       │
               │ id (CUID)       │                                       │
               │ fileName        │                                       │
               │ ceremonyType    │                                       │
               │ ceremonyDate    │                                       │
               │ sprintId ───────┼──┐                                    │
               │ workstreamId ───┼──┼──┐                                 │
               │ rawContent      │  │  │                                 │
               │ processedAt     │  │  │                                 │
               │ timestamps      │  │  │                                 │
               └─────────────────┘  │  │                                 │
                                    │  │                                 │
                                    │  │ 1:N                             │
                                    │  │                                 │
                               ┌────▼──▼─────────────┐                  │
                               │ CeremonyInsight     │                  │
                               │─────────────────────│                  │
                               │ id (CUID)           │                  │
                               │ transcriptId ───────┼──┐               │
                               │ insightType         │  │               │
                               │ severity            │  │               │
                               │ content             │  │               │
                               │ relatedWorkstreamId─┼──┼───────────────┘
                               │ createdAt           │  │
                               └─────────────────────┘  │
                                                        │
                                                        │ N:1
                                                        │
┌───────────────────────────────────────────────────────┘
│
│ 1:N
│
┌────────▼──────────────┐
│      Milestone        │
│───────────────────────│
│ id (CUID)             │
│ title                 │
│ adoFeatureId          │
│ workstreamId ─────────┼──┐
│ targetMonth           │  │
│ status (enum)         │  │
│ notes                 │  │
│ timestamps            │  │
└───────────────────────┘  │
                           │
                           │ N:1
                           │
                      ┌────┴──────────────┐
                      │                   │
                      │                   │
         ┌────────────▼────────────┐      │
         │   ThresholdConfig       │      │
         │─────────────────────────│      │
         │ id (CUID)               │      │
         │ metricName (unique)     │      │
         │ greenMin/Max            │      │
         │ amberMin/Max            │      │
         │ redMin/Max              │      │
         │ timestamps              │      │
         └─────────────────────────┘      │
                                          │
         ┌────────────────────────────────┘
         │
         │ (standalone)
         │
┌────────▼──────────┐
│    SyncLog        │
│───────────────────│
│ id (CUID)         │
│ syncType (enum)   │
│ status (enum)     │
│ itemsFetched      │
│ itemsCreated      │
│ itemsUpdated      │
│ errorMessage      │
│ startedAt         │
│ completedAt       │
│ createdAt         │
└───────────────────┘
```

---

## Complete Prisma Schema

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// ENUMS
// ============================================================================

enum WorkItemType {
  Epic
  Feature
  UserStory
  Task
  Bug
  Spike
  Support
}

enum MilestoneStatus {
  NotStarted
  InProgress
  Done
}

enum SyncStatus {
  Running
  Success
  Failed
}

enum SyncType {
  WorkItems
  Iterations
  Capacity
  Full
}

enum CeremonyType {
  Standup
  ScrumOfScrums
  SprintPlanning
  BacklogRefinement
}

enum InsightType {
  Risk
  Blocker
  Dependency
  Theme
  Sentiment
}

enum Severity {
  High
  Medium
  Low
}

// ============================================================================
// MODELS
// ============================================================================

model Workstream {
  id          String   @id @default(cuid())
  name        String
  adoAreaPath String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  sprintWorkstreams SprintWorkstream[]
  workItems         WorkItem[]
  milestones        Milestone[]
  transcripts       Transcript[]
  ceremonyInsights  CeremonyInsight[]

  @@map("workstreams")
}

model Sprint {
  id              String    @id @default(cuid())
  name            String
  adoIterationPath String?
  startDate       DateTime
  endDate         DateTime
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  sprintWorkstreams SprintWorkstream[]
  workItems         WorkItem[]
  transcripts       Transcript[]

  @@map("sprints")
}

model SprintWorkstream {
  id             String    @id @default(cuid())
  sprintId       String
  workstreamId   String
  plannedPoints  Float?
  completedPoints Float?
  grossHours     Float?
  ptoHours       Float?
  ceremonyHours  Float?
  fteCount       Int?
  capacityLocked Boolean   @default(false)
  notes          String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relations
  sprint     Sprint     @relation(fields: [sprintId], references: [id], onDelete: Cascade)
  workstream Workstream @relation(fields: [workstreamId], references: [id], onDelete: Cascade)

  @@unique([sprintId, workstreamId])
  @@map("sprint_workstreams")
}

model WorkItem {
  id              String        @id @default(cuid())
  adoId           Int           @unique
  adoRevision     Int?
  type            WorkItemType
  title           String
  state           String
  storyPoints     Float?
  originalEstimate Float?
  completedWork   Float?
  remainingWork   Float?
  areaPath        String
  iterationPath   String
  parentAdoId     Int?
  assignedTo      String?
  tags            String?
  adoCreatedDate  DateTime?
  adoChangedDate  DateTime?
  workstreamId    String?
  sprintId        String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  workstream Workstream? @relation(fields: [workstreamId], references: [id], onDelete: SetNull)
  sprint     Sprint?     @relation(fields: [sprintId], references: [id], onDelete: SetNull)

  @@index([workstreamId, sprintId])
  @@index([type])
  @@index([iterationPath])
  @@map("work_items")
}

model Milestone {
  id            String          @id @default(cuid())
  title         String
  adoFeatureId  Int?
  workstreamId  String
  targetMonth   DateTime
  status        MilestoneStatus @default(NotStarted)
  notes         String?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  // Relations
  workstream Workstream @relation(fields: [workstreamId], references: [id], onDelete: Cascade)

  @@index([workstreamId])
  @@map("milestones")
}

model ThresholdConfig {
  id         String   @id @default(cuid())
  metricName String   @unique
  greenMin   Float
  greenMax   Float
  amberMin   Float
  amberMax   Float
  redMin     Float?
  redMax     Float?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("threshold_configs")
}

model SyncLog {
  id            String     @id @default(cuid())
  syncType      SyncType
  status        SyncStatus
  itemsFetched  Int?
  itemsCreated  Int?
  itemsUpdated  Int?
  errorMessage  String?
  startedAt     DateTime   @default(now())
  completedAt   DateTime?
  createdAt     DateTime   @default(now())

  @@index([startedAt])
  @@map("sync_logs")
}

model Transcript {
  id            String        @id @default(cuid())
  fileName      String
  ceremonyType  CeremonyType
  ceremonyDate  DateTime
  sprintId      String
  workstreamId  String?
  rawContent    String
  processedAt   DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  // Relations
  sprint          Sprint           @relation(fields: [sprintId], references: [id], onDelete: Cascade)
  workstream      Workstream?      @relation(fields: [workstreamId], references: [id], onDelete: SetNull)
  ceremonyInsights CeremonyInsight[]

  @@map("transcripts")
}

model CeremonyInsight {
  id                  String      @id @default(cuid())
  transcriptId        String
  insightType         InsightType
  severity            Severity
  content             String
  relatedWorkstreamId String?
  createdAt           DateTime    @default(now())

  // Relations
  transcript        Transcript  @relation(fields: [transcriptId], references: [id], onDelete: Cascade)
  relatedWorkstream Workstream? @relation(fields: [relatedWorkstreamId], references: [id], onDelete: SetNull)

  @@map("ceremony_insights")
}
```

---

## Index Strategy

| Table | Index | Type | Columns | Rationale |
|-------|-------|------|---------|-----------|
| `work_items` | `work_items_workstreamId_sprintId_idx` | Composite | `workstreamId`, `sprintId` | Optimize queries filtering work items by workstream and sprint (most common query pattern) |
| `work_items` | `work_items_type_idx` | Single | `type` | Fast filtering by work item type (Epic, Feature, UserStory, etc.) |
| `work_items` | `work_items_iterationPath_idx` | Single | `iterationPath` | Support sprint-based queries using ADO iteration paths |
| `work_items` | `work_items_adoId_key` | Unique | `adoId` | Enforce uniqueness of ADO work item IDs (primary sync key) |
| `milestones` | `milestones_workstreamId_idx` | Single | `workstreamId` | Fast lookup of milestones by workstream |
| `sprint_workstreams` | `sprint_workstreams_sprintId_workstreamId_key` | Unique Composite | `sprintId`, `workstreamId` | Prevent duplicate sprint-workstream associations |
| `sync_logs` | `sync_logs_startedAt_idx` | Single | `startedAt` | Support time-based queries for sync history and recent syncs |
| `threshold_configs` | `threshold_configs_metricName_key` | Unique | `metricName` | Enforce one threshold config per metric |

### Index Rationale

- **Composite indexes** on `work_items(workstreamId, sprintId)` support the most common query pattern: "get all work items for a workstream in a specific sprint"
- **Unique constraint** on `work_items.adoId` ensures data integrity during ADO synchronization
- **Unique constraint** on `sprint_workstreams(sprintId, workstreamId)` prevents duplicate capacity entries
- **Time-based index** on `sync_logs.startedAt` enables efficient querying of sync history
- **Single-column indexes** on frequently filtered fields (`type`, `iterationPath`, `workstreamId`) optimize common WHERE clauses

---

## Seed Data Specification

### Workstreams

```typescript
const workstreams = [
  {
    name: "Streams",
    adoAreaPath: "Event Streaming Platform\\App\\LiveLink - Yellow Box\\Streams"
  },
  {
    name: "Pitch Tracker",
    adoAreaPath: "Event Streaming Platform\\App\\LiveLink - Yellow Box\\Pitch Tracker"
  },
  {
    name: "Action Tracker",
    adoAreaPath: "Event Streaming Platform\\App\\LiveLink - Yellow Box\\Action Tracker"
  },
  {
    name: "KPI Services + UCM",
    adoAreaPath: "Event Streaming Platform\\App\\LiveLink - Yellow Box\\KPI Services + UCM"
  }
];
```

### Threshold Configurations

```typescript
const thresholdConfigs = [
  {
    metricName: "sprintPredictability",
    greenMin: 0.85,
    greenMax: 1.0,
    amberMin: 0.70,
    amberMax: 0.85,
    redMin: 0.0,
    redMax: 0.70
  },
  {
    metricName: "velocityTrend",
    greenMin: 0.95,
    greenMax: 1.05,
    amberMin: 0.85,
    amberMax: 0.95,
    redMin: null,
    redMax: null
  },
  {
    metricName: "capacityUtilization",
    greenMin: 0.80,
    greenMax: 0.95,
    amberMin: 0.70,
    amberMax: 0.80,
    redMin: 0.95,
    redMax: 1.0
  },
  {
    metricName: "workItemAge",
    greenMin: 0.0,
    greenMax: 7.0,
    amberMin: 7.0,
    amberMax: 14.0,
    redMin: 14.0,
    redMax: null
  },
  {
    metricName: "blockerCount",
    greenMin: 0.0,
    greenMax: 0.0,
    amberMin: 1.0,
    amberMax: 2.0,
    redMin: 3.0,
    redMax: null
  }
];
```

### Initial Sprint (Example)

```typescript
const initialSprint = {
  name: "Sprint 1 Q4 FY26",
  adoIterationPath: "Event Streaming Platform\\App\\LiveLink - Yellow Box\\Q4 FY26\\Sprint 1",
  startDate: new Date("2026-01-06T00:00:00Z"),
  endDate: new Date("2026-01-19T23:59:59Z")
};
```

---

## Migration Notes

### Order of Operations

1. **Create enums first** (all 7 enums)
   - Enums must exist before models that reference them
   - Prisma will create PostgreSQL ENUM types

2. **Create standalone models** (no foreign keys)
   - `Workstream`
   - `Sprint`
   - `ThresholdConfig`
   - `SyncLog`

3. **Create junction/model with single FK**
   - `SprintWorkstream` (references `Sprint` and `Workstream`)
   - `WorkItem` (references `Workstream` and `Sprint`, nullable)
   - `Milestone` (references `Workstream`)

4. **Create Phase 2 models** (transcript processing)
   - `Transcript` (references `Sprint` and `Workstream`)
   - `CeremonyInsight` (references `Transcript` and `Workstream`)

### Rollback Considerations

- **Cascade deletes**: Deleting a `Sprint` or `Workstream` will cascade delete related `SprintWorkstream` records
- **SetNull deletes**: Deleting a `Workstream` or `Sprint` will set `workstreamId`/`sprintId` to NULL in `WorkItem` (preserves work item history)
- **Unique constraints**: `work_items.adoId` and `sprint_workstreams(sprintId, workstreamId)` prevent duplicates; migration will fail if duplicates exist
- **Index creation**: Indexes are created automatically by Prisma; dropping indexes requires explicit migration

### Data Migration from Boilerplate

If migrating from existing User/Post models:

1. **Backup existing data** (if any)
2. **Drop old models** in a separate migration
3. **Create new schema** in this migration
4. **Seed workstreams and thresholds** via seed script
5. **Sync initial data** from ADO via sync process

### PostgreSQL Considerations

- **CUID generation**: Uses `cuid()` function (Prisma handles this)
- **Snake_case tables**: All tables use `@@map()` to enforce snake_case naming
- **Timestamps**: `DateTime` fields map to PostgreSQL `TIMESTAMP` type
- **Nullable fields**: Use `?` suffix; maps to `NULL` in PostgreSQL
- **Enums**: Prisma creates PostgreSQL ENUM types; consider migration path if enum values change

---

## Metric Query Reference

### Sprint Predictability

**Definition**: Ratio of completed story points to planned story points for a sprint-workstream.

**Prisma Query**:
```typescript
const sprintWorkstream = await prisma.sprintWorkstream.findUnique({
  where: { sprintId_workstreamId: { sprintId, workstreamId } },
  select: { plannedPoints: true, completedPoints: true }
});

const predictability = sprintWorkstream.completedPoints / sprintWorkstream.plannedPoints;
```

**SQL Equivalent**:
```sql
SELECT 
  completed_points / NULLIF(planned_points, 0) AS predictability
FROM sprint_workstreams
WHERE sprint_id = $1 AND workstream_id = $2;
```

---

### Velocity Trend

**Definition**: Comparison of current sprint velocity to previous N sprints' average velocity.

**Prisma Query**:
```typescript
// Get current sprint completed points
const current = await prisma.sprintWorkstream.findUnique({
  where: { sprintId_workstreamId: { sprintId, workstreamId } },
  select: { completedPoints: true }
});

// Get previous N sprints (assuming sprint dates are sequential)
const previousSprints = await prisma.sprint.findMany({
  where: {
    endDate: { lt: currentSprint.startDate },
    sprintWorkstreams: { some: { workstreamId } }
  },
  orderBy: { endDate: 'desc' },
  take: N,
  include: {
    sprintWorkstreams: {
      where: { workstreamId },
      select: { completedPoints: true }
    }
  }
});

const avgPreviousVelocity = previousSprints
  .map(s => s.sprintWorkstreams[0]?.completedPoints ?? 0)
  .reduce((a, b) => a + b, 0) / previousSprints.length;

const trend = current.completedPoints / avgPreviousVelocity;
```

---

### Capacity Utilization

**Definition**: Ratio of gross hours (minus PTO and ceremony hours) to total available capacity.

**Prisma Query**:
```typescript
const sprintWorkstream = await prisma.sprintWorkstream.findUnique({
  where: { sprintId_workstreamId: { sprintId, workstreamId } },
  select: {
    grossHours: true,
    ptoHours: true,
    ceremonyHours: true,
    fteCount: true
  }
});

// Calculate available capacity (assuming 40 hours/week per FTE, 2-week sprint)
const sprintWeeks = 2;
const totalCapacity = sprintWorkstream.fteCount * 40 * sprintWeeks;
const utilizedCapacity = (sprintWorkstream.grossHours ?? 0) 
  - (sprintWorkstream.ptoHours ?? 0) 
  - (sprintWorkstream.ceremonyHours ?? 0);

const utilization = utilizedCapacity / totalCapacity;
```

---

### Work Item Age

**Definition**: Average age (in days) of work items in "Active" or "Resolved" state for a workstream.

**Prisma Query**:
```typescript
const workItems = await prisma.workItem.findMany({
  where: {
    workstreamId,
    state: { in: ['Active', 'Resolved'] },
    adoCreatedDate: { not: null }
  },
  select: { adoCreatedDate: true }
});

const now = new Date();
const ages = workItems
  .map(wi => (now.getTime() - wi.adoCreatedDate.getTime()) / (1000 * 60 * 60 * 24))
  .filter(age => age >= 0);

const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length;
```

---

### Blocker Count

**Definition**: Count of work items with "Blocker" tag or in "Blocked" state for a workstream.

**Prisma Query**:
```typescript
const blockerCount = await prisma.workItem.count({
  where: {
    workstreamId,
    OR: [
      { tags: { contains: 'Blocker' } },
      { state: 'Blocked' }
    ]
  }
});
```

---

### Milestone Progress

**Definition**: Percentage of milestones in "Done" status for a workstream.

**Prisma Query**:
```typescript
const totalMilestones = await prisma.milestone.count({
  where: { workstreamId }
});

const doneMilestones = await prisma.milestone.count({
  where: {
    workstreamId,
    status: 'Done'
  }
});

const progress = totalMilestones > 0 
  ? doneMilestones / totalMilestones 
  : 0;
```

---

### Ceremony Insight Severity Distribution (Phase 2)

**Definition**: Count of ceremony insights by severity for a workstream or sprint.

**Prisma Query**:
```typescript
const insights = await prisma.ceremonyInsight.groupBy({
  by: ['severity'],
  where: {
    relatedWorkstreamId: workstreamId, // or filter by transcript.sprintId
    insightType: { in: ['Risk', 'Blocker'] }
  },
  _count: { severity: true }
});

// Returns: [{ severity: 'High', _count: { severity: 5 } }, ...]
```

---

## Summary

This specification provides:

✅ **Complete Prisma schema** with all 10 models, 7 enums, fields, relations, indexes, and table mappings  
✅ **Entity-relationship diagram** showing all model relationships  
✅ **Index strategy** with rationale for each index  
✅ **Seed data specifications** for workstreams, thresholds, and initial sprint  
✅ **Migration notes** covering order of operations and rollback considerations  
✅ **Metric query reference** with Prisma and SQL examples for 7 health metrics

The schema is designed to support:
- Azure DevOps synchronization via ADO MCP
- Capacity planning and tracking
- Sprint and workstream management
- Health metric calculations
- Phase 2 ceremony transcript processing and insight extraction
