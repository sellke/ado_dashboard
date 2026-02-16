# ADO Data Sync Specification

> Created: 2026-02-11
> Status: Planning
> Contract Locked: Yes

## Contract Summary

### Deliverable

Build an API-triggered ADO sync that reliably ingests rolling 5-sprint Yellow Box data (work items, iterations, and capacity) into the local Prisma/Postgres schema for downstream dashboard metrics.

### Must Include

The sync must persist Features, User Stories, Bugs, Spikes, and Support work items for all 4 Yellow Box workstreams, with per-workstream isolation and audit logging.

### Hardest Constraint

The live ADO iteration taxonomy and sprint naming in production data do not match the current seeded sprint paths, so sync logic must resolve real ADO paths without breaking existing local seed assumptions.

### Success Criteria

- Operator triggers sync via API route (manual control).
- Rolling 5-sprint data is stored for all 4 workstreams.
- Current sprint data is stored and available for projection metrics.
- Current sprint is excluded from rolling average calculations by contract rule.
- Sync failures in one workstream do not block others.
- SyncLog records run status, counts, and errors with retry attempts for transient failures.

### Scope Boundaries

- Included:
  - Manual API-triggered sync endpoint(s)
  - ADO iteration + work item + capacity ingestion
  - Mapping to existing `Workstream`, `Sprint`, `WorkItem`, and `SprintWorkstream` records
  - Moderate resiliency and sync observability via `SyncLog`
- Excluded:
  - Cron/scheduled sync
  - Full historical backfill beyond rolling 5 sprints
  - Metric engine implementation (except contract notes needed for averaging exclusion rule)
  - Dashboard UI buildout (except endpoint consumption by dashboard, tracked in `2026-02-12-program-dashboard-ui`)

### Technical Concerns

- Existing seed sprint paths use a pattern that does not match live ADO iteration paths (for example, `Sprint 1 Q3 FY26` vs `Sprint 26.21`), so sprint resolution must key off actual ADO iteration metadata.
- Umbrella team (`Unified LiveLink - Yellow Box`) may not directly own sprint work items; sub-teams are the source of truth.
- Capacity values are per-member per-day; aggregation rules must be explicit to avoid inconsistent `grossHours` values.

### Recommendations

- Treat ADO iteration identifier/path as canonical and only map to local sprint naming secondarily.
- Implement sync per workstream and per resource type (iterations/work items/capacity) with isolated try/catch blocks.
- Persist enough metadata to make re-runs idempotent and debuggable (`adoId`, revision checks, sync counters, error message capture).
- Add a small sync configuration surface (`lookbackSprintCount = 5`) in code to avoid hardcoded scattering.

## Detailed Requirements

## 1) Source Systems and Scope

- ADO org/project: `Operations-Innovation / Event Streaming Platform`
- Workstreams to ingest:
  - Streams
  - Pitch Tracker
  - Action Tracker
  - KPI Services + UCM
- Resource domains:
  - Iterations (rolling 5, includes current)
  - Work items (types: Feature, User Story, Bug, Spike, Support)
  - Capacity (auto-populated from ADO, manual override preserved)

## 2) Trigger and Execution Model

- Sync is manually initiated through API route (primary interaction for MVP).
- Sync route supports both direct operator invocation and dashboard UI invocation.
- Endpoint returns run status and summary counts.
- Sync run creates a `SyncLog` record on start and updates completion state.

## 3) Rolling Sprint Logic

- Include 5 total sprints in storage window: current sprint + 4 previous sprints.
- Current sprint records are stored and available for projections.
- Rolling average metrics must explicitly exclude current sprint (contract rule consumed by downstream metric engine).

## 4) Data Mapping Rules

### WorkItem mapping

- Use `adoId` as durable identity and update existing rows by `adoId`.
- Map ADO work item types to Prisma `WorkItemType` enum:
  - `Feature` -> `Feature`
  - `User Story` -> `UserStory`
  - `Bug` -> `Bug`
  - `Spike` -> `Spike`
  - `Support` -> `Support`
