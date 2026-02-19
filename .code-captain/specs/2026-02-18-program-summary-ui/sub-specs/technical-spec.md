# Phase 1B: Technical Specification

> Spec: .code-captain/specs/2026-02-18-program-summary-ui/spec.md

## Architecture Overview

Phase 1B builds on the completed dashboard foundation (stories 1-7). New work modifies the UI layer and data contract without changing the backend metric computation pipeline.

### Data Flow

```
ADO → Sync Engine → DB (WorkItem, Sprint, SprintWorkstream)
                          ↓
                    Metric Calculators (velocity, overhead, predictability*, carryOver)
                          ↓
                    MetricSnapshot (persisted per sprint/workstream)
                          ↓
                    GET /api/metrics (API response)
                          ↓
                    adapter.ts (maps API → DashboardViewModel)
                          ↓
                    ProgramSummarySection + WorkstreamHealthCard (render)
```

*Predictability is still computed and stored but no longer mapped to the UI view model.

## Change Impact Analysis

### Story 8: Predictability Removal + Carry-Over Rename

**Files Modified:**

| File | Change Type | Description |
|------|------------|-------------|
| `lib/dashboard/types.ts` | Modify | Remove `predictability` from `MetricTileViewModel`, `WorkstreamCardViewModel`, `DashboardViewModel` |
| `lib/dashboard/adapter.ts` | Modify | Remove predictability mapping in `mapApiResponseToDashboardViewModel()` |
| `components/Dashboard/ProgramSummarySection.tsx` | Modify | Remove predictability tile; rename carry-over label |
| `components/Dashboard/WorkstreamHealthCard.tsx` | Modify | Remove predictability row; rename carry-over label |
| `__fixtures__/dashboard-fixtures.ts` | Modify | Remove predictability from fixture data |
| `*.test.tsx` / `*.story.tsx` | Modify | Update assertions and stories |

**Risk Assessment:** Low. Subtractive UI changes with no backend impact.

### Story 9: Milestone Tile Placeholder

**Files Modified:**

| File | Change Type | Description |
|------|------------|-------------|
| `lib/dashboard/types.ts` | Modify | Add `milestoneMonthly` and `milestoneQuarterly` to program metrics types |
| `lib/dashboard/adapter.ts` | Modify | Add null-safe milestone mapping |
| `app/api/metrics/route.ts` | Modify | Extend response with `milestoneMonthly: null`, `milestoneQuarterly: null` |
| `components/Dashboard/ProgramSummarySection.tsx` | Modify | Add 2 milestone tiles to grid layout |
| `prisma/seed.ts` | Modify | Add milestone ThresholdConfig rows |
| `__fixtures__/dashboard-fixtures.ts` | Modify | Add milestone fields to fixtures |
| `*.test.tsx` / `*.story.tsx` | Modify | Add milestone tile test cases and stories |

**Risk Assessment:** Low. Additive changes with null-safe defaults.

### Story 10: E2E Validation

**Files Created:**

| File | Change Type | Description |
|------|------------|-------------|
| `__tests__/validation/metric-validation.test.ts` | New | Automated metric validation tests |
| `__tests__/validation/trend-validation.test.ts` | New | Trend and prediction validation tests |
| `.code-captain/specs/.../validation-report.md` | New | Manual validation findings document |

**Risk Assessment:** None (read-only verification + new test files).

## Data Contract Changes

### API Response Extension (Story 9)

Current `program.metrics` shape:
```typescript
{
  velocity: { value: number | null, avg: number | null, rag: RagStatus };
  overheadPercent: { value: number | null, avg: number | null, rag: RagStatus };
  predictability: { value: number | null, avg: number | null, rag: RagStatus }; // still present in API
  carryOverRate: { value: number | null, avg: number | null, rag: RagStatus };
}
```

Extended shape (additive):
```typescript
{
  // ... existing fields ...
  milestoneMonthly: { value: number | null, rag: RagStatus | null };
  milestoneQuarterly: { value: number | null, rag: RagStatus | null };
}
```

### DashboardViewModel Change (Story 8)

Removed from view model (still in API response):
- `predictability` field from program metrics tiles
- `predictability` field from workstream card metrics

Renamed (display only):
- "Carry-Over Rate" → "Carry-Over %" (field name `carryOverRate` unchanged)

## Milestone RAG Threshold Schema

```sql
-- ThresholdConfig seed additions
INSERT INTO threshold_configs (metric_name, green_min, green_max, amber_min, amber_max, red_min, red_max)
VALUES
  ('milestoneMonthly', 80, 100, 60, 79.99, 0, 59.99),
  ('milestoneQuarterly', 80, 100, 60, 79.99, 0, 59.99);
```

These will be upserted in the seed script to avoid conflicts.

## Phase 1E Integration Points

When Phase 1E is built, it will:
1. Extend the ADO sync to fetch Feature-level data with monthly goal tags
2. Compute milestone completion % from child story point completion
3. Populate `milestoneMonthly` and `milestoneQuarterly` in the API response with real values
4. The UI tiles will automatically render the data (no tile component changes needed)

The null-safe data contract ensures this is a seamless handoff.

## Testing Strategy

### Unit Tests
- Adapter: verify predictability is excluded from view model
- Adapter: verify milestone null values mapped correctly
- Adapter: verify milestone populated values mapped with RAG

### Component Tests
- ProgramSummarySection: renders 5 tiles (no predictability)
- ProgramSummarySection: milestone tiles show empty state
- ProgramSummarySection: milestone tiles show populated state with RAG
- WorkstreamHealthCard: no predictability, carry-over labeled as "%"

### Validation Tests (Story 10)
- Known-input metric calculation assertions
- Trend series accuracy
- Sprint 5 prediction formula verification
