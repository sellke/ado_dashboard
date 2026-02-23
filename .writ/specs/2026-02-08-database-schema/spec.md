# Database Schema Specification

> Created: 2026-02-08
> Status: Completed ✅
> Contract Locked: ✅

## Contract Summary

**Deliverable:** A Prisma database schema for the LiveLink Health Report that stores raw ADO work items, workstream structure, sprint capacity/snapshot data, ADP Commitment milestones, configurable RAG thresholds, sync audit logs, and Phase 2 transcript/insight tables — replacing the boilerplate User/Post schema.

**Must Include:** Raw work item storage with on-the-fly metric calculation, manual sprint snapshot entry (planned/completed points), ADP Commitment milestones linked to ADO Features, and configurable RAG thresholds seeded with Sprint Predictability defaults (Green 80–100%, Amber 60–79%, Red <60%).

**Hardest Constraint:** Designing the WorkItem model to accurately mirror ADO's hierarchy (Epic → Feature → User Story → Task + Bug/Spike/Support) while keeping the schema clean enough that metric queries remain fast at the scale of ~4 workstreams × ~6 sprints × ~hundreds of work items.

**Success Criteria:** Schema supports all Phase 1 metric calculations (velocity, overhead%, predictability, carry-over) from raw work item data, accommodates manual capacity/snapshot entry with ADO MCP override, and includes Phase 2 tables ready for transcript processing without future migration.

## Detailed Requirements

### Data Storage Strategy

**Raw work items only.** All ADO work items (Epics, Features, User Stories, Tasks, Bugs, Spikes, Support items) are stored as raw records. Metrics are calculated on the fly at query time — no pre-computed metric snapshot tables. This keeps the schema simple and avoids data staleness. If recalculation is needed, re-query the raw data.

At the expected scale (~4 workstreams × ~6 sprints × hundreds of work items), on-the-fly calculation is performant. If scale increases significantly, a caching layer can be added later without schema changes.

### Sprint Snapshots & Capacity

Sprint predictability and carry-over rate require knowing what was **planned at sprint start** vs. **completed at sprint end**. Since ADO doesn't preserve point-in-time state, the operator manually enters these values during sync review.

**Capacity data** is pulled from ADO via MCP server, with manual override fields. Sprint capacity in ADO locks ~3 days into the sprint period, so the sync should happen after that lock window.

Fields per sprint/workstream:
- `plannedPoints` — Story points committed at sprint start (manual entry)
- `completedPoints` — Story points completed at sprint end (can be calculated or manual)
- `grossHours` — Total team capacity (from ADO or manual)
- `ptoHours` — PTO/absence hours (from ADO or manual)
- `ceremonyHours` — Calculated: 10.25 hrs × FTE count, prorated for PTO
- `fteCount` — Number of FTEs for this workstream this sprint
- `capacityLocked` — Boolean flag: has capacity been confirmed post-lock window?

### ADP Commitment Milestones

Milestones are ADO Features tagged as **"ADP Commitment"** (Annual Development Plan). Each milestone:
- Links to an ADO Feature by its work item ID
- Has a target month for completion
- Tracks status: Not Started → In Progress → Done
- Is associated with a workstream
- Supports operator notes

### RAG Thresholds

RAG status is **auto-calculated** from configurable thresholds stored in the database. No manual RAG override capability.

**Default thresholds (Sprint Predictability):**
- Green: 80–100%
- Amber: 60–79%
- Red: < 60%

Thresholds are stored per metric, allowing different ranges for different health indicators. Seeded with sensible defaults on first migration.

### Sync Audit Trail

A `SyncLog` table tracks every ADO data sync:
- When the sync ran
- What type of sync (work items, iterations, capacity, full)
- How many items were fetched/created/updated
- Success or failure status with error details
- Duration

### Phase 2 Tables (Included Now)

Phase 2 tables are included in the initial schema to avoid future migration overhead:

**Transcript** — Stores uploaded VTT files from Teams ceremonies:
- Ceremony type (Standup, Scrum of Scrums, Sprint Planning, Backlog Refinement)
- Associated sprint and optionally a workstream
- Raw VTT content
- Processing status

**CeremonyInsight** — LLM-extracted insights from transcripts:
- Insight type (Risk, Blocker, Dependency, Theme, Sentiment)
- Severity level
- Related workstream (if applicable)
- Source transcript reference

**Note:** Retros are intentionally excluded from ceremony types to preserve them as a safe, off-the-record space.

## Schema Overview

### Models (10 tables, replacing 2 boilerplate tables)

