# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

(nothing yet)

## [0.4.0] - 2026-04-17

### Added

- **PowerPoint export (Phase 1F)** — client-side `.pptx` download from the dashboard
  header. Decks include Program Summary plus per-workstream Velocity, Bug Burndown,
  Overhead, and Milestone slides. Charts are **PNG captures** of live Recharts
  components (`html-to-image` + hidden offscreen mount) so visuals match the
  dashboard. New `lib/export/` builders, `ExportControl`, shared `BugBurndownChart`,
  and tests. (PowerPoint Export spec, Stories 1–9)
- **Sprint bug burndown** — program and workstream bug trend visualization aligned
  with velocity work.
- **Velocity trend and dashboard chart refinements** — shared chart container and
  component updates for consistency.

### Changed

- **Sprint metrics: Bug and Spike excluded from velocity and point-based carry-over**
  — `calculateVelocity`, `calculateCarryOver`, and `calculatePredictability` now
  exclude `Bug` and `Spike` work items from story-point sums; overhead still
  includes bug/spike/support hours. End-to-end validation tests updated accordingly.
- **Next.js client bundle for pptxgenjs** — webpack resolves the ES build with
  `jszip`; do not alias to `pptxgen.bundle.js` (avoids `JSZip is not defined`).
  `NormalModuleReplacementPlugin` rewrites `node:*` imports for browser builds.

### Fixed

- **Sync ADO integration test** — raised Jest timeout to 60s for orchestrator-heavy
  partial-failure scenario on slower environments.

### Internal

- **ADP Milestones panel — accurate quarterly data** — fixed three-layer pipeline
  break preventing quarterly milestone data from reaching `MilestoneQuarterlyPanel`.
  `DashboardContainer` now derives `milestoneQuarterGroups` via `useMemo`;
  `DashboardShell` forwards groups, loading state, and error to `ProgramSummarySection`.
  (ADP Milestones Panel spec, Story 1)
- **ADP-MON tag filter for milestone progress** — `/api/milestones` GET handler
  now restricts progress and per-workstream breakdown to child User Stories bearing
  an `ADP-MON` tag (e.g., `ADP-MAR`). Untagged stories under Q#-tagged Features no
  longer inflate milestone completion percentages. New `hasAdpMonTag` helper in
  `lib/milestones/format.ts`.
  (ADP Milestones Panel spec, Story 2)
- Spec and verification metadata for PowerPoint Export (`spec.md` complete, spec-lite,
  user-stories README, `verification-2026-04-17.md`).

## [0.3.0] - 2026-03-23

### Added

- **Sprint-actual Overhead % and Carry-Over %** — workstream card metric
  tiles now show per-sprint actual values when a non-current sprint tab is
  selected, instead of rolling averages. New `rawOverheadPercent` and
  `rawCarryOverRate` fields on `TrendSprintViewModel` sourced from overhead
  composition data and derived carry-over calculation.
  (Story 1: sprint-actual-metrics)
- **Milestone quarterly rework** — replaced simple count-card milestone
  display with quarterly-grouped, per-Feature, per-workstream story
  breakdowns showing total count, % in progress, and % completed. New
  `MilestoneQuarterlyPanel` component, extended `/api/milestones` response
  with per-workstream breakdown, and new `groupMilestonesByQuarter()`
  adapter function. (Story 4: milestone-quarterly-rework)
- **Overhead composition stacked bar chart** — wired existing
  `OverheadCompositionChart` into `OverheadBreakdownPanel` alongside the
  trend line chart, showing ceremony/bug/spike/support hours per sprint.
  (Story 3: overhead-composition-chart)
- **Bug page dashboard filter** — `BugReportContainer` now fetches
  `/api/metrics?dashboard=main`, scoping bug data to the 4 main dashboard
  workstreams and excluding Streams.
  (Story 5: bug-page-dashboard-filter)

### Changed

