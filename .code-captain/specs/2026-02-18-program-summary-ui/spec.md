# Phase 1B: Program Summary UI — Full Specification

> Created: 2026-02-18
> Status: In Progress
> Contract Locked: Yes
> Prior Spec: [2026-02-12-program-dashboard-ui](../2026-02-12-program-dashboard-ui/spec.md) (completed, 38/38 tasks)

## Contract Summary

**Deliverable:** A comprehensive Phase 1B spec that documents the full Program Summary UI — including the already-completed dashboard foundation (stories 1-7), plus new work to remove predictability, add milestone placeholder tiles with defined RAG thresholds, rename carry-over, and validate metrics end-to-end.

**Must Include:**
- Full documentation of completed stories 1-7 as "Done" sections for traceability
- Removal of predictability metric from program summary AND workstream health cards
- Two new program summary tiles: Monthly Milestone Completion % and Quarterly Milestone Progress (visible with empty "No milestone data yet" state until Phase 1E wires real data)
- Renaming "Carry-Over Rate" to "Carry-Over %"
- Defined RAG thresholds for milestone metrics
- End-to-end validation: manual spot check + automated test assertions against most recent completed sprint

**Hardest Constraint:** Milestone tiles must be architecturally ready for Phase 1E data without requiring Program Summary refactoring — the placeholder pattern needs to cleanly accommodate future data wiring.

**Success Criteria:**
- Program Summary shows 5 metric tiles: Velocity, Overhead%, Carry-Over %, Monthly Milestone %, Quarterly Milestone Progress
- Predictability metric is fully removed from dashboard UI (program + workstream levels)
- Milestone tiles render with clear empty state and accept future data without code changes to the tile component
- At least 1 sprint's metrics are validated (manual + automated) against known ADO values

**Scope Boundaries:**
- **Included:** Full Phase 1B respec (done + new), predictability removal, milestone placeholder tiles, carry-over rename, RAG threshold definitions for milestones, E2E validation (manual + automated)
- **Excluded:** ADO Feature tag sync (Phase 1E), milestone data pipeline, workstream-level milestone breakdowns, PowerPoint export (Phase 1F)

---

## Detailed Requirements

### 1. Program Summary Tile Layout (5 Tiles)

The program summary section displays 5 metric tiles in a single row:

| Position | Tile | Value Source | RAG Source |
|----------|------|-------------|------------|
| 1 | **Average Velocity** | MetricSnapshot (program-level rolling avg) | ThresholdConfig `velocity` |
| 2 | **Overhead %** | MetricSnapshot (program-level) | ThresholdConfig `overheadPercent` |
| 3 | **Carry-Over %** | MetricSnapshot (program-level rolling avg) | ThresholdConfig `carryOverRate` |
| 4 | **Monthly Milestone Completion %** | Phase 1E (placeholder until wired) | ThresholdConfig `milestoneMonthly` |
| 5 | **Quarterly Milestone Progress** | Phase 1E (placeholder until wired) | ThresholdConfig `milestoneQuarterly` |

**Removed:** Predictability tile (removed from program summary and workstream cards).

### 2. Predictability Removal

Remove the predictability metric from all UI surfaces:
- **Program Summary:** Remove predictability metric tile
- **Workstream Health Cards:** Remove predictability row/display from each card
- **API Response:** Remove `predictability` from the API response `metrics` object (or mark as deprecated and hide in UI)
- **Adapter Layer:** Remove predictability mapping from `mapApiResponseToDashboardViewModel()`
- **Types:** Remove predictability from `DashboardViewModel`, `MetricTileViewModel`, `WorkstreamCardViewModel`

**Note:** The backend metric calculators and `MetricSnapshot` table still compute and store predictability. Only the UI consumption is removed. This preserves the data for potential future use without display.

### 3. Carry-Over Rename

Rename "Carry-Over Rate" to "Carry-Over %" across all UI surfaces:
- Program Summary tile label
- Workstream Health Card metric label
- Any tooltips or descriptions

The underlying data field names (`carryOverRate`, `carryOverRateAvg`) remain unchanged — this is a display-only rename.

### 4. Milestone Placeholder Tiles

Two new tiles in the Program Summary with empty-state behavior:

#### Monthly Milestone Completion %
- **Purpose:** Completed SP / Total SP for current month's tagged Features (program-wide)
- **Placeholder State:** Tile is visible. Value area displays "—" with subtext "No milestone data yet"
- **RAG:** Not rendered in placeholder state (gray/neutral indicator)
- **Data Contract:** `{ value: number | null, rag: RagStatus | null }`
- **Future (Phase 1E):** Value and RAG populated from ADO Feature tag data

#### Quarterly Milestone Progress
- **Purpose:** Roll-up of all monthly milestones within the current quarter
- **Placeholder State:** Tile is visible. Value area displays "—" with subtext "No milestone data yet"
- **RAG:** Not rendered in placeholder state (gray/neutral indicator)
- **Data Contract:** `{ value: number | null, rag: RagStatus | null }`
- **Future (Phase 1E):** Value and RAG populated from aggregated monthly milestone data

