# Cookie-Persisted Dashboard Settings

> **Status:** Complete
> **Created:** 2026-06-17
> **Owner:** @AdamSellke
> **Origin:** Promoted from issue: `.writ/issues/features/2026-06-17-cookie-persisted-settings.md`
> **Contract Locked:** yes

## Specification Contract

**Deliverable:** Migrate dashboard workstream scope persistence from `localStorage` to HTTP cookies with centralized read/write helpers, one-time migration of existing saved scopes, and server-side initial scope on page load.

**Must Include:** Cookie-based persistence that preserves all existing workstream scope behavior (dashboard namespacing, stale ID reconciliation, empty-selection rejection) while making settings readable from Next.js server components.

**Hardest Constraint:** Client-writable cookies cannot be `HttpOnly`, so parse/validate logic must be shared between client writes and server reads — no duplicate or divergent payload handling.

### Experience Design

- **Entry point:** Unchanged — user configures scope via the existing Workstream Scope modal.
- **Happy path:** User saves scope → cookie is set → reload restores the same scope without re-opening the modal.
- **Moment of truth:** First paint uses the saved scope (via SSR initial prop) instead of briefly showing default workstreams then refetching.
- **Feedback model:** Same as today — modal closes, Dashboard refetches with new scope.
- **Error experience:** Malformed/missing cookie falls back to static defaults silently (same as today's malformed localStorage behavior). Cookie write failure shows no new UI — scope still applies for the session via in-memory state.

### Business Rules

- Cookie is the sole persistence store after migration; `localStorage` is read once for migration then cleared.
- One cookie per dashboard ID, reusing the existing key pattern: `dashboardWorkstreamScope:v1:{dashboardId}`.
- Payload shape unchanged: `{ includedWorkstreamIds: string[], updatedAt: string }`.
- Cookie attributes: `Path=/`, `SameSite=Lax`, `Max-Age=365 days`, `Secure` in production.
- Not `HttpOnly` — client modal must write cookies directly.
- Empty included set cannot be saved (existing rule preserved).
- Stale workstream ID reconciliation unchanged — happens after read, not at cookie layer.
- Metric calculation config (DB-persisted) remains out of scope.

### Success Criteria

1. Saved workstream scope survives browser reload and return visits via cookies.
2. Existing localStorage scopes migrate automatically on first visit after deploy.
3. Server components can read scope from cookies and pass initial scope to `DashboardContainer`.
4. All existing workstream scope unit/component tests pass with cookie-based storage.
5. No regression in scoped API behavior (metrics, milestones, sprint stories, export).

### Scope Boundaries

**Included:**

- Cookie read/write helpers and attribute constants.
- One-time localStorage → cookie migration on dashboard load.
- `DashboardContainer` wiring to read/write cookies instead of localStorage.
- SSR initial scope on dashboard pages (`app/dashboard/page.tsx`, `app/dashboard/streams/page.tsx`).
- Test updates for cookie persistence, migration, and SSR props.

**Excluded:**

- API route cookie fallback (client already sends `workstreamIds` query params).
- New client-only settings beyond workstream scope.
- Database persistence or auth/permissions changes.
- HttpOnly cookies or server-action-only writes.

### Technical Concerns

- Cookie size is fine for workstream ID lists (well under 4KB browser limit).
- SSR initial scope requires a new optional prop on `DashboardContainer`; pages become async server components that read cookies via `next/headers`.
- Client cookie writes must encode JSON safely; reuse existing `parseDashboardWorkstreamScope` for validation.

### Recommendations

- Extend `lib/dashboard/workstream-scope.ts` with cookie load/save functions that delegate parsing to existing helpers.
- Add `lib/dashboard/settings-cookies.ts` for cookie attribute constants and low-level encode/decode.
- Defer API cookie reads — the client always sends explicit `workstreamIds` query params today.

### Cross-Spec Relationship

Extends completed spec `2026-05-27-dashboard-workstream-config-ui` — replaces its localStorage persistence layer without changing modal UI or scope semantics.

## Current State

- Workstream scope is persisted in `localStorage` via `saveDashboardWorkstreamScope` / `loadDashboardWorkstreamScope` in `lib/dashboard/workstream-scope.ts`.
- `DashboardContainer` loads scope on mount from `window.localStorage` and saves on modal Save.
- Storage helpers accept a `Storage`-like interface and are fully unit-tested.
- No cookie usage exists anywhere in the codebase.
- Dashboard pages are thin server components that render `DashboardContainer` with no initial scope props.

## Detailed Requirements

### Cookie Storage Module

Create `lib/dashboard/settings-cookies.ts` with:

- Exported cookie attribute defaults (`Path`, `SameSite`, `Max-Age`, `Secure` predicate).
- `encodeCookie(name, value, options)` and `decodeCookie(cookieHeader, name)` utilities.
- `setClientCookie(name, value)` for browser writes via `document.cookie`.
- `getServerCookie(name)` wrapper around Next.js `cookies()` from `next/headers`.

Keep domain logic in `workstream-scope.ts`:

- `loadDashboardWorkstreamScopeFromCookie(dashboardId)` — server-safe read using cookie string.
- `saveDashboardWorkstreamScopeToCookie(dashboardId, ids)` — client write.
- `migrateLocalStorageScopeToCookie(storage, dashboardId)` — read localStorage, write cookie, remove localStorage key; idempotent (no-op if cookie already exists).

### Dashboard Integration

- Replace `loadDashboardWorkstreamScope(window.localStorage, ...)` with cookie read (client: document.cookie; accept SSR initial prop when provided).
- Replace `saveDashboardWorkstreamScope(window.localStorage, ...)` with cookie write on modal Save.
- Run migration once per dashboard on mount before resolving scope.
- Add optional `initialScopeIds?: string[] | null` prop to `DashboardContainer`; when provided, use as `storedScopeIds` initial value instead of client cookie read on first render.

### SSR Initial Scope

- Convert `app/dashboard/page.tsx` and `app/dashboard/streams/page.tsx` to async server components.
- Read workstream scope cookie server-side for the respective dashboard ID.
- Pass parsed IDs (or null) as `initialScopeIds` to `DashboardContainer`.
- Do not fetch workstreams server-side — stale ID reconciliation remains client-side after workstream list loads.

### Migration Behavior

On first load after deploy:

1. If cookie exists → use cookie, skip localStorage.
2. If cookie absent and localStorage has valid scope → write cookie, delete localStorage key.
3. If both absent or invalid → fall back to static defaults (unchanged).

Migration is per dashboard ID and runs on the client (localStorage is not available server-side). SSR reads cookie only; migration completes on hydration.

## Implementation Approach

1. **Story 1:** Cookie storage contract — `settings-cookies.ts`, cookie adapters in `workstream-scope.ts`, unit tests.
2. **Story 2:** Dashboard client integration — wire `DashboardContainer` to cookies, migration on mount, update component tests.
3. **Story 3:** SSR initial scope — async pages read cookies, pass `initialScopeIds` prop.
4. **Story 4:** Regression coverage — migration edge cases, cross-dashboard isolation, SSR + client consistency.

Reuse existing parse/save validation from `workstream-scope.ts`. Do not add third-party cookie libraries — native `document.cookie` and Next.js `cookies()` are sufficient for this payload size.

## State Catalog

| State | User sees | System behavior |
|---|---|---|
| No saved preference | Default workstreams per dashboard config | Cookie absent; SSR passes null; client resolves defaults |
| Saved scope in cookie | Selected workstreams on load | Cookie read on SSR and client; scoped API fetches |
| localStorage-only (pre-migration) | Same as saved scope after first load | Client migrates to cookie, clears localStorage |
| Malformed cookie | Default workstreams | Parse returns null; silent fallback |
| Cookie write blocked | Scope applies for session | In-memory state used; no error toast (same as localStorage blocked) |
| Stale IDs in cookie | Valid subset or defaults | Existing reconciliation after workstream list loads |

## Files in Scope

- `lib/dashboard/settings-cookies.ts` — new cookie utilities
- `lib/dashboard/workstream-scope.ts` — cookie load/save/migrate adapters
- `components/Dashboard/DashboardContainer.tsx` — cookie wiring, initialScopeIds prop
- `app/dashboard/page.tsx` — SSR cookie read for main dashboard
- `app/dashboard/streams/page.tsx` — SSR cookie read for streams dashboard
- `__tests__/lib/dashboard/workstream-scope.test.ts` — extend for cookie paths
- `__tests__/lib/dashboard/settings-cookies.test.ts` — new unit tests
- `__tests__/components/Dashboard/DashboardContainer.test.tsx` — update persistence mocks
