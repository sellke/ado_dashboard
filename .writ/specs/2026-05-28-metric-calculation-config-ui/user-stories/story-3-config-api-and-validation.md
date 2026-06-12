# Story 3 — Config read/write API + validation

> **Status:** Completed ✅
> **Completed:** 2026-06-12
> **Priority:** High
> **Dependencies:** Story 1

## User Story

As a **dashboard user**, I want **API endpoints to read and update metric configuration
with guardrails**, so that **the settings UI can persist valid changes and reject invalid
ones with clear messages**.

## Acceptance Criteria

1. **Given** the config exists, **when** I `GET /api/metric-config`, **then** I receive
   `{ thresholds, engine, rules }`; missing rows are filled from default constants.
2. **Given** `greenMin > greenMax`, **when** I `PUT /api/metric-config/thresholds`, **then**
   I get 422 with a field-level error and nothing is persisted.
3. **Given** `velocityAmberFloor > velocityGreenFloor` or `rollingWindow < 1`, **when** I
   `PUT /api/metric-config/engine`, **then** I get 422.
4. **Given** `deliveryToBugRatio` thresholds where the green band is not the lowest values,
   **when** I `PUT /api/metric-config/thresholds`, **then** I get 422 with a direction hint.
5. **Given** valid payloads, **when** I PUT any config route, **then** rows upsert and a
   200 returns the saved state.

## Implementation Tasks

- [x] Write API tests (GET shape, each PUT: reject invalid, persist valid)
- [x] Add `lib/metrics/config-validation.ts` (pure validators) + unit tests
- [x] Implement `GET /api/metric-config` using `loadMetricConfig`
- [x] Implement `PUT /api/metric-config/thresholds` (upsert by `metricName`)
- [x] Implement `PUT /api/metric-config/engine` (upsert singleton)
- [x] Implement `PUT /api/metric-config/rules` (upsert by `[category, workItemType]`)
- [x] Standardize 422 body shape `{ errors: { field, message }[] }`

## Technical Notes

See `sub-specs/api-spec.md`. Validators are shared with the UI (Story 4/5) — keep them
pure and framework-free. Follow the handler style of `app/api/metrics/route.ts`.

## Definition of Done

- [x] All four endpoints implemented and tested
- [x] Validation rejects every row in the Error & Rescue Map
- [x] DB-unavailable returns 500 without corrupting active config
- [x] ≥80% coverage; validators 100%

## Context for Agents

- Validation rules enumerated in `sub-specs/api-spec.md` → "Error & Rescue Map".
- "All types excluded for a category" is **valid** input (not 422); engine handles it.
- Reuse `loadMetricConfig` from Story 2 for GET so engine + API never diverge.

---

## What Was Built

**Implementation Date:** 2026-06-12

### Files Created

1. **`lib/metrics/config-validation.ts`**
   - Adds pure validators for threshold, engine, and rule payloads with standardized field errors.
2. **`app/api/metric-config/route.ts`**
   - Implements `GET /api/metric-config` using `loadMetricConfig`.
3. **`app/api/metric-config/thresholds/route.ts`**
   - Implements threshold validation and upsert-by-`metricName`.
4. **`app/api/metric-config/engine/route.ts`**
   - Implements singleton engine config validation/upsert.
5. **`app/api/metric-config/rules/route.ts`**
   - Implements category/type rule validation and upsert-by-compound key.
6. **`__tests__/lib/metrics/config-validation.test.ts`**
   - Covers validator happy paths and error cases.
7. **`__tests__/app/api/metric-config/route.test.ts`**
   - Covers GET fallback shape, each PUT happy path, 422 validation, malformed bodies, and DB errors.

### Files Modified

- **`__tests__/app/api/metrics/route.test.ts`**
  - Updated Prisma mocks for the shared config loader introduced by Stories 2/3.

### Implementation Decisions

1. **GET returns dashboard-visible thresholds** — `overheadPercent`, `carryOverRate`, and `deliveryToBugRatio` are returned for the settings panel while `loadMetricConfig` still carries all default threshold rows internally.
2. **Strict API typing for engine values** — booleans/strings are rejected instead of being coerced to numbers.
3. **Malformed payloads are 422** — null bodies and null array entries return `{ errors }` rather than falling through to route-level 500s.

### Test Results

**Verification:** `pnpm exec jest __tests__/lib/metrics/config-validation.test.ts __tests__/app/api/metric-config/route.test.ts __tests__/app/api/metrics/route.test.ts --runInBand`
- ✅ 51/51 focused tests passing
- ✅ Review pass: no remaining Story 3 findings
- ⚠️ `pnpm run typecheck` remains blocked by baseline errors in `app/api/metrics/route.ts` and `lib/sync/ado-client.ts`

### Review Outcome

**Result:** PASS

- **Iteration count:** 4 review iterations
- **Drift:** None
- **Security:** Low risk; validates payloads and avoids partial persistence on 422
- **Boundary Compliance:** Story 3 edits stayed within config API, validators, and API tests

### Deviations from Spec

None.