### 5. Milestone RAG Thresholds

Define RAG thresholds for milestone metrics in ThresholdConfig seed data:

| Metric | Green | Amber | Red |
|--------|-------|-------|-----|
| **Monthly Milestone Completion %** | ≥ 80% | 60–79% | < 60% |
| **Quarterly Milestone Progress** | ≥ 80% | 60–79% | < 60% |

These thresholds are stored as `ThresholdConfig` rows (`milestoneMonthly`, `milestoneQuarterly`) and are adjustable by the operator.

### 6. End-to-End Validation

#### Manual Spot Check
- Identify the most recent completed sprint with full data
- Compare dashboard-displayed values against ADO source data for:
  - Velocity (SP completed per workstream)
  - Overhead % (ceremony + bug + spike + support hours / gross hours)
  - Carry-Over % (incomplete SP / planned SP)
  - Trend data (4-sprint series)
  - Sprint 5 prediction calculation
- Document findings in a validation report artifact

#### Automated Validation Tests
- Write test assertions that verify metric values against known expected outputs
- Cover edge cases: missing capacity data, zero-value sprints, partial workstream data
- Tests should be repeatable and runnable as part of the test suite

---

## Completed Work Reference (Stories 1-7)

The following stories were delivered under the prior spec ([2026-02-12-program-dashboard-ui](../2026-02-12-program-dashboard-ui/spec.md)) and are documented here for Phase 1B traceability:

| Story | Title | Status | Tasks | Spec Reference |
|-------|-------|--------|-------|----------------|
| 1 | Dashboard Data Contract and Shell | Done | 5/5 | [story-1](../2026-02-12-program-dashboard-ui/user-stories/story-1-dashboard-data-contract-and-shell.md) |
| 2 | Program Summary Section | Done | 5/5 | story-2-program-summary-section.md |
| 3 | Workstream Health Cards | Done | 5/5 | [story-3](../2026-02-12-program-dashboard-ui/user-stories/story-3-workstream-health-cards.md) |
| 4 | Dashboard State Coverage and Storybook | Done | 5/5 | [story-4](../2026-02-12-program-dashboard-ui/user-stories/story-4-dashboard-state-coverage-and-storybook.md) |
| 5 | Dashboard Sync Trigger and Auto-Refresh | Done | 6/6 | [story-5](../2026-02-12-program-dashboard-ui/user-stories/story-5-dashboard-sync-trigger-and-auto-refresh.md) |
| 6 | Metric Calculation Service and Trend API | Done | 6/6 | [story-6](../2026-02-12-program-dashboard-ui/user-stories/story-6-metric-calculation-service-and-trend-api.md) |
| 7 | Trend and Bug Metrics UI Integration | Done | 6/6 | [story-7](../2026-02-12-program-dashboard-ui/user-stories/story-7-trend-and-bug-metrics-ui-integration.md) |

**Total Completed:** 38/38 tasks (100%)

These stories delivered: dashboard shell, data fetching, program summary section, workstream health cards, loading/empty/error states, Storybook coverage, sync trigger with auto-refresh, metric calculation service with trend API, and trend/bug UI integration.

---

## New Work — Story Plan

| Story | Title | Status | Dependencies | Est. Tasks |
|-------|-------|--------|-------------|-----------|
| 8 | Metric Display Adjustments (Predictability Removal + Carry-Over Rename) | Not Started | None | 6 |
| 9 | Milestone Tile Data Contract and Placeholder UI | Not Started | Story 8 (for clean tile layout) | 6 |
| 10 | End-to-End Metric Validation | Not Started | Stories 8-9 complete | 5 |

### Story 8: Metric Display Adjustments
Remove predictability metric from program summary and workstream cards. Rename "Carry-Over Rate" to "Carry-Over %" everywhere. Update API response handling, adapter layer, types, tests, and Storybook stories.

### Story 9: Milestone Tile Data Contract and Placeholder UI
Define milestone metric data contract in `lib/dashboard/types.ts`. Add milestone RAG thresholds to `ThresholdConfig` seed. Build placeholder tile components with empty-state rendering. Integrate into `ProgramSummarySection` for 5-tile layout. Update Storybook.

### Story 10: End-to-End Metric Validation
Identify most recent completed sprint. Perform manual spot check against ADO source data. Write automated validation tests. Document findings in `.code-captain/specs/2026-02-18-program-summary-ui/validation-report.md`.

---

## Implementation Approach

- **Predictability removal** is a subtractive change — remove from UI consumption layer only, preserve backend computation for potential future use
- **Carry-over rename** is display-only — underlying data field names stay the same
- **Milestone tiles** use a null-safe data contract (`value: number | null`) that Phase 1E fills in by providing values through the existing API response structure
- **Milestone RAG thresholds** are seeded into `ThresholdConfig` immediately so they're ready when data arrives
- **Validation** produces a documented artifact with both manual findings and automated test coverage
- **Backward compatibility:** Changes to the API response contract should be additive (new fields for milestones) and subtractive only in the UI layer (predictability hidden, not removed from API)
