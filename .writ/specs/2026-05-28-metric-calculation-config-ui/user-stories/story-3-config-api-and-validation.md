# Story 3 — Config read/write API + validation

> **Status:** Not Started
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
4. **Given** valid payloads, **when** I PUT any config route, **then** rows upsert and a
   200 returns the saved state.

## Implementation Tasks

- [ ] Write API tests (GET shape, each PUT: reject invalid, persist valid)
- [ ] Add `lib/metrics/config-validation.ts` (pure validators) + unit tests
- [ ] Implement `GET /api/metric-config` using `loadMetricConfig`
- [ ] Implement `PUT /api/metric-config/thresholds` (upsert by `metricName`)
- [ ] Implement `PUT /api/metric-config/engine` (upsert singleton)
- [ ] Implement `PUT /api/metric-config/rules` (upsert by `[category, workItemType]`)
- [ ] Standardize 422 body shape `{ errors: { field, message }[] }`

## Technical Notes

See `sub-specs/api-spec.md`. Validators are shared with the UI (Story 4/5) — keep them
pure and framework-free. Follow the handler style of `app/api/metrics/route.ts`.

## Definition of Done

- [ ] All four endpoints implemented and tested
- [ ] Validation rejects every row in the Error & Rescue Map
- [ ] DB-unavailable returns 500 without corrupting active config
- [ ] ≥80% coverage; validators 100%

## Context for Agents

- Validation rules enumerated in `sub-specs/api-spec.md` → "Error & Rescue Map".
- "All types excluded for a category" is **valid** input (not 422); engine handles it.
- Reuse `loadMetricConfig` from Story 2 for GET so engine + API never diverge.
