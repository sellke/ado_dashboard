# User Stories — Testing State Workstream Metrics

> Spec: [spec.md](../spec.md) | Lite: [spec-lite.md](../spec-lite.md)

## Summary

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | [Testing Status Group — Mapping & API Layer](./story-1-testing-status-mapping-api.md) | Complete | 6 | 6/6 |
| 2 | [Testing Status Group — UI & Test Updates](./story-2-testing-ui-and-tests.md) | Complete | 6 | 6/6 |

**Total progress:** 12/12 tasks (100%)

## Dependencies

```
Story 1 (mapping/API)
  └── Story 2 (UI/tests) — requires Story 1 type extension and API mapping
```

Story 1 delivers the shared `StatusGroup` extension and API inclusion. Story 2 adds UI color, adapter ordering verification, and component tests. Story 2 will not compile until Story 1 adds `Testing` to the `StatusGroup` union.

## Recommended Implementation Order

1. **Story 1** — Low-risk data layer change with new unit tests
2. **Story 2** — UI color + test updates + regression verification

## Quick Links

- [Story 1: Testing Status Group — Mapping & API Layer](./story-1-testing-status-mapping-api.md)
- [Story 2: Testing Status Group — UI & Test Updates](./story-2-testing-ui-and-tests.md)
- [Technical Spec](../sub-specs/technical-spec.md)
