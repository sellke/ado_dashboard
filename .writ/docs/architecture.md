# System Architecture

> Last Updated: 2026-03-20

## Overview

**LiveLink Health Report** is a Next.js 15 App Router monolithic application that syncs Azure DevOps (ADO) data and presents program-level engineering health metrics for the Unified LiveLink program. Built with Mantine 8 for UI, Prisma 6 as ORM, PostgreSQL 16 for persistence, and Recharts for data visualization.

Developed as a solo local project — no CI/CD pipeline, no remote deployment.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser / Client                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  DashboardContainer ('use client')                          │ │
│  │    ├── useState (metrics, milestones, stories, sync)        │ │
│  │    ├── useEffect → fetch /api/metrics, /api/milestones, ... │ │
│  │    └── DashboardShell → Presentational Components           │ │
│  │         ├── ProgramSummarySection                           │ │
│  │         ├── WorkstreamCardsGrid                             │ │
│  │         │    └── WorkstreamHealthCard (×N)                  │ │
│  │         │         ├── SprintTabSelector                     │ │
│  │         │         ├── VelocityTrendChart                    │ │
│  │         │         ├── BurnupChart                           │ │
│  │         │         ├── OverheadBreakdownChart                │ │
│  │         │         ├── SprintStoryListPanel                  │ │
│  │         │         └── MilestoneGoalsPanel                   │ │
│  │         └── SyncControl                                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└────────────────────────┬─────────────────────────────────────────┘
                         │ fetch()
┌────────────────────────▼─────────────────────────────────────────┐
│                    Next.js App Router                             │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ Server Pages                                               │   │
│  │   app/dashboard/page.tsx → <DashboardContainer />          │   │
│  │   app/dashboard/streams/page.tsx → <DashboardContainer />  │   │
│  │   app/dashboard/bugs/page.tsx → <BugReportContainer />     │   │
│  └───────────────────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ API Routes (app/api/)                                      │   │
│  │   GET  /api/metrics          → MetricSnapshot queries      │   │
│  │   POST /api/metrics/compute  → Metric orchestrator         │   │
│  │   GET  /api/milestones       → Milestone + progress calc   │   │
│  │   GET  /api/milestones/:id   → Single milestone            │   │
│  │   POST /api/sync/ado         → ADO sync orchestrator       │   │
│  │   GET  /api/sprints/stories  → Sprint story list           │   │
│  └────────────────────┬──────────────────────────────────────┘   │
└───────────────────────┼──────────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────────┐
│                    Business Logic (lib/)                          │
│  ┌───────────────┐  ┌────────────┐  ┌──────────────────────┐    │
│  │ lib/metrics/   │  │ lib/sync/  │  │ lib/milestones/      │    │
│  │ orchestrator   │  │ ado-client │  │ calculator           │    │
│  │ calculators    │  │ work-items │  │ validation           │    │
│  │ trend-service  │  │ iterations │  │ format               │    │
│  │ aggregator     │  │ capacity   │  └──────────────────────┘    │
│  │ rag            │  │ mappers    │                              │
│  │ snapshot       │  │ config     │  ┌──────────────────────┐    │
│  └───────┬───────┘  └─────┬──────┘  │ lib/dashboard/       │    │
│          │                │          │ adapter (API → VM)    │    │
│          │                │          │ sprint-stories-adapter│    │
│          │                │          │ types, config         │    │
│          │                │          └──────────────────────┘    │
│  ┌───────▼────────────────▼──────────────────────────────────┐  │
│  │              Prisma ORM (lib/prisma.ts)                    │  │
│  │              Singleton Client Instance                     │  │
│  └───────────────────────┬───────────────────────────────────┘  │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────┬───────────────────┐
│        PostgreSQL 16 (Docker)                │  Azure DevOps     │
│        localhost:5433 / nextapp              │  REST API         │
│        12 tables, 7 enums                    │  (PAT auth)       │
└──────────────────────────────────────────────┴───────────────────┘
```

## Data Flow Patterns

### Pattern 1: Dashboard Read (Primary)

The main dashboard flow — client fetches metrics, adapter transforms to view models, components render.

```
Browser
  → DashboardContainer (useEffect)
    → fetch('/api/metrics?sprintId=...')
    → API Route: queries MetricSnapshot + trend data via Prisma
    → Returns JSON (MetricsApiResponse)
    → adapter.ts: mapApiResponseToViewModel()
    → DashboardViewModel (formatted strings, RAG badges, chart data)
    → Presentational components render
