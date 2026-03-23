# Dashboard Metrics Audit — Completion Report

> Spec: `2026-03-23-dashboard-metrics-audit`
> Completed: 2026-03-23
> Stories: 5/5 delivered

## Execution Summary

All 5 stories implemented across 3 batches, ordered by dependency and complexity:

| Batch | Stories | Status |
|-------|---------|--------|
| 1 | Story 5 (Bug page filter), Story 2 (2-column layout) | Done |
| 2 | Story 1 (Sprint-actual metrics), Story 3 (Overhead chart wiring) | Done |
| 3 | Story 4 (Milestone quarterly rework) | Done |

## Files Changed

### New Files
| File | Purpose |
|------|---------|
| `components/Dashboard/MilestoneQuarterlyPanel.tsx` | Quarterly-grouped milestone display with per-workstream progress |
| `__tests__/components/Dashboard/MilestoneQuarterlyPanel.test.tsx` | Tests for quarterly milestone panel |
| `__tests__/components/Dashboard/BugReportContainer.test.tsx` | Tests for bug page dashboard filter |

### Modified Files
| File | Changes |
|------|---------|
| `lib/dashboard/types.ts` | Added `rawOverheadPercent`, `rawCarryOverRate` to `TrendSprintViewModel`; added `MilestoneWorkstreamProgress`, `MilestoneFeatureViewModel`, `MilestoneQuarterGroup` types |
| `lib/dashboard/adapter.ts` | Mapped new sprint-actual fields; added `groupMilestonesByQuarter()` function |
| `lib/milestones/types.ts` | Added `MilestoneWorkstreamBreakdown` type |
| `app/api/milestones/route.ts` | Extended child story query with workstream info; added per-workstream breakdown computation |
| `components/Dashboard/WorkstreamHealthCard.tsx` | Uses `rawOverheadPercent`/`rawCarryOverRate` for sprint-actual display; passes `overheadComposition` to panel |
| `components/Dashboard/OverheadBreakdownPanel.tsx` | Renders `OverheadCompositionChart` alongside line chart |
| `components/Dashboard/WorkstreamCardsGrid.tsx` | Grid columns changed from `{base:1, sm:2, lg:4}` to `{base:1, lg:2}` |
| `components/Dashboard/ProgramSummarySection.tsx` | Consumes and renders `MilestoneQuarterlyPanel`; added optional props for quarterly data |
| `components/Dashboard/BugReportContainer.tsx` | Fetch URL includes `?dashboard=main` filter |

### Test Files Updated
All existing test fixtures and stories updated to include `rawOverheadPercent: null` and `rawCarryOverRate: null` fields for type compatibility. New tests added covering all 5 stories.

## Verification

| Check | Result |
|-------|--------|
| TypeScript (`tsc --noEmit`) | Clean — 0 errors |
| Unit/component tests | 649 passed, 0 new failures |
| DB integration tests | 26 pre-existing failures (DB server offline — unrelated) |
| Fixture file warning | 1 pre-existing (no tests in fixture file — unrelated) |

## Spec Drift

No drift from the approved specification. All acceptance criteria met as defined in the user stories.

## Known Pre-existing Issues

- PostgreSQL at `localhost:5433` is unreachable, causing all Prisma integration tests to fail. This is an environment issue, not caused by these changes.
- `__tests__/components/Dashboard/__fixtures__/dashboard-fixtures.ts` is picked up by Jest as a test suite but contains no tests. Consider adding a `testPathIgnorePatterns` entry for fixture directories.
