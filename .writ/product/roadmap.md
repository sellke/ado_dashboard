# Product Roadmap — Unified LiveLink Health Report

> Based on Product Contract: 2026-02-08
> Last Updated: 2026-04-09
> Current Position: Q4 FY26

## Phase 1A: Backend Foundation (Complete)

**Status:** Done
**Goal:** Establish data pipeline from ADO through metric calculation to API.

### What Was Delivered

#### Database Schema (Feb 8–11)

Completed in 6 user stories (54/54 tasks):

1. **Program Structure Schema** — Workstream, Sprint, SprintWorkstream models with capacity tracking
2. **ADO Work Item Schema** — WorkItem model with full ADO hierarchy support and performance indexes
3. **ADP Milestone Schema** — Milestone model with status progression and workstream association
4. **Configuration & Sync Infrastructure** — ThresholdConfig (5 RAG metrics) and SyncLog models
5. **Phase 2 Transcript & Insight Schema** — Transcript and CeremonyInsight models (built ahead of Phase 2)
6. **Schema Cleanup, Seed Data & Migration** — Boilerplate removal, idiomatic seed script, end-to-end validation

See `[.writ/specs/2026-02-08-database-schema/](../.writ/specs/2026-02-08-database-schema/spec.md)` for full specification and story details.

#### ADO Data Sync Engine (Feb 11–12)

Full sync pipeline from ADO to local database:

1. **Sync Orchestrator** — Creates SyncLog, processes workstreams with per-workstream isolation, tracks status and per-workstream summaries
2. **Iteration Sync** — Fetches team iterations from ADO, selects rolling 5-sprint window (current + 4 prior), upserts to Sprint table
3. **Work Item Sync** — Fetches, maps, and upserts work items per workstream with ADO field mapping (state, type, story points, effort, area path, parent/child)
4. **Capacity Sync** — Fetches team capacity per iteration, upserts SprintWorkstream capacity/ceremony hours with retry and locked-sprint skip
5. **Sync API** — `POST /api/sync/ado` supporting Full, WorkItems, Iterations, and Capacity sync types
6. **Program Config** — 5 workstreams configured: Streams, Action Tracker, Pitch Tracker, KPI Services, UCM

#### Metric Calculation Engine (Feb 12)

Complete metric pipeline from raw work items to program-level health:

1. **Pure Calculators** — Velocity (done story points), overhead% (ceremony + bugs + spikes + support / gross hours), predictability (completed / planned), carry-over (incomplete items/points rate)
2. **RAG Evaluation** — Green/Amber/Red classification against configurable thresholds per metric
3. **Rolling Averages** — 5-sprint rolling averages for trend context
4. **Snapshot Persistence** — MetricSnapshot model stores computed metrics per sprint/workstream
5. **Program Aggregation** — Weighted averages across workstreams with program-level RAG
6. **Metrics API** — `GET /api/metrics` (fetch with filtering) and `POST /api/metrics/compute` (trigger computation)

### Technical Foundation Checklist

- Prisma schema with 9+ models, 7 enums, indexes, and table mappings
- Prisma migrations created and applied (7 migrations)
- Seed script with workstreams, RAG thresholds, and historical sprints
- Comprehensive Prisma model tests (15 test files)
- Boilerplate User/Post models removed, codebase cleaned up
- ADO sync orchestrator with per-workstream isolation and SyncLog tracking
- ADO client: iterations, work items, capacity fetch via MCP tools
- Sync API route: `POST /api/sync/ado` (Full, WorkItems, Iterations, Capacity)
- Metric calculators: velocity, overhead%, predictability, carry-over (pure functions)
- Metric orchestrator with per-workstream isolation and program aggregation
- RAG evaluation engine with configurable thresholds
- Rolling 5-sprint averages for trend context
- MetricSnapshot persistence for computed metrics
- Metrics API routes: `GET /api/metrics`, `POST /api/metrics/compute`
- Sync config with 4 workstreams, ADO team IDs, and area path mappings
- Test coverage: 27 test files (Prisma models, sync modules, metrics, API routes)

---

## Phase 1B: Program Summary UI (Complete)

**Status:** Done
**Goal:** Top-level program health view — the first thing stakeholders see.
**Specs:** [program-dashboard-ui](../specs/2026-02-12-program-dashboard-ui/spec.md), [program-summary-ui](../specs/2026-02-18-program-summary-ui/spec.md)

