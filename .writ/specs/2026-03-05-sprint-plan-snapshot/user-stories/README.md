# User Stories Overview

> **Specification:** Sprint Plan Snapshot
> **Created:** 2026-03-05
> **Status:** Planning

## Stories Summary

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | Schema and Migration | Complete | 5 | 5/5 |
| 2 | Snapshot Capture | Complete | 5 | 5/5 |
| 3 | Calculator and API | Complete | 6 | 6/6 |
| 4 | Adapter and UI | Complete | 5 | 5/5 |

**Total Progress:** 21/21 tasks (100%)

## Story Dependencies

```
Story 1 (Schema) ──► Story 2 (Capture) ──► Story 3 (Calculator + API) ──► Story 4 (UI)
```

- Story 1 has no dependencies — can start immediately
- Story 2 depends on Story 1 (needs the table to write to)
- Story 3 depends on Story 1 + 2 (needs snapshot data to calculate from)
- Story 4 depends on Story 3 (needs API changes to consume)

## Quick Links

- [Story 1: Schema and Migration](./story-1-schema-and-migration.md)
- [Story 2: Snapshot Capture](./story-2-snapshot-capture.md)
- [Story 3: Calculator and API](./story-3-calculator-and-api.md)
- [Story 4: Adapter and UI](./story-4-adapter-and-ui.md)
