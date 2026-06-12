# Database Schema — ADO Workstream Registry Config UI

> Parent: ../spec.md
> Stories: Story 1 (schema, migration, seed)

## Overview

Extend the existing `Workstream` model and add a `SyncProgramConfig` singleton. Migration is
additive. Seed reproduces today's `SYNC_CONFIG` + `prisma/seed.ts` workstream definitions.

## Extended — `Workstream`

```prisma
model Workstream {
  id          String   @id @default(cuid())
  name        String
  adoAreaPath String
  /// ADO organization (e.g. Operations-Innovation). Seeded from ADO_ORG / SYNC_CONFIG.
  adoOrg      String
  /// ADO project name or ID (e.g. Event Streaming Platform).
  adoProject  String
  /// ADO team GUID used for capacity + team-scoped API calls.
  adoTeamId   String
  /// When false, sync skips this workstream; row retained for FK integrity.
  syncEnabled Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  // ... existing relations unchanged
  @@map("workstreams")
}
```

**Migration note:** Backfill existing rows from `SYNC_CONFIG` constants in a data migration
step or seed upsert keyed on `name`.

## New — `SyncProgramConfig` (singleton)

Program-wide sync settings previously hardcoded in `SYNC_CONFIG`.

```prisma
model SyncProgramConfig {
  id                  String   @id @default(cuid())
  key                 String   @unique @default("default")
  adoOrg              String
  adoProject          String
  /// Umbrella team for shared iteration schedule (Yellow Boxers).
  iterationTeamId     String
  lookbackSprintCount Int      @default(5)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  @@map("sync_program_config")
}
```

## Seeded defaults (from current `SYNC_CONFIG`)

**SyncProgramConfig (single row):**

| Field | Value |
|---|---|
| adoOrg | from `ADO_ORG` env at seed, fallback `Operations-Innovation` |
| adoProject | `Event Streaming Platform` |
| iterationTeamId | `b30190ac-1acd-41dd-bd50-97f93be264e4` |
| lookbackSprintCount | `5` |

**Workstream rows (5):** mirror `SYNC_CONFIG.workstreams` — name, teamId, full adoAreaPath
via `buildAdoAreaPath(suffix)` logic currently in `orchestrator.ts`.

## Delete semantics

Hard DELETE on `Workstream` is only allowed when no related rows exist in:
`workItems`, `metricSnapshots`, `milestones`, `sprintWorkstreams`, etc.

API returns 409 with related counts. UI offers `syncEnabled = false` instead.

## Indexes

- Consider `@@index([syncEnabled])` if sync queries filter enabled rows frequently.
- `adoTeamId` uniqueness is **not** enforced — two workstreams could share a team in theory,
  but UI warns on duplicate teamId + project combination.