### What Was Delivered

Completed in 10 user stories (55/55 tasks) across two spec cycles:

1. **Dashboard Data Contract & Shell** — Mantine page layout, `GET /api/metrics` data contract, loading/error/empty states
2. **Program Summary Section** — Metric tiles with RAG color coding
3. **Workstream Health Cards** — Per-workstream cards with metric tiles and trend values
4. **State Coverage & Storybook** — Loading, error, empty, and partial-data states; Storybook stories
5. **Sync Trigger & Auto-Refresh** — "Sync Now" button triggers full ADO refresh, automatic metrics refetch
6. **Metric Calculation Service & Trend API** — `buildTrendSeries()` service, additive trend payload (velocity, bug counts per sprint)
7. **Trend & Bug Metrics UI** — Sprint-over-sprint velocity trend, bug burndown, current-sprint prediction
8. **Metric Display Adjustments** — Removed predictability metric from UI, renamed "Carry-Over Rate" → "Carry-Over %"
9. **Milestone Tile Placeholder UI** — Monthly Milestone % and Quarterly Milestone Progress tiles with null/placeholder state
10. **End-to-End Validation** — Metrics validated against known ADO sprint data

### Metrics Displayed


| #   | Tile                         | Source                       |
| --- | ---------------------------- | ---------------------------- |
| 1   | Average Velocity             | MetricSnapshot program-level |
| 2   | Overhead %                   | MetricSnapshot program-level |
| 3   | Carry-Over %                 | MetricSnapshot program-level |
| 4   | Monthly Milestone %          | Milestone data (Phase 1E)    |
| 5   | Quarterly Milestone Progress | Milestone data (Phase 1E)    |


---

## Phase 1C: Workstream Velocity Section (Complete)

**Status:** Done
**Goal:** Per-workstream velocity, velocity rate, and carry-over with trend visualization and current-sprint prediction.
**Spec:** [workstream-velocity](../specs/2026-02-19-workstream-velocity/spec.md)

### What Was Delivered

Completed in 5 stories (35/35 tasks):

1. **API Data Contract Extension** — Per-workstream prediction (velocity, velocityRate, mode, formula) and per-sprint bug array added to `GET /api/metrics`
2. **Dashboard Types & Adapter** — Extended view models for velocity rate tile, bug mapping, prediction mapping
3. **Velocity Trend Chart** — Recharts LineChart per workstream: completed sprints (solid) + current sprint prediction (dashed), rolling average reference line
4. **Sprint Bug List** — Per-sprint bug listing with ADO ID, title, state; closed bugs with strikethrough styling
5. **Card Integration & Testing** — Velocity rate as 4th metric tile (Velocity, Velocity Rate, Overhead %, Carry-Over %), chart and bug list wired into WorkstreamHealthCard

### Metrics Per Workstream Per Sprint


| Metric               | Calculation                                | Notes                                     |
| -------------------- | ------------------------------------------ | ----------------------------------------- |
| **Velocity**         | SP completed (Done-like states) in sprint  | Trend visualization across rolling window |
| **Velocity Rate**    | SP completed / net capacity hours          | Efficiency signal (informational, no RAG) |
| **Carry-over %**     | Incomplete SP / planned SP                 | Overcommitment signal                     |
| **Rolling Averages** | 5-sprint rolling avg for each metric above | Trend context, smooths outliers           |


### Current Sprint Prediction

- **Predicted Velocity** = Average Velocity Rate × Net Hours available in current sprint
- Displayed as dashed extension with "(Forecasted)" label, visually distinguished from actuals

---

## Phase 1D: Workstream Overhead Section (Complete)

**Status:** Done
**Goal:** Per-workstream overhead breakdown with composition view and individual bug/support/spike item detail.
**Spec:** [workstream-overhead](../specs/2026-02-20-workstream-overhead/spec.md)

### What Was Delivered

Completed in 6 stories (39/39 tasks):

