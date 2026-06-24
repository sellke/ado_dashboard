# Story 3: API Read Paths

> **Status:** Not Started
> **Priority:** High
> **Dependencies:** Story 1 (Story 2 for populated `isCurrent` in DB)

## User Story

**As a** dashboard user loading metrics or sprint story tabs,
**I want** the metrics and stories APIs to identify the current sprint using the shared resolver (persisted ADO flag + validated fallbacks),
**So that** default sprint selection, `(current)` badges, projected vs actual chart modes, and `rollingWindow.currentSprintId` reflect the true active sprint — not the latest computed snapshot or a date-only guess.

## Acceptance Criteria

1. [ ] **Given** no `sprintId` query param and sprints exist with `startDate <= now`, **when** `GET /api/metrics` runs, **then** the default `sprintId` is the output of `resolveCurrentSprint` over past sprints — not `metricSnapshot` ordered by `computedAt`.
2. [ ] **Given** no `sprintId` param and the resolver returns `null` but metric snapshots exist, **when** `GET /api/metrics` runs, **then** it falls back to the latest snapshot's `sprintId` (preserves existing rescue path).
3. [ ] **Given** an explicit `sprintId` param, **when** `GET /api/metrics` runs, **then** that sprint is loaded and `isCurrentSprint` is derived by comparing the loaded sprint's id to `resolveCurrentSprint(rollingSprints, now)?.id` — not inline date-range checks.
4. [ ] **Given** a metrics response includes `rollingWindow`, **when** rolling sprints are returned, **then** `rollingWindow.currentSprintId` matches `resolveCurrentSprintId(rollingSprints, now)` at every response branch (with snapshots, without snapshots, program included).
5. [ ] **Given** sprint selects in `/api/metrics` feed the resolver, **when** queries run, **then** `isCurrent` is included in Prisma `select` clauses for sprint rows used by resolver input.
6. [ ] **Given** `GET /api/sprints/stories` returns the visible sprint tab list, **when** each sprint is mapped, **then** exactly one sprint has `isCurrent: true` when the resolver identifies a current sprint, and `isCurrent` is `sprint.id === resolveCurrentSprintId(sprints, now)` — not `startDate <= now && endDate >= now`.
7. [ ] **Given** a sprint gap (no in-range sprint), **when** either API runs, **then** the most recent past sprint is marked current per resolver rule 3 (gap handling).
8. [ ] **Given** a stale persisted `isCurrent` flag (`endDate < now`), **when** either API runs, **then** the flag is ignored and date-range or past-sprint fallback applies (Story 1 resolver behavior).

## Implementation Tasks

- [ ] **3.1** Extend `__tests__/app/api/metrics/route.test.ts` — default load uses resolver current sprint (not latest snapshot); snapshot fallback when resolver returns null; explicit `sprintId` honors param; `isCurrentSprint` and `rollingWindow.currentSprintId` follow resolver; gap and stale-flag scenarios.
- [ ] **3.2** Extend `__tests__/app/api/sprints/stories/route.test.ts` — `isCurrent` flag set via resolver; only one sprint current; gap marks most recent past; stale flag ignored.
- [ ] **3.3** In `app/api/metrics/route.ts`, import `resolveCurrentSprint` / `resolveCurrentSprintId` from `lib/sprint/resolve-current.ts`.
- [ ] **3.4** Replace default `sprintId` resolution (lines ~208–221): query sprints with `startDate <= now`, run resolver, use `current?.id`; fall back to latest `metricSnapshot` only when resolver returns null.
- [ ] **3.5** Add `isCurrent` to sprint `select` objects used for rolling window and default resolution (`rollingSprints` query and past-sprints query).
- [ ] **3.6** Replace inline `isCurrentSprint = sprint.startDate <= now && sprint.endDate >= now` with resolver comparison against `rollingSprints`.
- [ ] **3.7** Replace all inline `rollingSprints.find((s) => s.startDate <= now && s.endDate >= now)?.id` assignments (`currentRollingSprintId`, empty-snapshot branch, final payload) with `resolveCurrentSprintId(rollingSprints, now)`.
- [ ] **3.8** In `app/api/sprints/stories/route.ts`, add `isCurrent` to sprint select; compute `currentId = resolveCurrentSprintId(rollingSprints, now)` once; map `isCurrent: sprint.id === currentId`.
- [ ] **3.9** Update route file header comments to document resolver-based default sprint and `isCurrent` derivation.
- [ ] **3.10** Run focused API route tests and typecheck; confirm no changes to snapshot computation (Story 4 scope).