```

### Pattern 2: ADO Sync (Write)

User triggers sync → orchestrator fetches from ADO → persists to DB → recomputes metrics.

```
SyncControl (button click)
  → POST /api/sync/ado
    → sync/orchestrator.ts
      → ado-client.ts: fetch iterations, work items, capacity from ADO REST API
      → mappers.ts: ADO → Prisma models
      → Prisma upserts (WorkItem, Sprint, SprintWorkstream)
      → metrics/orchestrator.ts: compute + persist MetricSnapshot
      → SyncLog: audit trail
  → Client refetches /api/metrics + /api/milestones
```

### Pattern 3: Metric Computation

Metrics are computed once (on sync or manual trigger) and persisted — not recomputed per read.

```
POST /api/metrics/compute
  → metrics/orchestrator.ts
    → calculators.ts: velocity, overhead, predictability, carry-over per workstream
    → rolling.ts: 4-sprint rolling averages
    → rag.ts: evaluate against ThresholdConfig
    → snapshot.ts: upsert MetricSnapshot
    → trend-service.ts: velocity rate, predictions for dashboard chart
```

## Database Schema

### Models (12 tables)

**Core (8 models):**
- **Workstream** — Development workstreams with ADO area paths
- **Sprint** — Sprint definitions with ADO iteration paths and date ranges
- **SprintWorkstream** — Per-sprint per-workstream capacity and point data (unique on [sprintId, workstreamId])
- **WorkItem** — Raw ADO work items (all types: Epic, Feature, UserStory, Task, Bug, Spike, Support)
- **MetricSnapshot** — Computed metrics with rolling averages and RAG status (unique on [sprintId, workstreamId])
- **SprintPlanSnapshot** — Historical sprint state for carry-over calculation (unique on [sprintId, workstreamId, adoId])
- **Milestone** — ADP commitments linked to ADO Features with target months and derived status
- **ThresholdConfig** — RAG threshold ranges per metric (unique on metricName)

**Infrastructure (2 models):**
- **SyncLog** — ADO sync audit trail with per-workstream summary
- **WorkItem** — Indexed on [workstreamId, sprintId], [type], [iterationPath]

**Phase 2 — Ceremony Intelligence (2 models, schema only):**
- **Transcript** — Teams ceremony VTT file storage
- **CeremonyInsight** — LLM-extracted insights

### ID Strategy

- CUID strings via `@default(cuid())` for all primary keys
- ADO IDs stored as `Int` for cross-reference (`adoId`, `adoFeatureId`)

### Relationships

```
Workstream ──┬── SprintWorkstream ──── Sprint
             ├── WorkItem
             ├── Milestone
             ├── MetricSnapshot
             ├── SprintPlanSnapshot
             ├── Transcript
             └── CeremonyInsight

Sprint ──┬── SprintWorkstream
         ├── WorkItem
         ├── MetricSnapshot
         ├── SprintPlanSnapshot
         └── Transcript

Transcript ──── CeremonyInsight
```

## Component Architecture

### Dashboard Component Hierarchy

```
DashboardContainer ('use client' — data fetching, state)
  └── DashboardShell (loading/error/empty/success routing)
        ├── ProgramSummarySection (program-level metric tiles + milestone progress)
        ├── WorkstreamCardsGrid (responsive grid)
        │     └── WorkstreamHealthCard (×N, per workstream)
        │           ├── Metric tiles row (velocity, overhead, predictability, carry-over)
        │           ├── SprintTabSelector (shared, controlled)
        │           ├── VelocityTrendChart (line chart + prediction)
        │           ├── BurnupChart (milestone burnup area chart)
        │           ├── OverheadBreakdownChart (stacked bar)
        │           ├── OverheadCompositionChart (area chart)
        │           ├── SprintStoryListPanel (tabbed: In Progress/Completed/Not Started/Removed)
        │           ├── CurrentSprintItemTables (overhead items with ADO links)
        │           └── MilestoneGoalsPanel (feature milestone cards)
        └── SyncControl (trigger ADO sync)
```

### Chart Library (`lib/charts/`)

Thin wrappers over Recharts with:
- Mantine theme token integration (colors, fonts)
- Dark mode support via color scheme detection
- Consistent tooltip and legend components
- `passthrough` escape hatch for raw Recharts props
- Storybook stories for each chart type + kitchen sink
