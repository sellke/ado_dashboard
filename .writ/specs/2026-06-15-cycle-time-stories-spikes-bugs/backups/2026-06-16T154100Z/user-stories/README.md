# User Stories: Cycle Time for Stories, Spikes, and Bugs

> **Spec:** `.writ/specs/2026-06-15-cycle-time-stories-spikes-bugs/spec.md`
> **Total Stories:** 4
> **Progress:** 4/4 complete

| Story | Status | Tasks | Dependencies |
|---|---|---:|---|
| [Story 1: Sync ADO Lifecycle Dates](story-1-lifecycle-dates.md) | Completed ✅ | 7/7 | None |
| [Story 2: Calculate Cycle-Time Aggregates](story-2-cycle-time-calculators.md) | Completed ✅ | 7/7 | Story 1 |
| [Story 3: Expose Configurable Cycle-Time Metrics](story-3-api-and-config.md) | Completed ✅ | 7/7 | Stories 1 and 2 |
| [Story 4: Show Cycle Time on the Dashboard](story-4-dashboard-presentation.md) | Completed ✅ | 7/7 | Story 3 |

## Dependency Notes

Story 1 must land before calculator or API work because cycle-time math depends on real lifecycle timestamps. Story 2 can be implemented once test fixtures can include lifecycle dates. Story 3 wires the calculator into metric configuration and `GET /api/metrics`. Story 4 should wait for the API shape to stabilize so dashboard types and components do not churn.

## Quick Start

Start with Story 1 if the database and ADO sync path are not yet updated. If lifecycle fields are already present by the time implementation begins, verify the mapper and persistence tests first, then move directly into Story 2.
