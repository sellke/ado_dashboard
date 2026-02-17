# Product Mission — Unified LiveLink Health Report

> Created: 2026-02-08
> Status: Planning
> Contract Locked: ✅

## Pitch

**LiveLink Health Report** is an internal program health dashboard that helps Medtronic's Unified LiveLink leadership (POs, Directors, and Senior Directors) get a scannable, trustworthy view of program health by automating data collection from Azure DevOps, calculating sprint and capacity metrics, incorporating qualitative insights from agile ceremony transcripts, and delivering both a live dashboard and exportable PowerPoint slides — replacing hours of manual report assembly with minutes of review.

## Users

### Primary Operator

- **Scrum Master / Program Lead** (you): The person who runs the tool, triggers data syncs, uploads transcripts, reviews metrics, and exports slides for distribution.

### Report Consumers

- **Product Owners (POs):** Need workstream-level detail — feature progress, sprint health, risks affecting their backlog.
- **Directors:** Need cross-workstream view — which workstreams are on track, where are the dependencies and blockers, is Q4 going to land.
- **Senior Directors:** Need program-level summary — overall RAG status, milestone progress against quarterly commitments, escalation-worthy risks.

## The Problem

### Death by Manual Aggregation

The Unified LiveLink program currently produces weekly health reports through a painful manual process:

- **Messy ADO board**: Work item data exists but requires manual querying, filtering, and interpretation across 4 workstreams and 5 epics.
- **Disparate meeting transcripts**: Ceremony insights are locked in Teams recordings with no structured extraction.
- **Manual slides and dashboards**: Someone assembles dozens of slides by hand each week, pulling data from multiple disconnected sources.
- **Spreadsheets for milestones**: Quarterly milestone tracking lives in separate spreadsheets, disconnected from the ADO execution data.

**Impact:** Hours of toil per week, risk of stale/inaccurate data, insights lost between ceremonies, and no single source of truth for program health.

**Our Solution:** Automate ADO data collection, calculate health metrics programmatically, extract ceremony insights via AI, and present everything in a live dashboard with one-click slide export.

## Differentiators

### Quantitative + Qualitative in One View

Unlike Azure DevOps built-in dashboards or PowerBI reports, LiveLink Health Report combines hard sprint metrics (velocity, overhead, predictability) with AI-extracted qualitative insights from ceremony transcripts (risks, blockers, dependency concerns, team sentiment). No off-the-shelf tool does both.

### Purpose-Built for Program Reporting

Generic ADO dashboards show raw data. This tool calculates program-specific derived metrics (overhead%, velocity rate, sprint predictability, carry-over rate) and presents them in a stakeholder-friendly format — RAG-coded health cards, not work item tables.

### Slide-Ready Output

Directors live in PowerPoint. This tool exports dashboard views directly to `.pptx` format — no manual slide assembly, no screenshot-and-paste workflows.

## Key Features

### Core Features (MVP — Phase 1)

- **ADO Data Sync:** Automated fetch of work items, iterations, and capacity data for all 4 Unified LiveLink workstreams via ADO MCP, scoped by area paths.
- **Metric Calculation Engine:** Computes velocity (story points completed), gross/net hours, overhead% (ceremony + bug + spike + support), sprint predictability (planned vs. actual), and carry-over rate.
- **Program Dashboard:** Mantine-based UI with program-level summary and per-workstream health cards showing RAG status, key metrics, and trend indicators.
- **Manual Milestone Entry:** Feature-level monthly milestones with progress tracking, displayed as milestone burnup per workstream.
- **PowerPoint Export:** One-click export of dashboard views to `.pptx` slides for offline distribution.

### Growth Features (Phase 2)

- **Transcript Upload & LLM Processing:** Upload VTT files from Teams ceremonies (standups, scrum of scrums, sprint planning, backlog refinement). AI extracts risks, blockers, cross-team dependencies, recurring themes, and confidence/sentiment tone.
- **Advanced Metrics:** Aging WIP (stale in-progress items), scope creep index (mid-sprint additions/removals), average velocity rate (points per net hour), cross-team dependency tracker.
- **Historical Trend Charts:** Velocity, overhead%, predictability, and carry-over trends across sprints.
- **Milestone Burnup Visualization:** Cumulative progress charts against Q4 scope per workstream.

### Scale Features (Phase 3)

- **Automated Transcript Pipeline:** Reduce manual VTT download/upload through integration or scheduled processing.
- **ADO Milestone Tagging:** Tag Features in ADO as quarterly milestones, auto-syncing milestone progress from work item state.
- **Cross-Team Dependency Graph:** Visual map of inter-workstream dependencies and their health.
- **Customizable Report Templates:** Different slide layouts for PO-level vs. Director-level vs. Senior Director-level presentations.

