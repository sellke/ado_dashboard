# Story 3: Expose Configurable Cycle-Time Metrics

> **Status:** Completed ✅
> **Priority:** Medium
> **Dependencies:** Stories 1 and 2

## User Story

As a dashboard operator, I want cycle-time metrics to respect the configured rolling window and appear in the metrics API so that the dashboard can display them consistently with other health signals.

## Acceptance Criteria

- Given metric configuration defines a valid cycle-time rolling window, when `GET /api/metrics` runs, then program and workstream cycle-time data use that window.
- Given configuration is missing or invalid, when metrics load, then default behavior is used or validation rejects the bad value without crashing the dashboard.
- Given no completed cycle-time items exist in the window, when the API responds, then cycle-time averages are `null` and unavailable counts are preserved.
- Given existing dashboard consumers call `GET /api/metrics`, when cycle-time fields are added, then the response remains backward-compatible.

## Implementation Tasks

- [x] Extend the metric configuration model/API patterns to include cycle-time rolling-window settings.
- [x] Add validation for positive integer window values and supported interpretation.
- [x] Load cycle-time configuration in the metrics API or shared config loader.
- [x] Query work items for the configured done-date window and selected dashboard scope.
- [x] Add cycle-time data to workstream and program API payloads additively.
- [x] Add API tests for default config, configured window, empty data, unavailable counts, and backward-compatible response shape.
- [x] Confirm existing metric configuration tests still pass.

## Technical Notes

- Prefer reusing the completed metric configuration surface rather than introducing a separate cycle-time settings page.
- The configured window should align with existing sprint-window semantics where possible.
- Keep config parsing and validation separate from calculator math.

## Definition of Done

- [x] Cycle-time window is configurable through existing metric config patterns.
- [x] Metrics API returns cycle-time data for program and workstreams.
- [x] Empty and unavailable cases are represented without API failures.
- [x] Existing metrics API behavior is preserved.

## Context for Agents

- See `spec.md` -> `### Configuration` and `### API`.
- Relevant files: `app/api/metrics/route.ts`, `lib/metrics/config-loader.ts`, `lib/metrics/types.ts`, metric config routes and tests.
- Cross-spec reference: `.writ/specs/2026-05-28-metric-calculation-config-ui/spec.md`.

---

## What Was Built

**Implementation Date:** 2026-06-15

### Files Created

1. **`prisma/migrations/20260615210000_add_cycle_time_config/migration.sql`**
   - Adds `cycleTimeRollingWindow` to the metric engine configuration table.

### Files Modified

- **`prisma/schema.prisma`**
  - Added `cycleTimeRollingWindow` to `MetricEngineConfig`.
- **`lib/metrics/types.ts`**
  - Added the cycle-time rolling window to `MetricEngineConfigInput` and defaults.
- **`lib/metrics/config-loader.ts`**
  - Loads and defaults positive rolling-window values, including cycle-time configuration.
- **`lib/metrics/config-validation.ts`**
  - Validates `cycleTimeRollingWindow` as a positive integer.
- **`app/api/metric-config/engine/route.ts`**
  - Persists the cycle-time window and defaults it for legacy engine payloads.
- **`app/api/metrics/route.ts`**
  - Queries scoped cycle-time work items for the configured done-date window and adds additive program/workstream cycle-time payloads plus window metadata.
- **`components/Dashboard/MetricConfigPanel.tsx`**
  - Exposes the cycle-time rolling window through the existing metric configuration panel.
- **Tests**
  - Added config, API, and panel coverage for default/configured windows, validation, unavailable counts, done-state guarding, and backward-compatible engine payloads.

### Implementation Decisions

1. **Separate cycle-time window** — Added `cycleTimeRollingWindow` rather than overloading velocity trend `rollingWindow`, while defaulting both to four sprints.
2. **Sprint-window interpretation** — The API converts the configured sprint count into an inclusive date window from the oldest selected sprint start through the selected sprint end.
3. **Done-state guard for missing closed dates** — Items without `adoClosedDate` are counted unavailable only when they are already in a done-like state inside the configured sprint window.
4. **Additive API shape** — Existing metrics remain unchanged; cycle-time data is added as `cycleTime` on program and workstream payloads.

### Test Results

**Verification:** `pnpm run typecheck`; focused Story 3 Jest suites
- ✅ TypeScript typecheck passed.
- ✅ API/config/panel suites passed: 68/68 tests.
- ✅ Prisma generate passed and local migration deploy applied `20260615210000_add_cycle_time_config`.

### Review Outcome

**Result:** PASS

- **Iteration count:** 2 review iterations
- **Drift:** Low
- **Security:** No concerns
- **Boundary Compliance:** Story 3 changes stayed within config, metrics API, config UI, schema/migration, and focused test boundaries.

### Deviations from Spec

None
