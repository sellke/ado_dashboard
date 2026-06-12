# User Stories — ADO Workstream Registry Config UI

> Spec: ../spec.md
> Status: Not Started

## Summary

| # | Story | Phase | Tasks | Status |
|---|---|---|---|---|
| 1 | [Schema, migration & seeded defaults](story-1-schema-migration-and-seed.md) | Foundation | 7 | Not Started |
| 2 | [ADO discovery API](story-2-ado-discovery-api.md) | ADO API | 6 | Not Started |
| 3 | [Workstream registry CRUD API](story-3-registry-crud-api.md) | Registry API | 8 | Not Started |
| 4 | [Registry admin UI](story-4-registry-admin-ui.md) | UI | 6 | Not Started |
| 5 | [Sync refactor & regression](story-5-sync-refactor-and-regression.md) | Sync | 7 | Not Started |

**Total:** 5 stories · 34 implementation tasks · 0% complete

## Dependencies

```
Story 1 (schema + seed)
  ├─> Story 2 (ADO discovery API)
  ├─> Story 3 (registry CRUD API)
  │     └─> Story 4 (admin UI)   [also needs Story 2]
  └─> Story 5 (sync refactor)   [needs Story 3 for stable API; can start after Story 1]
```

- **Story 1** — no dependencies; DB foundation + zero-drift seed.
- **Story 2** — needs schema; enables live pickers.
- **Story 3** — needs schema; registry CRUD + sync-config endpoints.
- **Story 4** — needs Stories 2 + 3; delivers operator-facing UI.
- **Story 5** — needs Story 1 minimum; complete after Story 3 removes reliance on hardcoded config.

## Recommended sequence

1 → 2 → 3 → 4 → 5. Stories 2 and 3 can proceed in parallel after Story 1.
Story 5 should land before or with Story 4 release so UI changes actually affect sync.

## Notes

- **Distinct from dashboard scope:** `2026-05-27-dashboard-workstream-config-ui` filters which
  synced workstreams appear on the dashboard (browser-local). This spec defines **what syncs**.
- **Settings coordination:** group Registry, Scope, and Metric Configuration under one Settings entry.
- **Delete safety:** prefer disable-sync over hard delete when data exists.

## Quick Links

- [spec.md](../spec.md)
- [spec-lite.md](../spec-lite.md)
- [database-schema.md](../sub-specs/database-schema.md)
- [api-spec.md](../sub-specs/api-spec.md)
- [technical-spec.md](../sub-specs/technical-spec.md)
- [CHANGELOG.md](../CHANGELOG.md)