## Program Context

### Unified LiveLink

- **Purpose:** A unified platform for aggregating, presenting (near real-time and as KPIs), and actioning against operational production line data.
- **Organization:** Operations-Innovation / Event Streaming Platform
- **Team:** Yellow Boxers
- **Sprint cadence:** 2-week sprints, all teams synchronized
- **Current position:** Sprint 1 of Q4 FY26, Week 2 starting Feb 10, 2026
- **Historical data:** 5 prior sprints available in ADO

### Workstream Structure

| Workstream | ADO Epics | Area Path | Focus |
|---|---|---|---|
| Streams | 1 | `...\LiveLink - Yellow Box\Streams` | Real-time data ingestion from production lines |
| Pitch Tracker | 1 | `...\LiveLink - Yellow Box\Pitch Tracker` | Pitch lifecycle management within shifts |
| Action Tracker | 1 | `...\LiveLink - Yellow Box\Action Tracker` | Operational actions triggered by production data |
| KPI Services | 1 | `...\LiveLink - Yellow Box\Tier Boards` | KPI aggregation dashboards |
| UCM | 1 | `...\LiveLink - Yellow Box\Unified Configuration Manager` | Shared platform configuration |

### Azure DevOps Structure

- **ADO URL:** https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform
- **Backlog:** https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_backlogs/backlog/Yellow%20Boxers/Epics
- **Hierarchy:** Epic → Feature → User Story → Task (+ Bug)
- **Area path pattern:** `Event Streaming Platform\App\LiveLink - Yellow Box\[Workstream]`
- **Access method:** ADO MCP server (installed)

## Health Metrics Model

### Sprint Execution Metrics

| Metric | Calculation | Source |
|---|---|---|
| **Velocity** | Story points in Done-like states (Resolved/Closed) assigned to sprint iteration | ADO work items |
| **Gross Hours** | Total team capacity before deductions | ADO capacity / manual |
| **Ceremony Hours** | 10.25 hrs/FTE/sprint, prorated for PTO | Calculated |
| **Bug Hours** | CompletedWork field, fallback to OriginalEstimate | ADO Bug work items |
| **Spike Hours** | StoryPoints × 1 (1 point = 1 hour) | ADO Spike work items |
| **Support Hours** | CompletedWork field, fallback to OriginalEstimate | ADO Support work items |
| **Overhead %** | (Ceremony + Bug + Spike + Support) ÷ Gross Hours × 100 | Calculated |
| **Net Hours** | Gross Hours − PTO − Ceremony Hours | Calculated |
| **Avg Velocity Rate** | Avg story points per sprint per net hour | Calculated (trend) |

### Health Assessment Metrics

| Metric | Calculation | Insight |
|---|---|---|
| **Sprint Predictability** | (Completed SP ÷ Planned SP at sprint start) × 100 | Can we trust forecasts? |
| **Carry-Over Rate** | SP planned but rolled to next sprint ÷ Total planned SP | Are we chronically overcommitting? |
| **Aging WIP** | Work items in Active/In Progress > X days | Is work getting stuck? |
| **Scope Creep Index** | Items added/removed after sprint start ÷ Original sprint scope | Is planning stable? |
| **Cross-Team Dependencies** | Items with predecessor/successor links across workstreams | Where are the coupling points? |

### Qualitative Insights (Phase 2)

| Insight Type | Source Ceremonies | Purpose |
|---|---|---|
| **Risks & Blockers** | Standups, Scrum of Scrums | Surface impediments early |
| **Cross-Team Dependencies** | Scrum of Scrums | Identify coupling and coordination needs |
| **Commitment Concerns** | Sprint Planning, Backlog Refinement | Flag scope/capacity uncertainty |
| **Recurring Themes** | All ceremonies | Detect systemic issues across meetings |
| **Sentiment / Confidence** | All ceremonies | Gauge team confidence in sprint goals |

**Note:** Retros are intentionally excluded to preserve them as a safe, off-the-record space.

## Technical Approach

- **Stack:** Next.js 15 (App Router) + Mantine 8 + Prisma 6 + PostgreSQL 16
- **Data source:** Azure DevOps via installed MCP server
- **LLM processing:** Provider-agnostic; semi-manual upload of VTT transcripts (Phase 2)
- **Slide export:** `pptxgenjs` library for PowerPoint generation
- **Deployment:** Local development server; slides distributed for offline consumption
- **Authentication:** None required (single operator, local only)