| Model | Purpose | Phase |
|---|---|---|
| `Workstream` | 4 workstreams with ADO area paths | 1 |
| `Sprint` | Shared iterations across all workstreams | 1 |
| `SprintWorkstream` | Junction: capacity, planned/completed points per workstream per sprint | 1 |
| `WorkItem` | Raw ADO work items (all types) | 1 |
| `Milestone` | ADP Commitment Features with target month and status | 1 |
| `ThresholdConfig` | Configurable RAG thresholds per metric | 1 |
| `SyncLog` | ADO sync audit trail | 1 |
| `Transcript` | VTT file storage and ceremony metadata | 2 |
| `CeremonyInsight` | LLM-extracted insights from transcripts | 2 |

**Removed:** `User` and `Post` (boilerplate from Mantine template)

### Relationships

```
Workstream ──┬── SprintWorkstream ──── Sprint
             ├── WorkItem
             ├── Milestone
             ├── Transcript
             └── CeremonyInsight

Sprint ──┬── SprintWorkstream
         ├── WorkItem
         └── Transcript

Transcript ──── CeremonyInsight
```

### Enums

| Enum | Values |
|---|---|
| `WorkItemType` | Epic, Feature, UserStory, Task, Bug, Spike, Support |
| `MilestoneStatus` | NotStarted, InProgress, Done |
| `SyncStatus` | Running, Success, Failed |
| `SyncType` | WorkItems, Iterations, Capacity, Full |
| `CeremonyType` | Standup, ScrumOfScrums, SprintPlanning, BacklogRefinement |
| `InsightType` | Risk, Blocker, Dependency, Theme, Sentiment |
| `Severity` | High, Medium, Low |

### ID Strategy

CUID strings via `@default(cuid())` — consistent with existing schema convention.

### Table Naming

PostgreSQL snake_case via `@@map()` — consistent with existing convention.

### Indexes

- `WorkItem.adoId` — unique, primary lookup for ADO sync
- `WorkItem.workstreamId` + `sprintId` — metric queries filter by workstream and sprint
- `WorkItem.type` — filter by work item type for metric calculation
- `WorkItem.iterationPath` — ADO iteration path lookups
- `SprintWorkstream` — unique composite on `[sprintId, workstreamId]`
- `Milestone.workstreamId` — milestone queries by workstream
- `ThresholdConfig.metricName` — unique, lookup by metric
- `SyncLog.startedAt` — recent sync lookups

## Implementation Approach

### Migration Strategy

1. Create new models in `schema.prisma`
2. Remove `User` and `Post` models
3. Run `pnpm run db:generate` to generate Prisma client
4. Run `pnpm run db:migrate` to create migration
5. Run `pnpm run db:seed` to seed default data

### Seed Data

- **Workstreams:** 4 records (Streams, Pitch Tracker, Action Tracker, KPI Services + UCM)
- **Thresholds:** Default RAG thresholds for all health metrics
- **Sprints:** Optionally seed the 5 historical sprints + current Sprint 1 Q4 FY26

### Metric Calculation Queries

All metrics are computed from raw `WorkItem` data at query time:

- **Velocity:** `SUM(storyPoints) WHERE type IN (UserStory) AND state IN (Resolved, Closed) AND sprintId = X AND workstreamId = Y`
- **Bug Hours:** `SUM(COALESCE(completedWork, originalEstimate)) WHERE type = Bug AND sprintId = X`
- **Spike Hours:** `SUM(storyPoints * 1) WHERE type = Spike AND sprintId = X` (1 point = 1 hour)
- **Support Hours:** `SUM(COALESCE(completedWork, originalEstimate)) WHERE type = Support AND sprintId = X`
- **Overhead %:** `(ceremonyHours + bugHours + spikeHours + supportHours) / grossHours * 100`
- **Sprint Predictability:** `completedPoints / plannedPoints * 100` (from SprintWorkstream manual entry)
- **Carry-Over Rate:** `(plannedPoints - completedPoints) / plannedPoints * 100`

## Scope Boundaries

### Included

- All 10 models listed above with full field definitions
- Prisma migration and seed script
- Removal of boilerplate User/Post models
- Default threshold seeding
- Workstream seeding with ADO area paths
- Phase 2 table stubs (Transcript, CeremonyInsight)

### Excluded

- Multi-program support (no Program table — single Unified LiveLink program)
- User authentication tables (single operator, local only)
- ADO webhook/event tables
- Report template storage
- Pre-computed metric caching tables
- Work item change history tracking (just current state)

## Program Context

- **Program:** Unified LiveLink
- **ADO Org/Project:** Operations-Innovation / Event Streaming Platform
- **Team:** Yellow Boxers
- **Sprint cadence:** 2-week, synchronized
- **Current position:** Sprint 1, Q4 FY26, Week 2 (Feb 10, 2026)
- **Historical data:** 5 prior sprints available in ADO
- **Workstreams:** Streams, Pitch Tracker, Action Tracker, KPI Services + UCM
