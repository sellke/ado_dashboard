# User Stories — Dashboard Workstream Config UI

> **Spec:** `.writ/specs/2026-05-27-dashboard-workstream-config-ui/spec.md`
> **Status:** Complete
> **Total Stories:** 4
> **Total Tasks:** 28

## Story Summary

| Story | Title | Status | Priority | Tasks | Dependencies |
|---|---|---|---|---:|---|
| 1 | [Scope Contract and Storage](story-1-scope-contract-and-storage.md) | Complete | High | 7 | None |
| 2 | [Workstream Scope Modal](story-2-workstream-scope-modal.md) | Complete | High | 7 | Story 1 |
| 3 | [Scoped Dashboard Data](story-3-scoped-dashboard-data.md) | Complete | High | 7 | Stories 1 and 2 |
| 4 | [State Coverage and Regression Tests](story-4-state-coverage-and-regression-tests.md) | Complete | Normal | 7 | Stories 1, 2, and 3 |

## Dependency Flow

Story 1 establishes the shared storage, query, and all-workstreams API contract. Story 2 builds the Dashboard modal against that contract. Story 3 propagates the saved scope through Dashboard data APIs and export-facing state. Story 4 hardens the complete feature with regression coverage for defaults, persistence, errors, in-flight fetches, and aggregate consistency.

```text
Story 1
  -> Story 2
  -> Story 3
  -> Story 4
```

## Progress

- Completed stories: 4 / 4
- Completed tasks: 28 / 28
- Next story: None — specification implemented

## Implementation Notes

- Keep browser-local persistence scoped by dashboard ID.
- Preserve existing static dashboard defaults when no valid saved scope exists.
- Filter server-side before aggregation; do not client-filter already computed program totals.
- Keep ADO sync unchanged. This feature controls report/dashboard visibility only.
