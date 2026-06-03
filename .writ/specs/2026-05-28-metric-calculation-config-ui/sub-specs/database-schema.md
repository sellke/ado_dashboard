# Database Schema — Metric Calculation Configuration UI

> Parent: ../spec.md
> Stories: Story 1 (schema, migration, seed)

## Overview

Two new tables plus continued use of the existing `ThresholdConfig`. All three are
program-wide (no workstream/sprint foreign keys). Defaults are seeded so a fresh database
reproduces the pre-feature metric numbers exactly.

## Existing — `ThresholdConfig` (no schema change)

Already models per-metric RAG bands and is read by `assignRag`. This spec adds an edit
**API + UI** on top; the table itself is unchanged.

```prisma
model ThresholdConfig {
  id         String   @id @default(cuid())
  metricName String   @unique
  greenMin   Float
  greenMax   Float
  amberMin   Float
  amberMax   Float
  redMin     Float?
  redMax     Float?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@map("threshold_configs")
}
```

## New — `MetricEngineConfig` (singleton)

Holds the non-threshold scalar knobs: velocity RAG cutoffs and the rolling window. A
single row is expected; enforce via a fixed `key`.

```prisma
model MetricEngineConfig {
  id                  String   @id @default(cuid())
  /// Fixed singleton key; always "default".
  key                 String   @unique @default("default")
  /// Velocity RAG: Green when velocity/rollingAvg >= this ratio. Default 1.0.
  velocityGreenFloor  Float    @default(1.0)
  /// Velocity RAG: Amber when ratio >= this (and < green floor). Default 0.7.
  velocityAmberFloor  Float    @default(0.7)
  /// Number of prior sprints in the rolling-average window. Default 4.
  rollingWindow       Int      @default(4)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  @@map("metric_engine_config")
}
```

**Invariants (enforced in API + seed):** `velocityAmberFloor > 0`,
`velocityAmberFloor <= velocityGreenFloor`, `rollingWindow >= 1`.

## New — `MetricRuleConfig` (inclusion/exclusion)

One row per (metric category × work-item type) with a boolean indicating whether that type
counts toward the category. Two categories cover current behavior:

- `deliveryPoints` — feeds velocity, predictability, carry-over (point-based metrics).
- `overheadHours` — feeds overhead hours.

```prisma
enum MetricCategory {
  deliveryPoints
  overheadHours
}

model MetricRuleConfig {
  id           String         @id @default(cuid())
  category     MetricCategory
  /// Matches WorkItem.type string values (Bug, Spike, Support, UserStory, Task, ...).
  workItemType String
  included      Boolean
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  @@unique([category, workItemType])
  @@map("metric_rule_config")
}
```

### Seeded defaults (encode today's behavior)

`deliveryPoints` — included for delivery types, **excluded** for Bug/Spike (matches
`type !== 'Bug' && type !== 'Spike'`):

| workItemType | included |
|---|---|
| UserStory | true |
| Task | true |
| Feature | true |
| Bug | false |
| Spike | false |
| Support | false |

`overheadHours` — included for the types currently routed to overhead hours:

| workItemType | included |
|---|---|
| Bug | true |
| Spike | true |
| Support | true |
| UserStory | false |
| Task | false |
| Feature | false |

> Note: overhead hour *sourcing* differs by type (Bug/Support use
> `completedWork ?? originalEstimate`, Spike uses `storyPoints`). The inclusion flag only
> controls *whether* a type contributes; the per-type hour formula stays in
> `calculateOverhead`. This is called out so Story 2 doesn't over-generalize.

## Migration

- Additive only: two new tables + one enum. No changes to existing tables → no data
  backfill required for existing snapshots.
- `prisma migrate dev --name add_metric_config_tables`.
- Seed (`prisma/seed.ts`) gains `metricEngineConfigs` (single default row, upsert on
  `key`) and `metricRuleConfigs` (upsert on `[category, workItemType]`), mirroring the
  existing `thresholdConfigs` upsert pattern.
