# Dashboard Workstream Config UI (Lite)

> Source: .writ/specs/2026-05-27-dashboard-workstream-config-ui/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Add a Dashboard modal for include/exclude workstream scope, persisted in browser local storage and applied to Dashboard data fetches before aggregation.

**Implementation Approach:**
- Add local storage helper for dashboard-scoped selected workstream IDs.
- Add/read all synced workstreams for modal options; do not infer options from scoped payload.
- Reuse `DashboardContainer` as scope owner; refetch metrics/milestones/stories after Save.
- Send selected IDs to APIs and filter before program aggregation/roll-ups.
- Keep static `lib/dashboard/config.ts` as default fallback when no local preference exists.

**Files in Scope:**
- `components/Dashboard/DashboardContainer.tsx` — scope state, modal action, refetch wiring.
- `components/Dashboard/WorkstreamScopeModal.tsx` — new modal UI.
- `lib/dashboard/workstream-scope.ts` — new storage/query helper.
- `app/api/metrics/route.ts`, `app/api/milestones/route.ts`, `app/api/sprints/stories/route.ts` — scoped query handling.
- `app/api/workstreams/route.ts` — likely new all-workstreams list API.

**Error Handling:**
- Workstream list load fails → modal error, active scope unchanged.
- Empty selection → Save blocked.
- Unknown stored ID → ignore stale ID; fall back only if no valid IDs remain.

**Integration Points:**
- Export uses currently scoped Dashboard state; no separate export scope.
- Preferences are browser-local and dashboard-ID namespaced (`main` vs `streams`).

---

## For Review Agents

**Acceptance Criteria:**
1. No local preference preserves current dashboard defaults.
2. Save selected workstreams, reload page, and Dashboard still uses saved scope.
3. Program summary, cards, sprint stories, milestones, and export reflect the same selected scope.
4. Excluded workstreams do not contribute to server-side program totals.
5. Cancel discards modal changes; empty selection cannot be saved.

**Business Rules:**
- No DB schema or auth/permission work.
- Workstreams keep syncing from ADO regardless of inclusion.
- Filter before aggregation; client-only filtering of aggregates is not acceptable.
- Stored selection uses workstream IDs and is namespaced by dashboard ID.

**Experience Design:**
- Entry: Dashboard action near Export/Sync.
- Happy path: open modal → toggle workstreams → Save → refetch scoped Dashboard.
- Moment of truth: totals/cards change together without ADO data edits.
- Feedback: modal closes and Dashboard refreshes; Cancel leaves state unchanged.
- Error: modal shows recoverable list-load error.

**Overlap Notes:**
- Align with report scope issue and ADP milestone filtering work.

---

## For Testing Agents

**Success Criteria:**
1. Scope helper unit tests cover parse/save/default/stale/empty cases.
2. API tests prove filtered IDs are applied before aggregation.
3. Component tests cover modal Save/Cancel, validation, reload persistence.

**Shadow Paths to Verify:**
- **Happy path:** two selected workstreams → Dashboard and export contain only those.
- **Nil input:** no local storage → static default scope.
- **Empty input:** user deselects all → Save blocked.
- **Upstream error:** workstream list API error → modal error, existing Dashboard unchanged.

**Edge Cases:**
- Stored ID deleted from DB → ignore stale ID.
- Main and Streams dashboards use separate stored scopes.
- Scope change while metrics fetch in flight → newest saved scope wins.

**Test Strategy:**
- Unit: `workstream-scope` helper and query parsing.
- API: metrics/milestones/story route scope filtering.
- Component: `DashboardContainer` + modal behavior with mocked fetch/localStorage.
