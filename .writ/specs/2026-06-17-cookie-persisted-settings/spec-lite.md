# Cookie-Persisted Dashboard Settings (Lite)

> Source: .writ/specs/2026-06-17-cookie-persisted-settings/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Move workstream scope from localStorage to HTTP cookies with one-time migration and SSR initial scope.

**Implementation Approach:**
- Add `lib/dashboard/settings-cookies.ts` for encode/decode and attribute defaults.
- Extend `workstream-scope.ts` with cookie load/save/migrate; reuse `parseDashboardWorkstreamScope`.
- Cookie-only after migration; read localStorage once, write cookie, delete localStorage key.
- `DashboardContainer`: optional `initialScopeIds` prop from SSR; client writes cookies on Save.
- Async dashboard pages read cookies via `next/headers` and pass initial scope.

**Files in Scope:**
- `lib/dashboard/settings-cookies.ts` — new cookie utilities
- `lib/dashboard/workstream-scope.ts` — cookie adapters + migration
- `components/Dashboard/DashboardContainer.tsx` — cookie wiring
- `app/dashboard/page.tsx`, `app/dashboard/streams/page.tsx` — SSR reads
- `__tests__/lib/dashboard/*.test.ts`, `__tests__/components/Dashboard/DashboardContainer.test.tsx`

**Error Handling:**
- Malformed cookie → null parse → static defaults (silent)
- Cookie write failure → in-memory scope for session (no new UI)
- Migration idempotent → skip if cookie already present

**Integration Points:**
- Extends `2026-05-27-dashboard-workstream-config-ui` persistence only
- Client still sends `workstreamIds` on API calls — no API cookie fallback

---

## For Review Agents

**Acceptance Criteria:**
1. Saved scope persists across reload via cookies, not localStorage.
2. Existing localStorage scopes migrate once then localStorage key is removed.
3. SSR passes initial scope; first paint avoids default-scope flash when cookie exists.
4. Main and streams dashboards remain namespaced separately.
5. Scoped metrics/milestones/stories/export behavior unchanged.

**Business Rules:**
- One cookie per dashboard ID: `dashboardWorkstreamScope:v1:{dashboardId}`
- Payload: `{ includedWorkstreamIds, updatedAt }`; empty set cannot be saved
- Attributes: Path=/, SameSite=Lax, Max-Age=365d, Secure in prod, not HttpOnly
- Stale ID reconciliation unchanged (client-side after workstream list loads)

**Experience Design:**
- Entry: existing Workstream Scope modal
- Happy path: Save → cookie set → reload restores scope
- Moment of truth: SSR initial scope on first paint
- Feedback: modal close + refetch (unchanged)
- Error: silent fallback to defaults on bad/missing cookie

---

## For Testing Agents

**Success Criteria:**
1. Cookie helper unit tests cover encode/decode/attributes.
2. Migration tests: localStorage→cookie, idempotent skip, invalid payload ignored.
3. Component tests prove Save/reload persistence via cookies.
4. SSR prop tests verify initialScopeIds used before client cookie read.

**Shadow Paths to Verify:**
- **Happy path:** save scope → reload → same workstreams via cookie
- **Nil input:** no cookie/localStorage → dashboard defaults
- **Empty input:** save with zero workstreams → blocked (unchanged)
- **Upstream error:** N/A for persistence layer; scope reconciliation after workstream API error unchanged

**Edge Cases:**
- localStorage exists, cookie absent → migrate once
- Both exist → cookie wins, localStorage ignored
- Main vs streams cookies isolated
- Malformed cookie JSON → defaults

**Test Strategy:**
- Unit: `settings-cookies`, cookie adapters in `workstream-scope`
- Component: `DashboardContainer` with cookie mocks + migration
- Integration: SSR page passes initialScopeIds
