# Accurate Current Sprint (Lite)

> Source: .writ/specs/2026-06-22-accurate-current-sprint/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Persist ADO `isCurrent` on `Sprint` at sync; shared `resolveCurrentSprint()` validates flag + dates with fallbacks; all read paths use it.

**Implementation Approach:**
- Add `isCurrent Boolean @default(false)` to `Sprint`; migration only.
- New `lib/sprint/resolve-current.ts`: pure resolver + `resolveCurrentSprintId`.
- Priority: (1) valid persisted flag, (2) date-range match, (3) most recent past, (4) null.
- Stale flag: `isCurrent=true` but `endDate < now` → ignore flag.
- Sync: set `isCurrent` on winner, clear on other ingested sprints.
- Refactor `selectRollingSprints` to use resolver (fix line-75 inconsistency).

**Files in Scope:**
- `prisma/schema.prisma` — `isCurrent` field.
- `lib/sprint/resolve-current.ts` — new resolver.
- `lib/sync/iterations.ts` — persist flag, delegate resolution.
- `app/api/metrics/route.ts` — default sprint + `isCurrentSprint`.
- `app/api/sprints/stories/route.ts` — `isCurrent` on sprint list.
- `lib/metrics/snapshot.ts` — current sprint gate for plan snapshot.

**Error Handling:**
- No sprints → resolver returns `null`; existing empty API responses unchanged.
- Stale ADO flag → silent fallback (no user-facing error).
- Default sprint: resolver first; latest snapshot only if resolver null.

**Integration Points:**
- ADO `timeFrame` → `isCurrent` in `lib/sync/ado-client.ts` (unchanged mapping).
- Dashboard UI consumes API `isCurrent` / `currentSprintId` (no component changes).

---

## For Review Agents

**Acceptance Criteria:**
1. Resolver priority rules match spec (flag validated → dates → most recent past → null).
2. After sync, exactly one ingested sprint has `isCurrent=true` when a current exists.
3. `/api/metrics` without `sprintId` loads resolver current, not latest snapshot.
4. `snapshot.ts` and stories route use resolver, not inline date checks.

**Business Rules:**
- Flag valid only when `startDate <= now` and `endDate >= now`.
- Gap between sprints → most recent past sprint is current.
- Multiple date matches → prefer `isCurrent=true`, else max `startDate`.
- Instant `Date` comparison (UTC timestamps from ADO).

**Experience Design:**
- Entry: dashboard load without `sprintId`.
- Happy path: current sprint tab + badge + projected charts.
- Moment of truth: first load shows in-progress sprint.
- Feedback: correct tab/badge (no new UI).
- Error: empty state when no sprints; silent fallback on stale flags.

---

## For Testing Agents

**Success Criteria:**
1. Resolver unit tests: 100% branch coverage on priority chain.
2. Sync tests: `isCurrent` persisted and cleared correctly.
3. API tests: default sprint + response flags match resolver.
4. No regression in rolling window / tab count specs.

**Shadow Paths to Verify:**
- **Happy path:** ADO current + valid dates → that sprint wins everywhere.
- **Nil input:** `[]` sprints → `null`.
- **Empty input:** all future sprints excluded → past fallback or null.
- **Upstream error:** N/A at read path (uses DB); sync failure unchanged.

**Edge Cases:**
- Stale flag (`endDate < now`) → date match or most recent past.
- Weekend gap → most recent past sprint.
- Overlapping dates → prefer flagged sprint.
- All past, no flag → most recent past.

**Coverage Requirements:**
- Resolver module: 100%
- Sync persistence paths: 100%
- API default sprint change: integration test required

**Test Strategy:**
- Unit: `resolve-current.test.ts`, extend `iterations.test.ts`.
- API: metrics + stories route tests.
- Optional: dashboard page test for default sprint ID.
