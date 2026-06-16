# Database Schema Sub-Spec

> **Parent Spec:** `.writ/specs/2026-06-15-cycle-time-stories-spikes-bugs/spec.md`
> **Stories:** 1, 2

## WorkItem Changes

Add nullable ADO lifecycle timestamps:

```prisma
model WorkItem {
  // existing fields
  adoCreatedDate   DateTime?
  adoChangedDate   DateTime?
  adoActivatedDate DateTime?
  adoClosedDate    DateTime?
  // existing fields
}
```

## Rationale

`adoCreatedDate` and `adoChangedDate` are already stored but are not accurate cycle-time boundaries. Created date measures intake age, and changed date can move for non-completion edits. Cycle time requires a start-of-work timestamp and done timestamp.

## Migration Notes

- Fields must be nullable so existing data remains valid.
- No backfill is required for v1.
- If implementation later uses ADO revision history, the same fields should be populated from derived revision timestamps.

## Indexing

Consider an index on `adoClosedDate` if metrics API queries by rolling done-date window directly from `WorkItem`.

Suggested index:

```prisma
@@index([adoClosedDate, type])
```

Do not add the index blindly if query planning or Prisma limitations suggest a different shape during implementation.

## Tests

- Prisma model test creates a work item with both lifecycle fields.
- Prisma model test verifies existing nullable behavior remains valid.
- Sync persistence test verifies mapped fields survive upsert.
