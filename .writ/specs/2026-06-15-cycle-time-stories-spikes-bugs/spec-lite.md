# Cycle Time for Stories, Spikes, and Bugs (Lite)

> Source: .writ/specs/2026-06-15-cycle-time-stories-spikes-bugs/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Configurable rolling-window cycle-time metrics for User Story, Spike, and Bug, shown at program and workstream levels, with clickable unavailable counts that open linked missing-data items.

**Implementation Approach:**
- Persist ADO lifecycle dates on `WorkItem`, preferably `adoActivatedDate` and `adoClosedDate`.
- Extend ADO field mapping before metric math; created/changed dates are not accurate enough.
- Add pure business-day calculators under `lib/metrics/`; no DB reads in calculators.
- Filter by configured rolling window using done timestamp; group by `UserStory`, `Spike`, `Bug`.
- Program averages must derive from total elapsed days / total item count, not averaged workstream averages.
- Reuse metric configuration patterns for cycle-time window settings.
- Lazy-load unavailable item details from a focused endpoint; do not grow the primary metrics payload with item lists.

**Files in Scope:**
- `prisma/schema.prisma` — lifecycle date fields and migration.
- `lib/sync/mappers.ts`, `lib/sync/work-items.ts` — ADO date extraction and persistence.
- `lib/metrics/calculators.ts` or new module — cycle-time business-day math.
- `app/api/metrics/route.ts` — additive program/workstream cycle-time fields.
- A focused unavailable cycle-time item endpoint — linked ADO item drilldown for missing lifecycle data.
- `lib/dashboard/adapter.ts`, `lib/dashboard/types.ts` — view model mapping.
- `components/Dashboard/*` — program summary and workstream-card UI.

**Error Handling:**
- Missing start/done dates -> exclude from totals/averages and increment unavailable count.
- Clicking an unavailable count -> modal lists linked ADO IDs and titles for the selected scope/type.
- No completed items in window -> display `N/A`/empty state, not misleading zero.
- ADO lifecycle fields unavailable -> isolate revision-history lookup in sync layer.

---

## For Review Agents

**Acceptance Criteria:**
1. Cycle time uses business days from Active/In Progress-like timestamp to Done-like timestamp.
2. Program and workstream outputs show total and average by User Story, Spike, Bug.
3. Missing lifecycle dates are visible as unavailable counts and do not skew averages.
4. Rolling window is configurable through existing metric config patterns.
5. API additions do not break existing dashboard consumers.
6. Unavailable count drilldown lists linked ADO items without bloating the main metrics response.

**Business Rules:**
- Done-like states: `Closed`, `Done`, `Resolved` unless type-specific ADO states require explicit mapping.
- Business-day calendar: Monday-Friday only, no holidays in v1.
- Reporting scope: configurable rolling window based on done timestamp.
- Totals: sum elapsed business days by type. Average: total / completed item count.
- Included types: `UserStory`, `Spike`, `Bug`; excluded: all others.

**Experience Design:**
- Entry: existing dashboard program summary and workstream cards.
- Happy path: compare story/spike/bug duration at program level, then by workstream.
- Moment of truth: teams see whether bug, spike, or story flow is slowest.
- Feedback: refreshes after ADO sync and metric reload.
- Error: unavailable lifecycle data shown without failing the dashboard, with drilldown to linked missing-data items.

---

## For Testing Agents

**Success Criteria:**
1. Business-day calculator covers same-day, weekend crossing, missing dates, and negative/order errors.
2. Sync mapper tests cover ActivatedDate/ClosedDate extraction and null handling.
3. API tests verify program/workstream grouping, averages, totals, and unavailable counts.
4. Component/adapter tests verify formatted values, `N/A` behavior, and clickable unavailable drilldown.

**Shadow Paths to Verify:**
- **Happy path:** completed items with dates -> totals + averages by type.
- **Nil input:** null start or done -> excluded + unavailable count.
- **Drilldown:** unavailable badge click -> linked ADO item modal for the clicked type/scope.
- **Empty input:** no completed items in window -> `N/A`, no crash.
- **Upstream error:** ADO/date sync failure -> existing sync/API error handling.

**Edge Cases:**
- Weekend-only span -> business-day count follows Monday-Friday rule.
- Item done outside window -> excluded even if assigned to visible sprint.
- Workstream with one item must not be skewed by program aggregation.
- `0` available items and unavailable items > 0 must be distinguishable in UI.

**Coverage Requirements:** New code at least 80%; calculator and unavailable paths 100%.

**Test Strategy:** Unit tests for calculators/config, sync mapper tests, API route tests, adapter and dashboard component tests.
