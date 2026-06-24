# User Stories: Accurate Current Sprint

> **Spec:** [spec.md](../spec.md) | **Technical:** [technical-spec.md](../sub-specs/technical-spec.md)

## Progress Summary

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | [Resolver + Schema Contract](story-1-resolver-schema-contract.md) | Complete | 7 | 7/7 |
| 2 | [Sync Persistence](story-2-sync-persistence.md) | Complete | 7 | 7/7 |
| 3 | [API Read Paths](story-3-api-read-paths.md) | Complete | 10 | 10/10 |
| 4 | [Metrics Computation](story-4-metrics-computation.md) | Complete | 7 | 7/7 |
| 5 | [Regression Coverage](story-5-regression-coverage.md) | Complete | 9 | 9/9 |

**Overall:** 40/40 tasks complete (5/5 stories)

## Dependency Graph

```
Story 1 (Schema + Resolver)
    ├── Story 2 (Sync Persistence)
    │       └── Story 3 (API Read Paths) ──┐
    ├── Story 4 (Metrics Computation) ───┼── Story 5 (Regression Coverage)
    └── Story 3 (needs resolver from 1) ─┘
```

- **Story 1** is the foundation — no dependencies.
- **Story 2** persists `isCurrent` at sync; Story 3 benefits from populated DB flags but can use resolver with dates before Story 2 ships.
- **Story 4** can run in parallel with Story 3 after Story 1.
- **Story 5** validates end-to-end behavior after Stories 1–4.

## Recommended Implementation Order

1. Story 1 — resolver contract + migration
2. Story 2 — sync writes flags
3. Stories 3 + 4 in parallel — API and snapshot adoption
4. Story 5 — cross-layer regression lock

## Quick Links

- [Story 1: Resolver + Schema Contract](story-1-resolver-schema-contract.md)
- [Story 2: Sync Persistence](story-2-sync-persistence.md)
- [Story 3: API Read Paths](story-3-api-read-paths.md)
- [Story 4: Metrics Computation](story-4-metrics-computation.md)
- [Story 5: Regression Coverage](story-5-regression-coverage.md)
