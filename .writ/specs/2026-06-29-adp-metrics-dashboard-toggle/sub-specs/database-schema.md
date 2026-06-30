# Database Schema: ADP Metrics Dashboard Toggle

> Parent: `.writ/specs/2026-06-29-adp-metrics-dashboard-toggle/spec.md`
> Story: 1

## Change Summary

Add one boolean column to the existing singleton `MetricEngineConfig` table.

## Prisma Model (after)

```prisma
model MetricEngineConfig {
  id                      String   @id @default(cuid())
  key                     String   @unique @default("default")
  velocityGreenFloor      Float    @default(1.0)
  velocityAmberFloor      Float    @default(0.7)
  rollingWindow           Int      @default(4)
  cycleTimeRollingWindow  Int      @default(4)
  includeAdpMetrics       Boolean  @default(true)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  @@map("metric_engine_config")
}
```

## Migration

- Prisma migration adding `includeAdpMetrics BOOLEAN NOT NULL DEFAULT true`.
- Existing rows receive `true` via column default — no data backfill script required.

## Seed

Update `prisma/seed.ts` metric engine upsert to set `includeAdpMetrics: true` explicitly (matches `@default`).

## TypeScript Contract

```typescript
export interface MetricEngineConfigInput {
  velocityGreenFloor: number;
  velocityAmberFloor: number;
  rollingWindow: number;
  cycleTimeRollingWindow: number;
  includeAdpMetrics: boolean;
}
```

## Default Semantics

| Condition | Resolved value |
|---|---|
| Column present, `true` | ADP included |
| Column present, `false` | ADP excluded |
| Row missing | Loader returns `DEFAULT_ENGINE_CONFIG.includeAdpMetrics` (`true`) |
| Legacy DB before migration | Migration default `true` |

## Out of Scope

- New tables
- Per-dashboard or per-user columns
- Audit/history of toggle changes
