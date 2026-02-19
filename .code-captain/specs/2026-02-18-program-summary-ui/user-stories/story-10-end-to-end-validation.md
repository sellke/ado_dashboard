# Story 10: End-to-End Metric Validation

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Stories 8-9 (final Phase 1B dashboard layout)
> **Phase:** 1B — Program Summary UI

## User Story

**As a** program operator relying on the dashboard for stakeholder reporting
**I want to** validate that all displayed metrics are accurate against ADO source data
**So that** I can trust the dashboard output and confidently present it to leadership

## Acceptance Criteria

- [x] At least 1 completed sprint's metrics are manually verified against ADO source data ✅
- [x] Velocity values match: dashboard SP completed = ADO work items in done-like states for each workstream ✅
- [x] Overhead % calculation is verified: (ceremony + bug + spike + support) / gross hours matches expected ✅
- [x] Carry-Over % is verified: incomplete SP / planned SP matches expected ✅
- [x] Trend data across 4 sprints is spot-checked for consistency ✅
- [x] Sprint 5 prediction formula is verified: avg velocity rate × current sprint net capacity hours ✅
- [x] Program-level aggregation matches sum/weighted-average of workstream values ✅
- [x] Automated test assertions exist for core metric calculations with known inputs/outputs ✅
- [x] A validation report documenting findings is produced at `validation-report.md` ✅

## Implementation Tasks

- [x] 10.1 Identify the most recent completed sprint with full data across all workstreams; document its sprint name, date range, and expected values from ADO ✅
- [x] 10.2 Perform manual spot check: compare dashboard-displayed velocity, overhead%, carry-over% for each workstream against ADO source data; record results in validation-report.md ✅
- [x] 10.3 Write automated validation tests for metric calculators using known input fixtures: verify velocity calculation, overhead% formula, carry-over% formula, and rolling average computation produce expected outputs ✅
- [x] 10.4 Write automated tests for trend service: verify 4-sprint trend series accuracy and Sprint 5 prediction formula (avg velocity rate × net capacity hours) ✅
- [x] 10.5 Document all findings in `.code-captain/specs/2026-02-18-program-summary-ui/validation-report.md` including: sprint validated, metrics compared, discrepancies found (if any), root cause analysis, and confidence assessment ✅

## Notes

- Manual validation requires ADO access (via MCP tools) to query raw work item data for comparison
- If discrepancies are found, root cause should be traced (sync issue? calculator bug? display rounding?)
- Validation report should note any data quality issues in ADO itself (e.g., work items missing story points, incomplete state transitions)
- Automated tests should use realistic fixtures derived from actual sprint data, not synthetic toy data
- This story is the "seal of approval" for Phase 1B — it must be completed before moving to Phase 1C-1F

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Automated validation tests passing (17/17) ✅
- [x] Validation report produced and reviewed ✅
- [x] Any discrepancies found are either resolved or documented with known root cause ✅
- [x] Operator confirms confidence in dashboard accuracy ✅
