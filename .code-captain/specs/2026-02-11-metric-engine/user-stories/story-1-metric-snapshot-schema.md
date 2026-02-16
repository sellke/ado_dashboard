# Story 1: MetricSnapshot Schema, Types & Migration

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** None (existing Prisma schema is the foundation)

## User Story

**As a** metric calculation engine
**I want to** have a MetricSnapshot database table and TypeScript type definitions
**So that** computed metrics can be persisted, typed correctly, and survive application restarts

## Acceptance Criteria

- [x] Given the Prisma schema, when `MetricSnapshot` model is added, then `pnpm run db:generate` succeeds without errors ✅
- [x] Given the new model, when `pnpm run db:migrate` is run, then the `metric_snapshots` table is created in PostgreSQL ✅
- [x] Given the model, when a snapshot is upserted for (sprintId, workstreamId), then the unique constraint prevents duplicates ✅
- [x] Given the model, when a sprint is deleted, then related snapshots are cascade-deleted ✅
- [x] Given `lib/metrics/types.ts`, when imported, then all metric interfaces and types are available for downstream modules ✅

## Implementation Tasks

- [x] 1.1 Write Prisma model tests for MetricSnapshot (create, unique constraint, cascade delete, index query) ✅
- [x] 1.2 Add MetricSnapshot model to `prisma/schema.prisma` with all fields ✅
- [x] 1.3 Add relation fields on Sprint and Workstream models (`metricSnapshots MetricSnapshot[]`) ✅
- [x] 1.4 Run `pnpm run db:migrate` to generate and apply migration ✅
- [x] 1.5 Run `pnpm run db:generate` and verify TypeScript types ✅
- [x] 1.6 Create `lib/metrics/types.ts` with all interfaces (see Notes) ✅
- [x] 1.7 Verify all model tests pass with `pnpm test` ✅

## Notes

**MetricSnapshot Prisma fields:**
- Core metrics: `velocity`, `overheadPercent`, `predictability`, `carryOverRate` (all `Float?`)
- Carry-over detail: `carryOverItems` (`Int?`), `carryOverPoints` (`Float?`)
- Planning audit: `plannedPoints`, `completedPoints`, `overheadHours`, `grossHours` (all `Float?`)
- Rolling averages: `velocityAvg`, `overheadPercentAvg`, `predictabilityAvg`, `carryOverRateAvg` (all `Float?`)
- RAG status: `velocityRag`, `overheadRag`, `predictabilityRag`, `carryOverRag` (all `String?`)
- Meta: `computedAt` (`DateTime`), `createdAt`, `updatedAt`
- Constraints: `@@unique([sprintId, workstreamId])`, `@@index([sprintId])`, `@@map("metric_snapshots")`

**Types to define in `lib/metrics/types.ts`:**
```typescript
type RagColor = 'Green' | 'Amber' | 'Red' | null;

interface MetricWithRag {
  value: number | null;
  avg: number | null;
  rag: RagColor;
}

interface WorkstreamMetrics {
  workstreamId: string;
  workstreamName: string;
  metrics: {
    velocity: MetricWithRag;
    overheadPercent: MetricWithRag;
    predictability: MetricWithRag;
    carryOverRate: MetricWithRag;
  };
  detail: {
    plannedPoints: number | null;
    completedPoints: number | null;
    carryOverItems: number | null;
    carryOverPoints: number | null;
    overheadHours: number | null;
    grossHours: number | null;
  };
}

interface ProgramMetrics {
  metrics: {
    velocity: MetricWithRag;
    overheadPercent: MetricWithRag;
    predictability: MetricWithRag;
    carryOverRate: MetricWithRag;
  };
}

interface RollingAverages {
  velocityAvg: number | null;
  overheadPercentAvg: number | null;
  predictabilityAvg: number | null;
  carryOverRateAvg: number | null;
}

interface PredictabilityResult {
  plannedPoints: number;
  completedPoints: number;
  predictability: number;
}

interface CarryOverResult {
  carryOverItems: number;
  carryOverPoints: number;
  plannedPoints: number;
  carryOverRate: number;
}

interface ComputeMetricsResult {
  sprintId: string;
  snapshotsCreated: number;
  errors: Array<{ workstreamId: string; error: string }>;
}
```

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (9/9 pass) ✅
- [x] Prisma migration applied successfully ✅
- [x] TypeScript compiles without errors ✅
