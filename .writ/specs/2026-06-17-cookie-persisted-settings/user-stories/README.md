# User Stories: Cookie-Persisted Dashboard Settings

> **Spec:** [spec.md](../spec.md)
> **Technical spec:** [technical-spec.md](../sub-specs/technical-spec.md)

## Progress Summary

| Story | Title | Status | Tasks | Priority | Dependencies |
|---|---|---|---|---|---|
| 1 | [Cookie Storage Contract](story-1-cookie-storage-contract.md) | Completed ✅ | 7/7 | High | None |
| 2 | [Dashboard Cookie Integration](story-2-dashboard-cookie-integration.md) | Completed ✅ | 7/7 | High | Story 1 |
| 3 | [SSR Initial Scope](story-3-ssr-initial-scope.md) | Completed ✅ | 7/7 | Normal | Story 1 |
| 4 | [Regression Coverage](story-4-regression-coverage.md) | Completed ✅ | 7/7 | Normal | Stories 2, 3 |

**Overall:** 28/28 tasks complete across 4 stories

## Dependency Graph

```
Story 1 (Cookie Storage Contract)
    ├── Story 2 (Dashboard Cookie Integration)
    │       └── Story 4 (Regression Coverage)
    └── Story 3 (SSR Initial Scope)
            └── Story 4 (Regression Coverage)
```

Stories 2 and 3 can run in parallel after Story 1 completes. Story 4 validates the full integration after both are done.

## Suggested Implementation Order

1. **Story 1** — Foundation: cookie helpers and workstream-scope adapters with unit tests.
2. **Stories 2 & 3** — In parallel: client cookie wiring (Story 2) and SSR page reads (Story 3). Story 2 introduces the `initialScopeIds` prop that Story 3 consumes.
3. **Story 4** — Hardening: cross-cutting regression tests for migration, isolation, and SSR consistency.

## Quick Links

- [Story 1: Cookie Storage Contract](story-1-cookie-storage-contract.md)
- [Story 2: Dashboard Cookie Integration](story-2-dashboard-cookie-integration.md)
- [Story 3: SSR Initial Scope](story-3-ssr-initial-scope.md)
- [Story 4: Regression Coverage](story-4-regression-coverage.md)
