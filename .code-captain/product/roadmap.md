# Product Roadmap — Unified LiveLink Health Report

> Based on Product Contract: 2026-02-08
> Last Updated: 2026-02-12
> Current Position: Q4 FY26, Sprint 2, Week 1

## Phase 1: MVP (Core Dashboard)

**Timeline:** Multiple sessions (in progress)
**Goal:** Replace manual report assembly with automated ADO metrics and a live dashboard with slide export.

### Success Criteria

- ADO data for all 4 workstreams fetched and stored reliably
- Core sprint metrics calculated correctly (validated against 1 known sprint)
- Dashboard displays program overview + per-workstream health cards
- PowerPoint export produces stakeholder-ready slides
- Total report generation time: < 15 minutes (vs. hours today)

### Core Features

- [x] **Database schema** — Workstreams, sprints, work items, milestones, thresholds, sync logs `[Effort: M]` ✅
- [x] **ADO data sync** — Fetch work items, iterations, capacity for all 4 workstreams `[Effort: L]` ✅
- [x] **Metric calculation engine** — Velocity, overhead%, predictability, carry-over with RAG and rolling averages `[Effort: M]` ✅
- [x] **Sprint configuration** — Hardcoded Unified LiveLink program setup (4 workstreams, team IDs, area paths) `[Effort: XS]` ✅
- [ ] **Program dashboard UI** — Summary view + workstream health cards (Mantine) `[Effort: M]`
- [ ] **Manual milestone entry** — Feature-level monthly milestones with progress tracking `[Effort: S]`
- [ ] **PowerPoint export** — Dashboard views to .pptx via pptxgenjs `[Effort: M]`

### Technical Foundation

- [x] Prisma schema with 9+ models, 7 enums, indexes, and table mappings ✅
- [x] Prisma migrations created and applied (7 migrations) ✅
- [x] Seed script with workstreams, RAG thresholds, and historical sprints ✅
- [x] Comprehensive Prisma model tests (15 test files) ✅
- [x] Boilerplate User/Post models removed, codebase cleaned up ✅
- [x] ADO sync orchestrator with per-workstream isolation and SyncLog tracking ✅
- [x] ADO client: iterations, work items, capacity fetch via MCP tools ✅
- [x] Sync API route: `POST /api/sync/ado` (Full, WorkItems, Iterations, Capacity) ✅
- [x] Metric calculators: velocity, overhead%, predictability, carry-over (pure functions) ✅
- [x] Metric orchestrator with per-workstream isolation and program aggregation ✅
- [x] RAG evaluation engine with configurable thresholds ✅
- [x] Rolling 5-sprint averages for trend context ✅
- [x] MetricSnapshot persistence for computed metrics ✅
- [x] Metrics API routes: `GET /api/metrics`, `POST /api/metrics/compute` ✅
- [x] Sync config with 4 workstreams, ADO team IDs, and area path mappings ✅
- [x] Test coverage: 27 test files (Prisma models, sync modules, metrics, API routes) ✅
- [ ] Mantine dashboard layout and components
- [ ] pptxgenjs integration for slide generation

### What Was Delivered

#### Database Schema (Feb 8–11)

Completed in 6 user stories (54/54 tasks):

1. **Program Structure Schema** — Workstream, Sprint, SprintWorkstream models with capacity tracking
2. **ADO Work Item Schema** — WorkItem model with full ADO hierarchy support and performance indexes
3. **ADP Milestone Schema** — Milestone model with status progression and workstream association
4. **Configuration & Sync Infrastructure** — ThresholdConfig (5 RAG metrics) and SyncLog models
5. **Phase 2 Transcript & Insight Schema** — Transcript and CeremonyInsight models (built ahead of Phase 2)
6. **Schema Cleanup, Seed Data & Migration** — Boilerplate removal, idempotent seed script, end-to-end validation

See [`.code-captain/specs/2026-02-08-database-schema/`](../.code-captain/specs/2026-02-08-database-schema/spec.md) for full specification and story details.

#### ADO Data Sync Engine (Feb 11–12)

Full sync pipeline from ADO to local database:

1. **Sync Orchestrator** — Creates SyncLog, processes workstreams with per-workstream isolation, tracks status and per-workstream summaries
2. **Iteration Sync** — Fetches team iterations from ADO, selects rolling 5-sprint window (current + 4 prior), upserts to Sprint table
3. **Work Item Sync** — Fetches, maps, and upserts work items per workstream with ADO field mapping (state, type, story points, effort, area path, parent/child)
4. **Capacity Sync** — Fetches team capacity per iteration, upserts SprintWorkstream capacity/ceremony hours with retry and locked-sprint skip
5. **Sync API** — `POST /api/sync/ado` supporting Full, WorkItems, Iterations, and Capacity sync types
6. **Program Config** — 4 workstreams configured: Streams, Action Tracker, Pitch Tracker, KPI Services + UCM

#### Metric Calculation Engine (Feb 12)

Complete metric pipeline from raw work items to program-level health:

1. **Pure Calculators** — Velocity (done story points), overhead% (ceremony + bugs + spikes + support / gross hours), predictability (completed / planned), carry-over (incomplete items/points rate)
2. **RAG Evaluation** — Green/Amber/Red classification against configurable thresholds per metric
3. **Rolling Averages** — 5-sprint rolling averages for trend context
4. **Snapshot Persistence** — MetricSnapshot model stores computed metrics per sprint/workstream
5. **Program Aggregation** — Weighted averages across workstreams with program-level RAG
6. **Metrics API** — `GET /api/metrics` (fetch with filtering) and `POST /api/metrics/compute` (trigger computation)

### Validation Targets

- Metric accuracy validated against at least 1 historical sprint
- Dashboard is demo-ready for next stakeholder meeting
- Exported slides are presentable without manual editing

---

## Phase 2: Qualitative Intelligence

**Timeline:** After Phase 1 core features
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
- [ ] **Advanced metrics** — Aging WIP, scope creep index, velocity rate `[Effort: M]`
- [ ] **Historical trend charts** — Sparklines and charts for metric trends over sprints `[Effort: M]`
- [ ] **Milestone burnup charts** — Cumulative progress against Q4 scope `[Effort: S]`

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
- [ ] **ADO milestone tagging** — Auto-sync milestone progress from tagged Features `[Effort: M]`
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

## Next Up

The backend is feature-complete for core metrics. The data pipeline (ADO sync -> metric calculation -> API) is fully operational. The critical path is now **frontend and export**:

1. **Dashboard UI** — Mantine-based program overview with workstream health cards consuming `GET /api/metrics`
2. **Milestone entry** — Simple UI for managing ADP Commitment milestones with status tracking
3. **Slide export** — PowerPoint generation from dashboard views via pptxgenjs
4. **End-to-end validation** — Run a live sync against ADO and validate metric accuracy against a known sprint
