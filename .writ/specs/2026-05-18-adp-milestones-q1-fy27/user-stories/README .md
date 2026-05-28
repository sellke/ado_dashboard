# User Stories: ADP Milestones Q1 FY'27

> Spec: [spec.md](../spec.md) | Technical: [technical-spec.md](../sub-specs/technical-spec.md)

## Summary

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | [Iteration fiscal quarter parser](story-1-iteration-quarter-parser.md) | Not Started | 7 | 0/7 |
| 2 | [Milestone API fiscal filtering](story-2-milestone-api-filter.md) | Not Started | 7 | 0/7 |
| 3 | [Dashboard quarter-only views & labels](story-3-dashboard-quarter-views.md) | Not Started | 7 | 0/7 |
| 4 | [Seeds, fixtures & test alignment](story-4-seeds-tests-fixtures.md) | Not Started | 7 | 0/7 |

**Total:** 4 stories, 28 tasks, 0 complete

## Dependency Graph

```
Story 1 (parser)
    └── Story 2 (API filter)
            ├── Story 3 (dashboard UI)
            └── Story 4 (seeds/tests)
```

Stories 3 and 4 can run in parallel after Story 2 completes.

## Recommended Implementation Order

1. **Story 1** — Foundation: parse ADO iteration paths into fiscal quarter context.
2. **Story 2** — Core: filter milestones API so all consumers get Q1-only data.
3. **Story 3** + **Story 4** — Parallel: UI labels/empty states and test fixture refresh.

## Operational Prerequisite

Before validating against live ADO data: retag Features (`Q4`→`Q1`, ADP months for Q1 FY'27) and run ADO sync. See spec.md → Implementation Approach.

## Quick Links

- [Story 1: Iteration fiscal quarter parser](story-1-iteration-quarter-parser.md)
- [Story 2: Milestone API fiscal filtering](story-2-milestone-api-filter.md)
- [Story 3: Dashboard quarter-only views & labels](story-3-dashboard-quarter-views.md)
- [Story 4: Seeds, fixtures & test alignment](story-4-seeds-tests-fixtures.md)