- Populate:
  - `adoRevision`, `title`, `state`, `storyPoints`
  - `areaPath`, `iterationPath`, `parentAdoId`
  - `assignedTo`, `tags`, `adoCreatedDate`, `adoChangedDate`
  - `workstreamId`, `sprintId` (resolved from area/iteration paths)

### Sprint mapping

- Resolve local `Sprint` using ADO iteration path and date metadata.
- If sprint does not exist locally, create it with ADO-derived values.
- Do not rely on seed naming pattern as canonical.

### Capacity mapping

- Pull team capacity for each workstream and included sprint.
- Aggregate per-member `capacityPerDay` and working days to derive hours.
- Write to `SprintWorkstream` (`grossHours` at minimum), keeping manual override capability intact.

## 5) Reliability and Error Handling

- Moderate resilience target:
  - Per-workstream isolation
  - Retry transient failures (network/timeouts/rate-limit style failures)
  - Continue processing remaining workstreams when one fails
- Log per-run totals:
  - fetched/created/updated counts
  - sync type
  - status
  - error summary on failure/partial failure

## 6) Idempotency and Re-runs

- Re-running sync should not duplicate work items.
- Revision-aware updates: update only when source revision changed when possible.
- Sprint and sprint-workstream upserts must remain deterministic.

## 7) Security and Access

- Sync endpoint intended for local operator use.
- No public exposure requirement in MVP.
- Errors should avoid leaking sensitive auth/session details.

## 8) Testing and Validation

- Unit tests for type mapping and sprint-window selection logic.
- Integration-style tests for upsert behavior against Prisma test DB.
- Validation run against one known sprint to confirm counts and mapping.
- Verify that current sprint is excluded from rolling average input set (contract guardrail).

## Story Plan

1. `story-1-ado-sync-orchestration-and-api.md`: Manual API trigger, sync orchestration, SyncLog lifecycle - Dependencies: None
2. `story-2-iteration-and-sprint-resolution.md`: Rolling 5-sprint selection, ADO iteration ingestion, local sprint mapping/upsert - Dependencies: Story 1
3. `story-3-work-item-ingestion-and-type-mapping.md`: Work item fetch/mapping/upsert for selected types and workstreams - Dependencies: Story 1, Story 2
4. `story-4-capacity-sync-resilience-and-validation.md`: Capacity aggregation, retry/isolation handling, validation/reporting - Dependencies: Story 1, Story 2, Story 3

## Implementation Approach

- Build a small ADO sync service layer in server-side code with explicit boundaries:
  - Iteration service
  - Work item service
  - Capacity service
  - Orchestrator
- Keep API route thin: validate request, call orchestrator, return summary.
- Use Prisma transactions where useful for local consistency, but avoid one giant transaction spanning all workstreams.
- Prepare output contracts compatible with later dashboard/metric engine consumption.
# ADO Data Sync Specification

> Created: 2026-02-11
> Status: Planning
> Contract Locked: Yes

## Contract Summary

**Deliverable:** Server-side ADO data sync service that fetches work items, iterations, and capacity data for all 4 Yellow Box workstreams via the ADO MCP tools, upserting records into the existing Prisma/PostgreSQL schema and exposing a manually-triggered API route.

**Must Include:** Rolling 5-sprint sync window (current + 4 prior), per-workstream error isolation, SyncLog audit trail, and correct mapping from ADO's real iteration paths/team structure to the local schema.

**Hardest Constraint:** ADO's team structure requires querying 4 separate sub-teams (Streams, Action Tracker, Pitch Tracker, KPI Services - all "Yellow Box" variants), each with their own capacity settings, while presenting a unified view per workstream in the local DB.

**Success Criteria:** After a sync, the work_items table contains all Features, User Stories, Bugs, Spikes, and Support items for the rolling 5-sprint window across all 4 workstreams, with correct workstream and sprint associations. Capacity data auto-populates sprint_workstreams with manual override support.

**Scope Boundaries:**
- **Included:** Iteration sync, work item sync (Features/Stories/Bugs/Spikes/Support), capacity sync, API route, SyncLog, seed data correction
- **Excluded:** Metric calculations (separate feature), dashboard UI, scheduled/automated sync, Epic and Task type sync

## ADO Environment (Confirmed via Live API)

