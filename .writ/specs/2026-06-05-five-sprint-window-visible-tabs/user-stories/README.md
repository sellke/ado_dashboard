# User Stories — Visible Tabs Full Five-Sprint Window

> Spec: `.writ/specs/2026-06-05-five-sprint-window-visible-tabs/spec.md`

## Summary

| # | Story | Status | Tasks | Dependencies |
|---|---|---|---|---|
| 1 | [Centralize depth constants and ingest nine sprints](story-1-centralize-depth-and-ingest-nine.md) | Complete | 5 / 5 | None |
| 2 | [Verify and guard downstream coverage](story-2-verify-downstream-coverage.md) | Complete | 5 / 5 | Story 1 |
| 3 | [Tests, regression parity, and sync-cost sanity](story-3-tests-regression-and-sync-cost.md) | Complete | 5 / 5 | Story 1, 2 |

**Progress:** 3 / 3 stories complete · 15 / 15 tasks complete

## Dependencies

```
Story 1 (depth constants + ingest 9)
   └─> Story 2 (verify downstream coverage)
          └─> Story 3 (tests + regression + sync-cost)
```

- **Story 1** is the core lever: centralize the depth relationship and raise ingestion to 9.
- **Story 2** verifies (and guards) that work items, capacity, and metric snapshots cover the
  deeper window, plus optional constant adoption in the read routes.
- **Story 3** proves the full window end to end, protects the design with a guard test, and
  sanity-checks sync cost.

## Quick Links

- [Specification](../spec.md)
- [Lite spec (agent context)](../spec-lite.md)
- [Technical spec](../sub-specs/technical-spec.md)
- [Source issue](../../../issues/improvements/2026-06-05-five-sprint-window-visible-tabs.md)