- **Workstream cards 2-column layout** — grid changed from 4-column
  (`lg: 4`) to 2-column (`lg: 2`) for improved chart readability and
  reduced vertical scrolling. (Story 2: two-column-layout)

### Fixed

- Velocity trend chart colors updated for better visual clarity across
  workstreams

### Internal

- Updated Writ development workflow tooling (6 updates)
- Added Writ project config (`.writ/config.md`)
- Full spec with 5 user stories, technical sub-spec, and verification report

## [0.2.0] - 2026-03-17

### Added

- **Sprint-scoped workstream cards** — all workstream card sections now respond
  to sprint tab selection. Metrics row shows rolling averages as-of the selected
  sprint, detail block shows that sprint's actual planned/completed/carry-over
  points, and velocity chart highlights the selected sprint with a vertical
  reference line. Data is pre-loaded via enriched API trend sprints — no
  additional network requests on tab change.
  (Spec: sprint-tabs-full-workstream-data, 5 stories)
- **Milestone quarter tracking** — milestones support an optional `quarter` field
  for fiscal-quarter grouping
- **Derived milestone status** — milestone status is now automatically calculated
  from progress percentage rather than requiring manual updates

### Changed

- **Feature goal sync** — tag convention changed from `-Goal` suffixes to
  `ADP-{MON}` prefixes (e.g. `ADP-MAR`); sync now fetches all features under an
  area path and resolves child stories to sprints
- **Line chart reference lines** — `AppLineChart` now supports both vertical
  (x-axis) and horizontal (y-axis) reference lines

### Internal

- Removed 4 deprecated cursor rule files
- Expanded milestone feature sync test coverage (+500 LOC)
- Added enriched trend sprint fields to all test fixtures and story files

## [0.1.0] - 2026-03-06

Initial pre-release of the Automated Report dashboard — a Next.js application that syncs
Azure DevOps data and presents program-level engineering metrics.

### Added

- **Database schema** — Prisma-managed PostgreSQL schema covering programs, workstreams, work items, iterations, milestones, capacity, sync state, and configuration (6 stories)
- **ADO data sync** — Orchestrated ingestion of iterations, work items, and team capacity from Azure DevOps with sync trigger and auto-refresh flow (4 stories)
- **Metric calculation engine** — Velocity, carry-over, and overhead calculators with persistence layer and REST API (3 stories)
- **Program dashboard** — Main dashboard layout with data contract, program summary card, workstream cards, and sync trigger button (7 stories)
- **Program summary UI** — Top-level metric tiles, milestone progress tiles, and end-to-end validation across the summary section (10 stories)
- **Workstream milestones** — Feature goal sync from ADO, progress calculator, burnup charts, and dashboard integration (6 stories)
- **Workstream overhead** — Overhead composition chart, sprint item tables with ADO links, and overhead panel integration (6 stories)
- **Workstream velocity** — Sprint bug list and card integration for the velocity section (2 of 7 stories — remaining stories in progress)
- **Sprint plan snapshots** — Capture sprint state at sync time for historical comparison of planned vs. actual (4 stories)
- **Sprint story list with tabs** — Tabbed status filtering (In Progress, Completed, Not Started, Removed) for sprint story lists (4 stories)
- **Common sprint tab selector** — Shared sprint/tab selector component reused across workstream detail panels (3 stories)
- **Overhead sprint ADO links** — Sprint-selectable ADO links on overhead items in API, adapter, and UI layers (3 stories)
- **Manual milestone entry** — API endpoint and dashboard panel for manually entering milestones with validation and progress summary (3 stories)
- **Recharts chart library** — Migrated from @mantine/charts to Recharts with custom theme tokens, tooltip, legend, and Storybook stories (6 stories)

### Fixed

- Velocity rate and overhead percentage data pipeline producing incorrect values
- Overhead item rows misaligned with story row layout — now uses consistent split-column design with state badges and title tooltips

### Internal

- Migrated project tooling from Code Captain to Writ
- Refined review agent scope to distinguish static test completeness from runtime coverage
