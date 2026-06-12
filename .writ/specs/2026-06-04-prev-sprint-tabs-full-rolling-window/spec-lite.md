# Previous Sprint Full Rolling Window (Lite)

> Source: .writ/specs/2026-06-04-prev-sprint-tabs-full-rolling-window/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Selecting a previous sprint tab shows a full five-sprint window ending at that sprint in the velocity, bug burndown, and overhead charts, computed server-side.

**Implementation Approach:**
- API: anchor rolling-window query to the resolved sprint — `where: { startDate: { lte: sprint.startDate } }, orderBy desc, take: 5` (replaces fixed latest-5).
- `currentSprintId` resolves to `null` for past windows; use that to suppress forecast.
- `buildTrendSeries`: do NOT fall back to `rollingSprintsDesc[0]` when no live-current sprint — emit all 5 as `mode: 'actual'`, no prediction.
- `computeBugBurndown`: replace today-anchored backward reconstruction with as-of: `activeBugs(S) = createdDate <= S.end AND (open OR (resolved AND changedDate > S.end))`.
- Client: lift `activeSprintId` from `WorkstreamCardsGrid` to `DashboardContainer`; add `sprintId` to `metricsUrl`; refetch on change; omit `sprintId` for current sprint.

**Files in Scope:**
- `app/api/metrics/route.ts` — anchored window, pass `adoCreatedDate` to burndown.
- `lib/metrics/trend-service.ts` — forecast suppression + as-of burndown.
- `components/Dashboard/DashboardContainer.tsx` — own selection, refetch.
- `components/Dashboard/WorkstreamCardsGrid.tsx` — surface selected id upward.

**Error Handling:**
- Refetch failure → existing `metricsViewState === 'error'` + retry.
- Selected sprint without snapshot → "N/A" (existing graceful path).

---

## For Review Agents

**Acceptance Criteria:**
1. Selecting Sprint N (< latest) renders window [N-4 … N] in all three charts, N rightmost.
2. Current-sprint tab is byte-for-byte identical to pre-change (forecast + hollow dot intact).
3. Burndown counts are as-of each sprint, independent of today's open count.

**Business Rules:**
- Window = up to 5 sprints with `startDate <= selected.startDate`, desc; truncate if history < 5.
- Forecast/`mode: 'current'` styling only when selected == live current sprint.
- As-of open: `createdDate <= S.end AND (open OR (resolved AND changedDate > S.end))`.
- Client metrics/detail override stays idempotent (selected = top-level sprint).

**Experience Design:**
- Entry: click previous sprint tab in `SprintTabSelector`.
- Happy path: brief loading → window ending at selected sprint.
- Moment of truth: full historical context shifts to that point in time.
- Feedback: inline card re-render after refetch.
- Error: standard error view + retry.

---

## For Testing Agents

**Success Criteria:**
1. Anchored-window query returns correct 5 (or fewer) sprints for a mid-history sprintId.
2. Past-window trend series has no `mode: 'current'` entry and null/absent forecast.
3. As-of burndown matches hand-computed counts for a past sprint.

**Shadow Paths to Verify:**
- **Happy path:** past sprintId → 5 actual sprints + as-of burndown.
- **Nil input:** no sprintId → current-sprint default unchanged.
- **Empty input:** sprintId with no MetricSnapshot → "N/A", no crash.
- **Upstream error:** metrics fetch fails → error view + retry.

**Edge Cases:**
- Fewer than 5 prior sprints → truncated window, not padded.
- Selecting the live current sprint → forecast/hollow dot preserved.

**Coverage Requirements:** New code ≥80%; window + burndown paths 100%.

**Test Strategy:** Unit tests for `buildTrendSeries` gating and `computeBugBurndown` as-of; route tests for anchored window + current-sprint parity.