1. **Schema Migration & Calculator Breakdown** — Added `ceremonyHours`, `bugHours`, `spikeHours`, `supportHours` to MetricSnapshot; extended `calculateOverhead()` to return per-component breakdown
2. **API Contract Extension** — Added `overheadComposition` per trend sprint and `overheadItemsBySprint` per workstream to `GET /api/metrics`
3. **Dashboard Types & Adapter** — `OverheadCompositionViewModel`, `OverheadItemViewModel` with ADO URL links
4. **Overhead Composition Chart** — Stacked bar chart (ceremony/bug/spike/support hours) per sprint via Recharts
5. **Current Sprint Item Tables** — Bug, spike, and support item listings with ADO ID, title, hours, state, and clickable ADO links
6. **OverheadBreakdownPanel & Card Integration** — Umbrella panel wired into WorkstreamHealthCard; sprint-selectable items driven by shared SprintTabSelector

### Overhead Composition Breakdown


| Component          | Source                                     | Calculation                    |
| ------------------ | ------------------------------------------ | ------------------------------ |
| **Ceremony Hours** | 10.25 hrs/FTE/sprint, prorated for PTO     | SprintWorkstream.ceremonyHours |
| **Bug Hours**      | CompletedWork (fallback: OriginalEstimate) | ADO Bug work items             |
| **Support Hours**  | CompletedWork (fallback: OriginalEstimate) | ADO Support work items         |
| **Spike Hours**    | StoryPoints × 1 (1 point = 1 hour)         | ADO Spike work items           |


---

## Phase 1E: Workstream Milestones Section (Phase 1 Complete — ADP Extension In Progress)

**Status:** Phase 1 Done, ADP Extension In Progress
**Goal:** Monthly goal tracking per workstream — Features tagged in ADO with monthly targets, tracked by child story point completion.
**Specs:** [workstream-milestones](../specs/2026-02-20-workstream-milestones/spec.md), [manual-milestone-entry](../specs/2026-02-13-manual-milestone-entry/spec.md), [adp-milestones-panel](../specs/2026-03-23-adp-milestones-panel/spec.md)

### What Was Delivered

#### Phase 1 Milestones (6 stories, complete)

1. **Feature Goal Sync** — WIQL query per workstream fetching ADO Features with `ADP-{MON}` tags; auto-creates Milestone records with targetMonth parsing
2. **Progress Calculator** — Pure functions for completed SP / total SP computation and per-sprint burnup data
3. **API Extension** — Extended `GET /api/milestones` with `completedPoints`, `totalPoints`, `burnupData`, quarter grouping
4. **Types & Adapter** — `MilestoneGoalViewModel`, `MilestoneMonthGroup` view models with mapping functions
5. **MilestoneGoalsPanel Component** — BurnupChart (area chart) + FeatureMilestoneCard + month-grouped panel layout
6. **Dashboard Integration** — Replaced manual CRUD MilestonePanel with ADO-driven MilestoneGoalsPanel

#### Manual Milestone Entry (3 stories, superseded)

REST API (GET/POST/PUT/DELETE `/api/milestones`), milestone table UI, inline status cycling — delivered as interim solution before ADO Feature tag sync was implemented.

#### ADP Milestones Panel Fix (2 stories, complete)

1. **Data Pipeline Fix** — Repaired type/computation/prop-forwarding pipeline for quarterly milestone data reaching ProgramSummarySection
2. **ADP-MON Tag Filter** — Restricted milestone progress to only child stories bearing `ADP-MON` tags

### ADP Extension (Remaining — 4 stories)

- ADP Tag Format Migration — replace legacy `-Goal` tags with strict `ADP-{MON}`
- Quarter Tag Parsing & Rollup — parse `Qx` tags for quarter-driven program rollup
- Milestone Status Derivation Fix — wire `deriveMilestoneStatus()` into API
- Program Rollup UI — surface `programRollup` in ProgramSummarySection

### Milestone Model

- ADO **Features** tagged `ADP-{MON}` (e.g., `ADP-MAR`) with `Qx` quarter tags (e.g., `Q4`)
- Child **User Stories** with `ADP-MON` tags are the unit of progress
- **% Complete** = Completed SP / Total SP
- Status derived at API time via `deriveMilestoneStatus()` (not stored)
- Quarterly grouping via explicit `Qx` tag on Features

---

## Cross-Cutting Enhancements (Complete)

Infrastructure, UX, and data accuracy improvements delivered across multiple phases. Each has its own spec.

### Recharts Chart Library Migration

**Spec:** [recharts-chart-library](../specs/2026-03-05-recharts-chart-library/spec.md) — 6 stories

