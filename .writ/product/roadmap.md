# Product Roadmap — Unified LiveLink Health Report

> Based on Product Contract: 2026-02-08
> Last Updated: 2026-02-18
> Current Position: Q4 FY26, Sprint 2, Week 2

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

See [`.writ/specs/2026-02-08-database-schema/`](../.writ/specs/2026-02-08-database-schema/spec.md) for full specification and story details.

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

- [x] Prisma schema with 9+ models, 7 enums, indexes, and table mappings
- [x] Prisma migrations created and applied (7 migrations)
- [x] Seed script with workstreams, RAG thresholds, and historical sprints
- [x] Comprehensive Prisma model tests (15 test files)
- [x] Boilerplate User/Post models removed, codebase cleaned up
- [x] ADO sync orchestrator with per-workstream isolation and SyncLog tracking
- [x] ADO client: iterations, work items, capacity fetch via MCP tools
- [x] Sync API route: `POST /api/sync/ado` (Full, WorkItems, Iterations, Capacity)
- [x] Metric calculators: velocity, overhead%, predictability, carry-over (pure functions)
- [x] Metric orchestrator with per-workstream isolation and program aggregation
- [x] RAG evaluation engine with configurable thresholds
- [x] Rolling 5-sprint averages for trend context
- [x] MetricSnapshot persistence for computed metrics
- [x] Metrics API routes: `GET /api/metrics`, `POST /api/metrics/compute`
- [x] Sync config with 4 workstreams, ADO team IDs, and area path mappings
- [x] Test coverage: 27 test files (Prisma models, sync modules, metrics, API routes)

---

## Phase 1B: Program Summary UI

**Status:** Not started
**Goal:** Top-level program health view — the first thing stakeholders see.
**Effort:** M

### Metrics Displayed

| Metric | Calculation | Source |
|---|---|---|
| **Average Velocity** | Rolling avg of total SP completed per sprint, all workstreams combined | MetricSnapshot (program-level) |
| **Average Velocity Rate** | Average velocity / net capacity hours (program-wide) | MetricSnapshot + SprintWorkstream capacity |
| **Carry-over %** | Rolling avg of incomplete SP / planned SP per sprint (program-wide) | MetricSnapshot (program-level) |
| **Overhead %** | (Ceremony + Bug + Spike + Support hours) / Gross Hours (program-wide) | MetricSnapshot (program-level) |
| **Monthly Milestone Completion %** | Completed SP / Total SP for current month's tagged Features | ADO Features tagged with monthly goals |
| **Quarterly Milestone Progress** | Roll-up of all monthly milestones within the current quarter | Aggregated monthly milestone data |

### Deliverables

- [ ] Mantine page layout with program summary header section
- [ ] Metric cards for each program-level KPI with RAG color coding
- [ ] Monthly milestone completion % display (current month)
- [ ] Quarterly milestone progress roll-up
- [ ] Data fetching from existing `GET /api/metrics` endpoint
- [ ] End-to-end validation against known sprint data

### Open Questions (to resolve during spec)