### Project and Organization
- **Org:** Operations-Innovation
- **Project:** Event Streaming Platform (ID: 61b6ff0e-9f9d-40a0-ad25-8920f42fddf1)

### Team Structure
Work is distributed across 4 sub-teams under the "Yellow Boxers" umbrella:

| Workstream | ADO Sub-Team | Team ID | Area Path |
|---|---|---|---|
| Streams | Streams - Yellow Box | ae8bcdaa-d61b-475c-ba34-13c88b1adf8e | Event Streaming Platform\App\LiveLink - Yellow Box\Streams |
| Action Tracker | Action Tracker - Yellow Box | 69fee166-1ccb-43b5-afcd-5d3f08fa2198 | Event Streaming Platform\App\LiveLink - Yellow Box\Action Tracker |
| Pitch Tracker | Pitch Tracker - Yellow Box | 178ad7d2-bd20-42f9-a992-43b20dfa9b9e | Event Streaming Platform\App\LiveLink - Yellow Box\Pitch Tracker |
| KPI Services + UCM | KPI Services - Yellow Box | ad5cf6e2-be70-45e5-8e0f-366558717b46 | Event Streaming Platform\App\LiveLink - Yellow Box\Tier Boards |

**Note:** "Unified LiveLink - Yellow Box" (b30190ac-1acd-41dd-bd50-97f93be264e4) is the umbrella team with sprint-level iterations but no work items assigned directly.

### Iteration Path Format
- **Real format:** Event Streaming Platform\FY26\Q4\Sprint 26.21
- **Sprint naming:** Continuous FY numbering: Sprint 26.1 through Sprint 26.25 for FY26
- **Current sprint:** Sprint 26.21 (Feb 2-13, 2026), timeFrame: 1
- **Cadence:** 2-week sprints, synchronized across all 4 sub-teams (same iteration IDs)

### Seed Data Correction Required
The existing seed data uses incorrect iteration paths:
- **Seed:** Event Streaming Platform\App\LiveLink - Yellow Box\Q3 FY26\Sprint 1
- **Actual:** Event Streaming Platform\FY26\Q3\Sprint 26.14

Sprint names also differ: seed uses "Sprint 1 Q3 FY26" while ADO uses "Sprint 26.14".

## Detailed Requirements

### 1. Sync Scope - Rolling 5-Sprint Window
- Sync fetches data for the **current sprint + 4 most recent completed sprints**
- The current sprint (identified by timeFrame: 1 from ADO API) is synced for **projection only** - it provides current-state work items and velocity projection but is excluded from rolling average calculations
- The rolling window automatically advances as sprints complete
- Sprint detection uses the ADO team iterations API for any one sub-team (all share the same schedule)

### 2. Iteration/Sprint Sync
- Fetch team iterations from any one sub-team (they share iteration IDs)
- Create or update local Sprint records with correct ADO iteration paths, start/end dates
- Map ADO timeFrame values: 0 = past, 1 = current, 2 = future
- Only sync sprints within the rolling 5-sprint window

### 3. Work Item Sync
- For each sprint in the window, for each of the 4 sub-teams:
  - Fetch work item IDs via get_work_items_for_iteration
  - Batch-fetch work item details via get_work_items_batch_by_ids (with full fields)
  - Filter to target types: Feature, User Story, Bug, Spike, Support
- Upsert into work_items table keyed on adoId
- Auto-resolve workstreamId from System.AreaPath - match against workstreams.adoAreaPath
- Auto-resolve sprintId from System.IterationPath - match against sprints.adoIterationPath
- Map ADO fields to schema:
  - System.Id -> adoId
  - System.Rev -> adoRevision
  - System.WorkItemType -> type (map "User Story" -> UserStory, etc.)
  - System.Title -> title
  - System.State -> state
  - Microsoft.VSTS.Scheduling.StoryPoints -> storyPoints
  - Microsoft.VSTS.Scheduling.OriginalEstimate -> originalEstimate
  - Microsoft.VSTS.Scheduling.CompletedWork -> completedWork
  - Microsoft.VSTS.Scheduling.RemainingWork -> remainingWork
  - System.AreaPath -> areaPath
  - System.IterationPath -> iterationPath
  - System.Parent -> parentAdoId
  - System.AssignedTo.displayName -> assignedTo
  - System.Tags -> tags
  - System.CreatedDate -> adoCreatedDate
  - System.ChangedDate -> adoChangedDate