Replaced `@mantine/charts` with reusable Recharts wrappers in `lib/charts/` with Mantine theme integration, dark mode, and Storybook stories. Migrated all 5 dashboard charts.

### Sprint Story List Tabs

**Spec:** [sprint-story-list-tabs](../specs/2026-03-05-sprint-story-list-tabs/spec.md) — 4 stories

Per-workstream panel showing User Stories grouped by status (Planned/Active/Resolved/Completed) with Mantine Tabs for sprint selection. New API endpoint `GET /api/sprints/stories`, clickable rows linking to ADO.

### Common Sprint Tab Selector

**Spec:** [common-sprint-tab-selector](../specs/2026-03-05-common-sprint-tab-selector/spec.md) — 3 stories

Replaced four duplicate per-workstream sprint tab bars with a single shared selector above the cards grid. One tab change updates all cards.

### Overhead Sprint-Selectable ADO Links

**Spec:** [overhead-sprint-ado-links](../specs/2026-03-05-overhead-sprint-ado-links/spec.md) — 3 stories

Extended overhead items (Bugs, Spikes, Support) to be sprint-selectable via shared SprintTabSelector with clickable ADO work item links.

### Sprint Plan Snapshot

**Spec:** [sprint-plan-snapshot](../specs/2026-03-05-sprint-plan-snapshot/spec.md) — 4 stories

New `SprintPlanSnapshot` table captures work item assignments during each sync cycle, fixing carry-over % accuracy for completed sprints.

### Sprint Tabs Full Workstream Data

**Spec:** [sprint-tabs-full-workstream-data](../specs/2026-03-17-sprint-tabs-full-workstream-data/spec.md) — 5 stories

All workstream card sections now respond to sprint tab selection. Enriched API trend sprints with MetricSnapshot fields (rolling averages, planned/completed/carry-over points).

### Dashboard Metrics Audit

**Spec:** [dashboard-metrics-audit](../specs/2026-03-23-dashboard-metrics-audit/spec.md) — 5 stories

Section-by-section audit: sprint-actual Overhead % and Carry-Over % tiles, 2-column workstream layout, overhead composition stacked bar chart, quarterly-grouped milestone rework, bug page dashboard filter.

### Current Sprint Chart Visibility

**Spec:** [current-sprint-chart-visibility](../specs/2026-04-08-current-sprint-chart-visibility/spec.md) — 3 stories

Current sprint now appears in velocity, bug burndown, and overhead charts with hollow-dot styling and `(Cur)` x-axis label. Rolling window shows 5 entries (4 actual + 1 current).

### Sprint Tab Badge Tooltip

**Spec:** [sprint-tab-badge-tooltip](../specs/2026-04-08-sprint-tab-badge-tooltip/spec.md) — 1 story

Added tooltip to sprint tab story-count badges: "N stories in this sprint".

---

## Phase 1F: PowerPoint Export

**Status:** Not started
**Goal:** One-click export of all dashboard sections to stakeholder-ready `.pptx` slides.
**Effort:** M

### Slide Structure

Maps directly to the 4 report sections:

1. **Program Summary slide** — KPI cards, monthly/quarterly milestone status
2. **Workstream Velocity slides** — One per workstream with trend charts and current-sprint prediction
3. **Workstream Overhead slides** — Composition breakdown + bug/support highlights per workstream
4. **Workstream Milestone slides** — Monthly goal progress per workstream with visual indicators

### Deliverables

- pptxgenjs integration and slide template design
- Program Summary slide generation
- Workstream Velocity slides with embedded chart images or table representations
- Workstream Overhead slides with composition breakdown and item highlights
- Workstream Milestone slides with progress indicators
- One-click export trigger from dashboard UI
- Exported file naming convention (e.g., `LiveLink-Health-Report-2026-02-18.pptx`)

### Open Questions (to resolve during spec)

- Chart rendering for slides (server-side chart image generation vs. pptxgenjs native charts)
- Slide template branding/styling
- Which item-level details make it to slides vs. dashboard-only

---

## Phase 1 Overall Success Criteria

