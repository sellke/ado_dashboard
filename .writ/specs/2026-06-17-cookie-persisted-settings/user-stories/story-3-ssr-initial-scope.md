# Story 3: SSR Initial Scope

> **Status:** Completed ✅
> **Priority:** Normal
> **Dependencies:** Story 1

## User Story

**As a** dashboard user,
**I want** my saved workstream scope applied on the first page paint,
**So that** I do not briefly see default workstreams before the client restores my selection from cookies.

## Acceptance Criteria

1. [x] **Given** a valid workstream scope cookie exists for the main dashboard (`dashboardWorkstreamScope:v1:main`), **when** `app/dashboard/page.tsx` renders server-side, **then** parsed `includedWorkstreamIds` are passed to `DashboardContainer` as `initialScopeIds`.
2. [x] **Given** a valid workstream scope cookie exists for the streams dashboard (`dashboardWorkstreamScope:v1:streams`), **when** `app/dashboard/streams/page.tsx` renders server-side, **then** parsed IDs are passed as `initialScopeIds` without reading the main dashboard cookie.
3. [x] **Given** no cookie or a malformed/empty payload for the active dashboard, **when** either dashboard page renders server-side, **then** `initialScopeIds` is `null` and the client falls back to static defaults (same behavior as invalid localStorage today).
4. [x] **Given** SSR passes `initialScopeIds`, **when** `DashboardContainer` mounts, **then** it uses the SSR prop for initial `storedScopeIds` and does not re-read cookies on first render for scope initialization.
5. [x] **Given** either dashboard page is converted for SSR scope read, **when** the server component executes, **then** it does not fetch workstreams or metrics server-side — stale ID reconciliation remains client-side after the workstream list loads.

## Implementation Tasks

- [x] **3.1** Write page-level tests (or extend dashboard page tests) that mock `next/headers` `cookies()` and assert `DashboardContainer` receives `initialScopeIds` for valid cookies, `null` for missing/malformed cookies, and correct dashboard ID isolation (`main` vs `streams`).
- [x] **3.2** Add a server-safe scope read helper usage in both pages via Story 1's `loadDashboardWorkstreamScopeFromCookies` / `readServerCookie` — delegate parsing to existing `parseDashboardWorkstreamScope`; do not duplicate payload logic.
- [x] **3.3** Convert `app/dashboard/page.tsx` to an `async` server component: read the main dashboard scope cookie via `next/headers`, extract `includedWorkstreamIds`, pass `initialScopeIds` to `DashboardContainer` with `dashboard="main"`.
- [x] **3.4** Convert `app/dashboard/streams/page.tsx` to an `async` server component with the same pattern for `dashboard="streams"`.
- [x] **3.5** Ensure server page modules import only server-safe cookie helpers (no `document.cookie` or client-only APIs in the server bundle).
- [x] **3.6** Verify acceptance criteria: no server-side workstream fetch, malformed cookie silent fallback, and scoped first-fetch URL built from SSR-provided IDs (coordinate with Story 2 `initialScopeIds` prop if not yet merged).
- [x] **3.7** Run focused tests for dashboard pages and related cookie/scope helpers; confirm typecheck passes.

## Technical Notes

- Pages today are thin synchronous server components that render `DashboardContainer` with no scope props. This story adds the SSR read path only — cookie write, migration, and client mount reconciliation are Story 2 concerns.
- Use `cookies()` from `next/headers` in async page components. Cookie name comes from `dashboardWorkstreamScopeKey(dashboardId)` in `lib/dashboard/workstream-scope.ts`.
- SSR reads the cookie value only; migration from `localStorage` cannot run server-side. If a user has localStorage-only scope on first visit after deploy, SSR may pass `null` until Story 2 client migration completes — acceptable per spec state catalog.
- Do not fetch `GET /api/workstreams` or metrics in page components. Stale ID dropping via `resolveDashboardWorkstreamScope` stays in `DashboardContainer` after `allWorkstreams` loads.
- `initialScopeIds` prop on `DashboardContainer` is defined in the parent spec; if Story 2 is not complete, implement the page wiring against the prop contract and stub or pair with Story 2 in the same branch.
- Mock `next/headers` in Jest for page tests — `cookies()` is unavailable in the default test environment per technical spec error map.

## Context for Agents

- **Error map rows:** [Read server cookie, Parse cookie value, SSR cookie read] — from `sub-specs/technical-spec.md` → Error & Rescue Map
- **Shadow paths:** [Load on page visit] — from `sub-specs/technical-spec.md` → Shadow Paths
- **Business rules:** [One cookie per dashboard ID (`dashboardWorkstreamScope:v1:{dashboardId}`), Malformed/missing cookie falls back to static defaults silently, Stale workstream ID reconciliation unchanged (client-side after list load)] — from `spec.md` → Business Rules
- **Experience:** [Moment of truth: first paint uses saved scope via SSR initial prop, Error experience: malformed/missing cookie falls back silently] — from `spec.md` → Experience Design
- **Detailed requirements:** `spec.md` → Detailed Requirements → SSR Initial Scope
- **Traceability:** `sub-specs/technical-spec.md` → Traceability → Story 3
- **Relevant files:** `app/dashboard/page.tsx`, `app/dashboard/streams/page.tsx`, `components/Dashboard/DashboardContainer.tsx`, `lib/dashboard/workstream-scope.ts`, `lib/dashboard/settings-cookies.ts`

## Definition of Done

- [x] Both dashboard pages are async server components that read scope cookies server-side.
- [x] `initialScopeIds` is passed to `DashboardContainer` on every page render (IDs array or `null`).
- [x] Main and streams dashboards read isolated cookies; no cross-dashboard bleed.
- [x] No server-side workstream or metrics fetching added to page components.
- [x] Page and scope tests cover valid cookie, missing cookie, malformed cookie, and dashboard ID isolation.
- [x] Focused test suite and typecheck pass.

---

## What Was Built

**Implementation Date:** 2026-06-17

### Files Created

1. **`__tests__/app/dashboard/page.test.tsx`**
   - Added page-level coverage proving main and streams pages pass isolated `initialScopeIds` values to `DashboardContainer`.

### Files Modified

- **`app/dashboard/page.tsx`**
  - Converted the main dashboard page to an async server component that reads the main dashboard scope cookie.
- **`app/dashboard/streams/page.tsx`**
  - Converted the streams dashboard page to an async server component that reads the streams dashboard scope cookie.
- **`components/Dashboard/DashboardContainer.tsx`**
  - Added the shared `initialScopeIds` prop consumed by the server pages.

### Implementation Decisions

1. **Pages read through a server-safe domain helper** — The pages call `loadDashboardWorkstreamScopeFromServerCookie` and do not duplicate cookie parsing.
2. **No server data fetching was added** — Workstream reconciliation remains in `DashboardContainer` after the client workstream registry loads.

### Test Results

**Verification:** Focused dashboard page and component suites passed.
- `pnpm jest __tests__/components/Dashboard/DashboardContainer.test.tsx __tests__/app/dashboard/page.test.tsx --runInBand`

### Review Outcome

**Result:** PASS

- **Iteration count:** 1 iteration
- **Drift:** None
- **Security:** Low
- **Boundary Compliance:** Files stayed within Story 3 scope plus shared component prop contract.

### Deviations from Spec

None
