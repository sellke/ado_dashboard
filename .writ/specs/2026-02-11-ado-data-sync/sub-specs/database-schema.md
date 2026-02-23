# Database Impact — ADO Data Sync

## Summary

No new database tables are required for MVP ADO sync. Existing schema is sufficient if sync logic maps and upserts correctly.

## Existing models used

- `Workstream`
- `Sprint`
- `SprintWorkstream`
- `WorkItem`
- `SyncLog`

## Required behavior with existing schema

- `WorkItem`:
  - Upsert by unique `adoId`
  - Update `adoRevision` and mutable fields on source change
  - Map allowed types: `Feature`, `UserStory`, `Bug`, `Spike`, `Support`
- `Sprint`:
  - Upsert from live ADO iteration metadata
  - Persist canonical ADO iteration path in `adoIterationPath`
- `SprintWorkstream`:
  - Upsert pair (`sprintId`, `workstreamId`)
  - Populate aggregated capacity values
  - Respect `capacityLocked` for manual override
- `SyncLog`:
  - Create on run start, update on completion/failure
  - Persist counts and error summary
  - `perWorkstreamSummary` (JSON): array of `{ workstreamId, status, itemsFetched, itemsCreated, itemsUpdated, error? }`

## Known schema-adjacent concern

Seeded sprint naming/path conventions differ from live ADO iteration values. This is primarily a data-alignment issue, not a schema issue.

## Optional future schema enhancements (not in scope)

- Add `isCurrentSprint` or derived flag storage if metric pipeline needs persistent tagging.
- Add `retryCount` and structured error detail fields to `SyncLog` for richer diagnostics.