- ADO data for all workstreams fetched and stored reliably
- Core sprint metrics calculated correctly (validated against known sprint data)
- Program Summary section displays RAG-coded metric tiles (Velocity, Overhead %, Carry-Over %, Milestone placeholders)
- Workstream velocity with trend charts and current-sprint prediction
- Workstream overhead breakdown with composition charts and item tables
- Workstream milestones tracked from ADO Feature tags (ADP format)
- Sprint plan snapshots ensure accurate carry-over for completed sprints
- All workstream card sections respond to shared sprint tab selection
- Charts migrated to Recharts with dark mode and Mantine theme integration
- Current sprint visible in all charts with in-progress styling
- Phase 1E ADP Extension (tag migration, quarter rollup, status derivation)
- PowerPoint export produces stakeholder-ready slides without manual editing
- Total report generation time: < 15 minutes (vs. hours today)

---

## Phase 2: Qualitative Intelligence

**Timeline:** After Phase 1 report sections are operational
**Goal:** Add AI-extracted ceremony insights and advanced analytics.

### Success Criteria

- Transcript upload and processing produces accurate, actionable insights
- Advanced metrics surface early warning signals
- Historical trends visible across available sprints
- Report combines quantitative data with qualitative context

### Growth Features

- **VTT transcript upload** — Upload interface for ceremony transcripts `[Effort: S]`
- **LLM insight extraction** — Risks, blockers, dependencies, themes, sentiment `[Effort: L]`
- **Ceremony insight display** — Integrated into workstream cards and program summary `[Effort: M]`
- **Advanced metrics** — Aging WIP, scope creep index `[Effort: M]`
- **Historical trend charts** — Expanded sparklines and charts for metric trends over sprints `[Effort: M]`

### Dependencies

- Phase 1 dashboard operational and metric accuracy validated
- LLM provider access confirmed (Azure OpenAI or Cursor-triggered)
- At least 2-3 ceremony VTT files available for testing
- Sufficient historical sprint data for meaningful trends

### Note

Database tables for Phase 2 (Transcript, CeremonyInsight) are already created as part of the database schema work. The remaining effort is the upload UI, LLM processing pipeline, and display integration.

---

## Phase 3: Automation & Polish

**Timeline:** Ongoing as needed through Q4
**Goal:** Reduce manual steps, enhance visualization, and expand reporting depth.

### Advanced Features

- **Automated transcript pipeline** — Reduce manual VTT download/upload `[Effort: XL]`
- **Cross-team dependency graph** — Visual map of inter-workstream dependencies `[Effort: L]`
- **Stakeholder-specific views** — PO vs. Director vs. Senior Director slide templates `[Effort: M]`
- **Report scheduling** — Automated weekly report generation trigger `[Effort: M]`
- **Predictive insights** — Sprint completion forecasting based on velocity trends `[Effort: L]`

### Market Position

- Replaces all manual reporting for Unified LiveLink program health
- Potential template for other Medtronic programs if successful

---

## Effort Sizing


| Size   | Duration  | Example                                           |
| ------ | --------- | ------------------------------------------------- |
| **XS** | 1-2 hours | Hardcoded config, simple UI tweaks                |
| **S**  | 3-5 hours | Upload form, simple chart, data display           |
| **M**  | 1-2 days  | Metric engine, dashboard layout, export logic     |
| **L**  | 3-5 days  | ADO integration, LLM processing pipeline          |
| **XL** | 1+ weeks  | Automated transcript pipeline, major integrations |


## Build Order & Critical Path

```
Phase 1A (Done) ──► Phase 1B (Done) ──────────────────► Phase 1F (Not Started)
                          │
                          ├──► Phase 1C (Done)
                          │       └── + Recharts, Sprint Tabs, Plan Snapshot
                          │
                          ├──► Phase 1D (Done)
                          │       └── + Overhead ADO Links, Metrics Audit, Chart Visibility
                          │
                          └──► Phase 1E (Phase 1 Done → ADP Extension In Progress)
                                  └── + ADP Milestones Panel, Badge Tooltip
```

**What's done:** Phases 1A–1D fully complete. Phase 1E Phase 1 complete with ADP extension remaining. Nine cross-cutting enhancement specs delivered alongside the main phases.

**Remaining work:**

1. **Phase 1E ADP Extension** — 4 stories: tag migration, quarter parsing, status derivation, program rollup UI
2. **Phase 1F PowerPoint Export** — Full scope, depends on dashboard being stable

**Next immediate action:** Complete Phase 1E ADP Extension, then spec out Phase 1F (PowerPoint Export).