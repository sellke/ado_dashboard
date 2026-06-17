# Component Inventory

## New Component

| Component | Purpose | Owned By |
|---|---|---|
| `RollingMetricDetailModal` | Displays rolling metric summary and per-sprint rows | Story 2 |

## Existing Components to Update

| Component | Current Role | Planned Change | Owned By |
|---|---|---|---|
| `ProgramSummarySection` | Renders program metric cards and program trend charts | Add modal state and supported tile trigger, including `Avg Total Delivery/Bug` | Story 3 |
| `WorkstreamHealthCard` | Renders workstream metric rows and detail panels | Add modal state and triggers for velocity rate, overhead %, carry-over % only | Story 3 |
| `MetricDefinitionHint` | Shows metric definition tooltips | Reuse or reference in modal/trigger labels; preserve behavior | Story 2/3 |
| `RagBadge` | Shows metric RAG status and tooltip | Preserve behavior when tile trigger is added | Story 3 |

## Data and Adapter Modules

| Module | Current Role | Planned Change | Owned By |
|---|---|---|---|
| `lib/dashboard/types.ts` | Dashboard API and view-model contracts | Add modal row/display types and delivery-to-bug trend fields if needed | Story 1 |
| `lib/dashboard/adapter.ts` | API-to-view-model formatting | Build modal-ready row data and preserve tile formatting | Story 1 |
| `app/api/metrics/route.ts` | Dashboard metrics API | Additive delivery-to-bug trend data if not already available | Story 1 |

## Component States

| State | Expected UI |
|---|---|
| Populated | Summary value, rolling window label, and sprint rows render |
| Empty history | Modal explains there is not enough sprint history |
| Partial history | Modal shows available rows only |
| Null value | Affected cell displays `N/A` |
| Unsupported metric | No drilldown affordance renders |

## Scope Guards

- Program `Avg Total Delivery/Bug` is supported.
- Workstream `Delivery/Bug` is not supported in v1.
- The modal is read-only.
- No metric calculation settings are changed.
