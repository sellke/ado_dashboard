# Specification Change Log

## 2026-02-16 - Modification
**Modified by:** Manual edit (approved modification contract)
**Modification Contract:** Expand dashboard scope with sprint trend metrics (4 actual sprints + Sprint 5 velocity prediction), sprint-scoped bug metrics, and a backend metric calculation service/layer.

### Changes Made:
- Updated core specification to include trend and bug metric requirements.
- Locked formula definitions for velocity rate, net capacity, Sprint 5 velocity prediction, and sprint-scoped bug counting.
- Added Story 6 for metric-calculation service/layer and API trend extensions.
- Added Story 7 for dashboard UI integration of trend and bug metrics.
- Updated user story overview with change-request status, dependencies, and progress recalculation.
- Updated technical, API, and wireframe sub-specs to include additive trend payloads and new UI regions.
- Updated spec-lite for concise implementation context.

### Files Updated:
- `spec.md` - Expanded contract, formulas, scope, and story plan.
- `spec-lite.md` - Added trend/prediction and backend calculation context.
- `user-stories/README.md` - Added Stories 6-7 and updated dependency graph.
- `user-stories/story-6-metric-calculation-service-and-trend-api.md` - New story.
- `user-stories/story-7-trend-and-bug-metrics-ui-integration.md` - New story.
- `sub-specs/technical-spec.md` - Added calculation-service architecture and formula contracts.
- `sub-specs/api-spec.md` - Added additive trend/prediction payload requirements.
- `sub-specs/ui-wireframes.md` - Added trend/prediction layout and state notes.

### Backup Location:
`backups/20260216-164338/`

---

## 2026-02-16 - Addition
**Modified by:** Manual edit (approved modification contract)
**Modification Contract:** Add a single dashboard UI action to trigger full ADO sync and automatically refresh dashboard metrics after completion.

### Changes Made:
- Added dashboard sync-trigger requirements to core specification.
- Added Story 5 for sync-trigger and auto-refresh implementation.
- Updated user story overview status/progress and dependencies.
- Updated technical, API, and wireframe sub-specs for sync interaction behavior.
- Updated spec-lite with new integration requirements.

### Files Updated:
- `spec.md` - Added sync action and auto-refresh requirements, success criteria, and story plan update.
- `spec-lite.md` - Added compact requirements for sync trigger flow.
- `user-stories/README.md` - Added Story 5 and dependency/progress updates.
- `user-stories/story-1-dashboard-data-contract-and-shell.md` - Added linkage note to Story 5.
- `user-stories/story-4-dashboard-state-coverage-and-storybook.md` - Added state-extension note for Story 5.
- `user-stories/story-5-dashboard-sync-trigger-and-auto-refresh.md` - New story file (planned, 6 tasks).
- `sub-specs/technical-spec.md` - Added sync action handler architecture and state model additions.
- `sub-specs/api-spec.md` - Added dashboard usage contract for `POST /api/sync/ado`.
- `sub-specs/ui-wireframes.md` - Added sync control placement and sync-state wireframe notes.

### Backup Location:
`backups/20260216-072934/`

---
