---

# Story 1: Schema Migration & Calculator Breakdown

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** developer computing overhead metrics,
**I want** the MetricSnapshot to store per-category overhead hours (ceremony, bug, spike, support)
**So that** the API can return composition data for the overhead stacked bar chart without re-querying work items.

## Acceptance Criteria

- [x] Given a MetricSnapshot is upserted after compute, when the schema migration runs, then `ceremonyHours`, `bugHours`, `spikeHours`, `supportHours` columns exist and are populated ✅
- [x] Given `calculateOverhead()` is called with work items and sprint data, then the result includes `ceremonyHours`, `bugHours`, `spikeHours`, `supportHours` in addition to `overheadHours` and `overheadPercent` ✅
- [x] Given a Prisma migration is applied, then the new columns are nullable (backward compatible with existing rows) ✅
- [x] Given the orchestrator runs, then the four breakdown fields are persisted to MetricSnapshot ✅

## Implementation Tasks

- [x] 1.1 Write/update tests for `calculateOverhead()` to assert breakdown fields (`ceremonyHours`, `bugHours`, `spikeHours`, `supportHours`) are returned correctly ✅
- [x] 1.2 Extend `OverheadResult` type in `lib/metrics/types.ts` to include the four breakdown fields ✅
- [x] 1.3 Update `calculateOverhead()` in `lib/metrics/calculators.ts` to return breakdown fields in result (no logic changes — only expand return shape) ✅
- [x] 1.4 Add four nullable `Float?` columns to `MetricSnapshot` model in `prisma/schema.prisma`: `ceremonyHours`, `bugHours`, `spikeHours`, `supportHours` ✅
- [x] 1.5 Run `pnpm run db:migrate` to generate and apply the migration (name: `add_overhead_breakdown_to_metric_snapshots`) ✅
- [x] 1.6 Update `lib/metrics/snapshot.ts` to persist the four breakdown fields when upserting MetricSnapshot ✅
- [x] 1.7 Verify all existing orchestrator and calculator tests still pass with the expanded return type ✅

## Notes

- `ceremonyHours` in MetricSnapshot mirrors `SprintWorkstream.ceremonyHours` but is denormalized for fast chart queries
- The sum `ceremonyHours + bugHours + spikeHours + supportHours` should equal `overheadHours`
- No calculation logic changes — `calculateOverhead()` already computes these intermediate values; they just weren't returned
- Null columns are fine for existing snapshots; the chart handles nulls as 0

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (existing + new) — 88 tests, 0 failures ✅
- [x] Code reviewed ✅
- [x] Migration applied and verified ✅
