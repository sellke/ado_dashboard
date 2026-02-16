# ADO Data Sync Specification (Lite)

> Source: `spec.md`
> Purpose: Compact AI context
> Created: 2026-02-11
> Contract Locked: Yes

## Core Objective

Implement a manual API-triggered ADO sync that ingests rolling 5-sprint data (current + 4 previous) for Yellow Box workstreams into Prisma/Postgres.

## Locked Requirements

- Trigger: Manual API route.
- Trigger consumers: Direct operator call or dashboard "Sync Now" UI action.
- Sprint window: Rolling 5 sprints, include current sprint in storage/projections.
- Metric rule: Exclude current sprint from rolling average calculations.
- Capacity: Auto-populate from ADO capacity API with manual override capability.
- Work item types: Feature, User Story, Bug, Spike, Support.
- Error handling: Moderate (per-workstream isolation, retries for transient failures, SyncLog audit trail).

## Critical Constraints

- Live ADO iteration naming/path differs from existing seed assumptions.
- Umbrella Yellow Box team may not hold direct sprint work items; sub-teams do.

## Data Model Touchpoints

- `Sprint`: map/upsert from ADO iteration metadata.
- `WorkItem`: upsert by `adoId`, revision-aware updates.
- `SprintWorkstream`: persist aggregated capacity fields (`grossHours` minimum).
- `SyncLog`: start/end status, counts, error summaries.

## Story Breakdown

1. Sync API orchestration and logging
2. Iteration ingestion and local sprint resolution
3. Work item ingestion and type mapping
4. Capacity aggregation, resilience, and validation
# ADO Data Sync Specification (Lite)

> Source: Complete spec.md
> Purpose: Efficient AI context for development

## Core Objective

Fetch work items (Features, Stories, Bugs, Spikes, Support), iterations, and capacity from ADO for all 4 Yellow Box workstreams via MCP tools. Upsert into existing Prisma schema. Rolling 5-sprint window. Manually triggered via API route. Moderate error handling with SyncLog audit.

## ADO Mapping (Confirmed Live)

| Workstream | ADO Sub-Team | Team ID | Area Path Suffix |
|---|---|---|---|
| Streams | Streams - Yellow Box | `ae8bcdaa...` | `\Streams` |
| Action Tracker | Action Tracker - Yellow Box | `69fee166...` | `\Action Tracker` |
| Pitch Tracker | Pitch Tracker - Yellow Box | `178ad7d2...` | `\Pitch Tracker` |
| KPI Services + UCM | KPI Services - Yellow Box | `ad5cf6e2...` | `\Tier Boards` |

- **Project:** Event Streaming Platform (`61b6ff0e...`)
- **Area path base:** `Event Streaming Platform\App\LiveLink - Yellow Box`
- **Iteration format:** `Event Streaming Platform\FY26\Q4\Sprint 26.21`
- **Current sprint:** Sprint 26.21 (Feb 2–13, 2026)

## Key Design Decisions

- **Rolling 5 sprints** — current + 4 prior; current excluded from rolling averages, used for velocity projection
- **No Tasks/Epics** — Sync Features, User Stories, Bugs, Spikes, Support only
- **Capacity auto-populate** — From ADO sub-team capacity API; `capacityLocked` flag prevents overwrites
- **Per-workstream isolation** — Failure in one workstream doesn't abort others
- **Retry transient failures** — Exponential backoff, max 3 retries
- **Shared sprint schedule** — All 4 sub-teams use same iteration IDs

## File Structure

```
lib/sync/
  ado-client.ts    — ADO MCP tool wrapper with retry
  config.ts        — Project/team IDs, area paths, window size
  mappers.ts       — ADO → Prisma field mappings
  iterations.ts    — Sprint sync
  work-items.ts    — Work item fetch + upsert
  capacity.ts      — Capacity aggregation + SprintWorkstream upsert
  orchestrator.ts  — Coordinates sync, manages SyncLog
app/api/sync/
  route.ts         — POST handler
```

## Sync Flow

1. Create SyncLog (Running)
2. Fetch iterations → determine rolling 5-sprint window
3. For each workstream: fetch work items + capacity (parallel where safe)
4. Upsert all records
5. Update SyncLog (Success/Failed)

## ADO Field → Schema Mapping

- `System.Id` → `adoId`, `System.Rev` → `adoRevision`
- `System.WorkItemType` → `type` (map "User Story" → UserStory)
- `Microsoft.VSTS.Scheduling.StoryPoints` → `storyPoints`
- `System.AreaPath` → `areaPath` + resolve `workstreamId`
- `System.IterationPath` → `iterationPath` + resolve `sprintId`
- `System.Parent` → `parentAdoId`
- `System.AssignedTo.displayName` → `assignedTo`

## Seed Data Fix Required

Seed uses wrong iteration paths (`...\App\LiveLink - Yellow Box\Q3 FY26\Sprint 1`).
Real paths are `...\FY26\Q3\Sprint 26.14`. Sprint names use continuous FY numbering.

## API

- `POST /api/sync` — body: `{ syncType?: "Full" | "WorkItems" | "Iterations" | "Capacity" }`
- Returns: `{ success, syncLogId, summary }`
