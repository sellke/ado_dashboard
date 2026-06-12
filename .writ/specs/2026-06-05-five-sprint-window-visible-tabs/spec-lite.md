# Visible Tabs Full Five-Sprint Window (Lite)

> Source: .writ/specs/2026-06-05-five-sprint-window-visible-tabs/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Deepen ADO sync ingestion from 5 → 9 sprints so every visible tab (latest 5)
is backed by a full anchored five-sprint window. The oldest visible tab needs 4 prior sprints;
union = 9. No read-path or UI change — sync is the single lever.

**Implementation Approach:**
- Add constants module: `VISIBLE_SPRINT_TABS=5`, `ROLLING_WINDOW_DEPTH=5`,
  `INGEST_SPRINT_DEPTH = VISIBLE + DEPTH − 1` (=9).
- `SYNC_CONFIG.lookbackSprintCount` → `INGEST_SPRINT_DEPTH`.
- Orchestrator selection: `selectRollingSprints(iterations, INGEST_SPRINT_DEPTH)` instead of
  hardcoded `selectRollingFiveSprints`. Depth cascades to sprint upsert, `sprintIdMap`, work
  items, capacity, and `computeAllMetrics`.

**Files in Scope:**
- `lib/sync/config.ts` — depth from formula.
- `lib/sync/iterations.ts` — parameterized selection; constant wiring.
- new `lib/sync/window.ts` (or similar) — the three constants.
- `lib/sync/orchestrator.ts` — verify deeper coverage (likely no logic change).

**Error Handling:**
- < 9 sprints in ADO → graceful truncation (present available, never pad). No errors.
- Iteration fetch failure → existing orchestrator try/catch (unchanged).

**Integration Points:**
- Read paths `app/api/sprints/stories` (`take 5`) and `app/api/metrics` (anchored `take 5`)
  stay as-is; they only gain backing data.

**Do NOT change:** visible tab count, tab sourcing, `/api/metrics` window logic, UI, schema.

---

## For Review Agents

**Acceptance Criteria:**
1. Sync ingests/refreshes sprint rows, work items, capacity, and metric snapshots for 9
   sprints (current + 8 prior), future-excluded.
2. Visible tab count stays exactly 5; current-sprint default view byte-for-byte unchanged.
3. Selecting the oldest visible tab yields a full 5-sprint window (≥ 9 sprints present).
4. Constants enforce `INGEST_SPRINT_DEPTH = VISIBLE_SPRINT_TABS + ROLLING_WINDOW_DEPTH − 1`.

**Business Rules:**
- Ingestion depth formula = 5 + 5 − 1 = 9.
- Tab list = latest 5 (unchanged); anchored window query (unchanged).
- Freshness guarantee covers the full 9-sprint backing set, not just sprint rows.
- < 9 sprints → truncated, never padded.

**Experience Design:**
- Entry: select any sprint tab (unchanged UI).
- Happy path: oldest tab renders full 5-sprint charts after sync.
- Moment of truth: oldest tab as complete as newest.
- Feedback: no new UI; data completeness only.
- Error: young program degrades gracefully, no badge/error.

**Known limitation:** trailing rolling average at the far-left of the oldest window is
computed over fewer priors (depth not extended beyond 9) — accepted.

---

## For Testing Agents

**Success Criteria:**
1. `selectRollingSprints(iterations, 9)` returns current + 8 prior, desc, future-excluded.
2. Orchestrator builds `sprintIdMap`/metric recompute over all 9 ingested sprints.
3. Constant-relationship test passes; route `take` values align with constants.
4. Truncation when fewer than 9 sprints exist (no padding, no throw).

**Shadow Paths to Verify:**
- **Happy path:** ≥ 9 iterations → 9 sprints ingested; oldest tab full window.
- **Nil input:** no iterations → empty selection, no upsert, no throw.
- **Empty input:** `[]` iterations → `{ sprints: [], currentSprint: null }`.
- **Upstream error:** iteration fetch throws → orchestrator records failure, other phases
  isolated (existing behavior).

**Edge Cases:**
- Exactly 5 sprints exist → 5 ingested; oldest tab window truncates to available.
- 6–8 sprints exist → partial backing; degrade gracefully.
- Future sprints present → excluded from selection.

**Coverage Requirements:**
- New code: ≥ 80%
- Selection + constant logic: 100%
- Truncation/degradation paths: 100%

**Test Strategy:**
- Unit: `iterations.test.ts` (depth, ordering, exclusion, truncation).
- Integration: `orchestrator.test.ts` (downstream coverage of 9 sprints).
- Guard: constant-relationship + route `take` alignment test.