## Technical Notes

- **Story 1 prerequisite:** Resolver module (`lib/sprint/resolve-current.ts`) must exist with unit tests before wiring. Story 3 does not implement resolver logic.
- **Story 2 dependency for full fidelity:** Persisted `isCurrent` on `Sprint` rows is written during sync (Story 2). Until sync runs, resolver falls back to date-range and past-sprint rules — acceptable per spec; tests should cover both pre-sync (`isCurrent: false`) and post-sync flagged rows.
- **Default sprint change is the highest-impact fix:** Today `/api/metrics` defaults to `metricSnapshot.findFirst({ orderBy: { computedAt: 'desc' } })`, which can load a past sprint that was recomputed most recently. Resolver default aligns dashboard first paint with the in-progress sprint.
- **Explicit `sprintId` unchanged:** When the client passes `sprintId` (previous-sprint tab per `2026-06-04-prev-sprint-tabs`), honor the param; only compute whether that sprint is "current" via resolver comparison.
- **Rolling window query unchanged:** `rollingSprints` remains anchored at the loaded sprint's `startDate` with `ROLLING_WINDOW_DEPTH`; resolver runs over the returned set for `currentSprintId` — do not widen the query in this story.
- **Stories API scope:** Only replaces per-sprint `isCurrent` mapping; does not change `VISIBLE_SPRINT_TABS` depth or work-item grouping.
- **Out of scope:** `lib/metrics/snapshot.ts`, `lib/metrics/orchestrator.ts`, dashboard UI, and `/api/metrics/cycle-time/unavailable` — Story 4 / Story 5 unless explicitly needed for compile.

## Context for Agents

- **Error map rows:** [Metrics default sprint — no sprints in DB, Resolver null + snapshots exist, Stale isCurrent in DB] — from `sub-specs/technical-spec.md` → Error & Rescue Map
- **Shadow paths:** [Metrics default load, Stories isCurrent flag] — from `sub-specs/technical-spec.md` → Shadow Paths
- **Interaction edge cases:** [Explicit sprintId honored, Pre-migration rows isCurrent=false, Sprint gap, Stale flag after sprint end, Multiple/overlapping date ranges] — from `sub-specs/technical-spec.md` → Interaction Edge Cases
- **Business rules:** [Resolver priority (ADO flag → date range → most recent past → null), Dashboard default uses resolver not latest snapshot] — from `spec.md` → Business Rules
- **Experience:** [Moment of truth: first metrics load shows in-progress sprint; Error experience: no new UI — correct tab/badge/chart mode is the feedback] — from `spec.md` → Experience Design
- **Detailed requirements:** `spec.md` → Detailed Requirements → API Read Paths
- **Traceability:** `sub-specs/technical-spec.md` → Traceability → Story 3; API Changes → `/api/metrics`, `/api/sprints/stories`
- **Relevant files:** `app/api/metrics/route.ts`, `app/api/sprints/stories/route.ts`, `lib/sprint/resolve-current.ts`, `__tests__/app/api/metrics/route.test.ts`, `__tests__/app/api/sprints/stories/route.test.ts`

## Definition of Done

- [ ] Both API routes import and use the shared resolver; no remaining inline `startDate <= now && endDate >= now` current-sprint checks in these files.
- [ ] Default `/api/metrics` `sprintId` uses resolver with snapshot fallback only when resolver returns null.
- [ ] Sprint Prisma selects include `isCurrent` where resolver input requires it.
- [ ] API route tests cover default sprint, snapshot fallback, explicit param, `rollingWindow.currentSprintId`, stories `isCurrent`, gap, and stale-flag cases.
- [ ] Focused test suites and typecheck pass.
- [ ] No snapshot/orchestrator wiring (Story 4) or cross-layer regression suite (Story 5) in this story.