- Program summary card layout (single row of KPI cards? summary panel?)
- RAG thresholds for monthly milestone % (what's Green vs. Amber vs. Red?)

---

## Phase 1C: Workstream Velocity Section

**Status:** Not started
**Goal:** Per-workstream velocity, velocity rate, and carry-over with trend visualization and current-sprint prediction.
**Effort:** M–L

### Metrics Per Workstream Per Sprint

| Metric | Calculation | Notes |
|---|---|---|
| **Velocity** | SP completed (Done-like states) in sprint | Trend visualization across rolling window |
| **Velocity Rate** | SP completed / net capacity hours | Efficiency signal |
| **Carry-over %** | Incomplete SP / planned SP | Overcommitment signal |
| **Rolling Averages** | 5-sprint rolling avg for each metric above | Trend context, smooths outliers |

### Current Sprint Prediction

For the in-progress sprint (not yet completed):
- **Predicted Velocity** = Average Velocity Rate × Net Hours available in current sprint
- **Predicted Carry-over** = Historical carry-over rate applied to current sprint's planned scope
- Visually distinguished from actuals (e.g., dashed line, different shading)

### Deliverables

- [ ] Per-workstream velocity cards/panels
- [ ] Sprint-over-sprint trend visualization (bar or line chart)
- [ ] Velocity rate and carry-over % per workstream per sprint
- [ ] Rolling average overlays on trend charts
- [ ] Current-sprint prediction engine (avg velocity rate × available hours)
- [ ] Current-sprint prediction display (visually distinct from actuals)

### Open Questions (to resolve during spec)

- Chart type: bar chart with trend line overlay vs. pure line chart
- How many sprints in the visible rolling window (5? all available?)
- Workstream layout: accordion panels, tabs, or stacked cards

---

## Phase 1D: Workstream Overhead Section

**Status:** Not started
**Goal:** Per-workstream overhead breakdown with composition view and individual bug/support item detail.
**Effort:** M

### Overhead Composition Breakdown

Per workstream, per sprint:

| Component | Source | Calculation |
|---|---|---|
| **Ceremony Hours** | 10.25 hrs/FTE/sprint, prorated for PTO | SprintWorkstream.ceremonyHours |
| **Bug Hours** | CompletedWork (fallback: OriginalEstimate) | ADO Bug work items |
| **Support Hours** | CompletedWork (fallback: OriginalEstimate) | ADO Support work items |
| **Spike Hours** | StoryPoints × 1 (1 point = 1 hour) | ADO Spike work items |
| **Overhead %** | (Ceremony + Bug + Spike + Support) / Gross Hours × 100 | Calculated |

### Item-Level Detail

For bugs and support items within each workstream:
- **Title** — Work item title from ADO
- **Hours** — CompletedWork or OriginalEstimate
- **Status** — Current ADO state
- Filterable/sortable by sprint

### Deliverables

- [ ] Per-workstream overhead % with RAG color coding
- [ ] Composition breakdown visualization (stacked bar or donut showing ceremony/bug/support/spike proportions)
- [ ] Bug item listing table (title, hours, status) per workstream
- [ ] Support item listing table (title, hours, status) per workstream
- [ ] Sprint filtering for item-level detail
- [ ] API additions if needed for item-level bug/support queries

### Open Questions (to resolve during spec)

- Composition chart type: stacked bar across sprints vs. donut for current sprint
- Should spike items also be listed individually, or just hours?
- Item listing pagination/limits for workstreams with many bugs

---

## Phase 1E: Workstream Milestones Section

**Status:** Not started
**Goal:** Monthly goal tracking per workstream — Features tagged in ADO with monthly targets, tracked by child story point completion.
**Effort:** M–L

### Monthly Goal Model

- ADO **Features** are tagged with monthly goal identifiers (e.g., `Feb-Goal`, `Mar-Goal`)
- Child **User Stories** and their **story points** are the unit of progress
- **% Complete** = Completed SP / Total SP for child stories under the tagged Feature
- Target date = end of the tagged month
- Total SP is a living number — stories may be added mid-month

### Per-Workstream Display

- List of Features tagged as monthly goals for the workstream
- Per Feature: title, total SP, completed SP, % complete
- Visual progress indicator (burnup chart or percentage bar — TBD)
- Monthly grouping: current month goals highlighted, prior months shown as historical

### Program-Level Roll-Up (feeds Phase 1B)

- **Monthly Milestone Completion %**: aggregate % across all workstreams for current month
- **Quarterly Milestone Progress**: how many monthly milestones are on track / complete within the quarter

### Deliverables

- [ ] ADO sync enhancement: fetch Features with monthly goal tags and their child story relationships
- [ ] Milestone % complete calculation (completed SP / total SP per tagged Feature)
- [ ] Per-workstream milestone display with progress indicators
- [ ] Monthly grouping with current month highlighted
- [ ] Program-level monthly/quarterly milestone aggregation (feeds Program Summary)
- [ ] API endpoint for milestone data (`GET /api/milestones` or extension of metrics API)
- [ ] Visual progress representation (burnup vs. percentage bar — decided during spec)

### Open Questions (to resolve during spec)

- Exact tag format for monthly goals (e.g., `Feb-Goal`, `2026-02`, custom field?)
- How to handle Features that span multiple months
- Burnup chart vs. percentage bar vs. both
- What "on track" means for quarterly roll-up (> X% complete by end of month?)

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

- [ ] pptxgenjs integration and slide template design
- [ ] Program Summary slide generation
- [ ] Workstream Velocity slides with embedded chart images or table representations
- [ ] Workstream Overhead slides with composition breakdown and item highlights
- [ ] Workstream Milestone slides with progress indicators
- [ ] One-click export trigger from dashboard UI
- [ ] Exported file naming convention (e.g., `LiveLink-Health-Report-2026-02-18.pptx`)

### Open Questions (to resolve during spec)

- Chart rendering for slides (server-side chart image generation vs. pptxgenjs native charts)
- Slide template branding/styling
- Which item-level details make it to slides vs. dashboard-only

---

## Phase 1 Overall Success Criteria

- ADO data for all workstreams fetched and stored reliably
- Core sprint metrics calculated correctly (validated against 1 known sprint)
- All 4 report sections display accurate, RAG-coded data
- Current-sprint velocity prediction matches expected calculation
- Monthly goal milestones tracked from ADO Feature tags
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

- [ ] **VTT transcript upload** — Upload interface for ceremony transcripts `[Effort: S]`
- [ ] **LLM insight extraction** — Risks, blockers, dependencies, themes, sentiment `[Effort: L]`
- [ ] **Ceremony insight display** — Integrated into workstream cards and program summary `[Effort: M]`
- [ ] **Advanced metrics** — Aging WIP, scope creep index `[Effort: M]`
- [ ] **Historical trend charts** — Expanded sparklines and charts for metric trends over sprints `[Effort: M]`

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

- [ ] **Automated transcript pipeline** — Reduce manual VTT download/upload `[Effort: XL]`
- [ ] **Cross-team dependency graph** — Visual map of inter-workstream dependencies `[Effort: L]`
- [ ] **Stakeholder-specific views** — PO vs. Director vs. Senior Director slide templates `[Effort: M]`
- [ ] **Report scheduling** — Automated weekly report generation trigger `[Effort: M]`
- [ ] **Predictive insights** — Sprint completion forecasting based on velocity trends `[Effort: L]`

### Market Position

- Replaces all manual reporting for Unified LiveLink program health
- Potential template for other Medtronic programs if successful

---

## Effort Sizing

| Size | Duration | Example |
|---|---|---|
| **XS** | 1-2 hours | Hardcoded config, simple UI tweaks |
| **S** | 3-5 hours | Upload form, simple chart, data display |
| **M** | 1-2 days | Metric engine, dashboard layout, export logic |
| **L** | 3-5 days | ADO integration, LLM processing pipeline |
| **XL** | 1+ weeks | Automated transcript pipeline, major integrations |

## Build Order & Critical Path

```
Phase 1A (Done) ──► Phase 1B (Program Summary) ──► Phase 1F (PowerPoint Export)
                          │
                          ├──► Phase 1C (Workstream Velocity)
                          │
                          ├──► Phase 1D (Workstream Overhead)
                          │
                          └──► Phase 1E (Workstream Milestones) ──► feeds back to 1B
```

**Critical path:** 1B establishes the page structure. 1C/1D/1E can be built in parallel once the layout is set. 1E feeds milestone data back into 1B's program summary. 1F (PowerPoint) comes last since it exports whatever the dashboard shows.

**Next immediate action:** Spec out Phase 1B (Program Summary) in detail, then build.