### 4. Capacity Sync
- For each sprint in the window, for each of the 4 sub-teams:
  - Fetch team capacity via get_team_capacity
  - Aggregate per-member capacityPerDay into total hours for the sprint
  - Formula: grossHours = totalCapacityPerDay x workingDaysInSprint
  - Calculate working days from sprint start/end dates (exclude weekends)
- Upsert into sprint_workstreams table (keyed on sprint + workstream)
- Respect capacityLocked flag: if true, skip capacity update for that record
- When capacityLocked is false, auto-populate from ADO data

### 5. API Route
- **Endpoint:** POST /api/sync
- **Auth:** None (local-only tool, single operator)
- **Request body:** Optional { syncType?: "Full" | "WorkItems" | "Iterations" | "Capacity" }
- **Response:** { success: boolean, syncLogId: string, summary: { ... } }
- **Behavior:** Creates a SyncLog record at start (status: Running), updates on completion (Success/Failed)

### 6. Error Handling (Moderate)
- Per-workstream error isolation: failure in one workstream does not abort others
- SyncLog records with itemsFetched, itemsCreated, itemsUpdated, errorMessage
- Retry on transient failures (network timeouts, 429 rate limits) with exponential backoff (max 3 retries)
- Partial success: if 3/4 workstreams succeed, report partial success with error details

### 7. Seed Data Correction
- Update prisma/seed.ts to use real ADO iteration paths and sprint names
- Replace hardcoded "Sprint 1 Q3 FY26" naming with "Sprint 26.14" etc.
- Replace iteration base path with Event Streaming Platform\FY26\Q3\...
- Update sprint date ranges to match actual ADO sprint dates

## Implementation Approach

### Architecture
- **Service layer:** lib/sync/ directory with modular sync functions
  - lib/sync/iterations.ts - Sprint/iteration sync logic
  - lib/sync/work-items.ts - Work item fetch, transform, and upsert
  - lib/sync/capacity.ts - Capacity aggregation and SprintWorkstream updates
  - lib/sync/orchestrator.ts - Coordinates all sync types, manages SyncLog lifecycle
  - lib/sync/ado-client.ts - ADO MCP tool wrapper with retry logic
  - lib/sync/mappers.ts - ADO to Prisma field mapping functions
- **API route:** app/api/sync/route.ts - POST handler that invokes orchestrator
- **Config:** lib/sync/config.ts - ADO project/team IDs, area path mappings, rolling window size

### Data Flow
```
API Route (POST /api/sync)
  -> Create SyncLog (Running)
  -> Orchestrator
    -> Iteration Sync (determine rolling 5-sprint window)
    -> For each workstream (parallel where safe):
      -> Work Item Sync (fetch + upsert)
      -> Capacity Sync (fetch + aggregate + upsert)
    -> Update SyncLog (Success/Failed)
  -> Return summary response
```

### ADO MCP Tool Usage
The sync uses the installed ADO MCP server tools:
- list_team_iterations - Get sprint list with dates and timeFrame
- get_work_items_for_iteration - Get work item IDs per sprint/team
- get_work_items_batch_by_ids - Batch-fetch work item details
- get_work_item - Full field expansion for individual items (when needed)
- get_team_capacity - Per-member capacity per sprint/team

**Important:** These are MCP tools, not REST API calls. The sync service will invoke them programmatically through the MCP client interface.

### Key Decisions
1. **No Task sync** - Tasks are child items of User Stories; effort fields on Stories/Features are sufficient for health metrics
2. **Rolling window, not full history** - 5 sprints keeps sync fast and focused; historical data can be expanded later
3. **Capacity auto-populate with lock** - capacityLocked flag on SprintWorkstream prevents ADO overwrites after manual adjustment
4. **Current sprint excluded from averages** - Current sprint is in-progress; using it for averages would skew metrics. Synced for velocity projection only.
5. **Shared sprint schedule** - All 4 sub-teams use the same iteration IDs, so sprint detection only needs one team query
