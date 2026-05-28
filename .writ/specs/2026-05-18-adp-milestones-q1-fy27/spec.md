# ADP Milestones — Q1 FY'27 Alignment

> **Status:** Not Started
> **Created:** 2026-05-18
> **Owner:** @AdamSellke
> **Origin:** Promoted from `.writ/issues/improvements/2026-05-18-adp-milestones-q1-fy27.md`

---

## Contract (Locked)

**Deliverable:** Align ADP milestone data and dashboard presentation with **Q1 FY'27** by deriving the active fiscal quarter from ADO sprint iteration paths and filtering milestone views to that quarter only.

**Must Include:** Iteration-driven current fiscal quarter detection (not hardcoded dates); both program quarterly panel and workstream `MilestoneGoalsPanel` show only current-quarter milestones; display labels include fiscal year (e.g. `Q1 FY'27`).

**Hardest Constraint:** Feature milestone tags carry bare `Q1`–`Q4` without fiscal year — filtering must combine iteration-derived fiscal context with `quarter` tag + `targetMonth` so stale Q4 (or prior-year Q1) rows do not appear after the fiscal rollover.

**🎯 Experience Design:**

- **Entry point:** Program manager opens the dashboard (no new navigation).
- **Happy path:** Dashboard loads → current sprint resolves to `Q1 FY27` iteration → milestone panels show only Q1 FY'27 Features/months with correct progress.
- **Moment of truth:** Program Summary ADP panel header reads `Q1 FY'27` and lists only in-quarter Features; workstream cards show only in-quarter monthly goal groups.
- **Feedback model:** Existing loading skeletons and rollup badges; quarter label updates inline when sprint rolls forward.
- **Error experience:** If current sprint or iteration path is missing/unparseable → panels show a clear dimmed message ("Unable to determine current fiscal quarter") rather than stale Q4 data.

**📋 Business Rules:**

- **Source of truth for "current quarter":** ADO current sprint `adoIterationPath` (e.g. `...\Q1 FY27\Sprint 1`), parsed to `{ quarter: "Q1", fiscalYear: 27, label: "Q1 FY'27" }`.
- **Milestone inclusion:** Include a milestone only when its explicit `quarter` tag matches the parsed quarter digit **and** its `targetMonth` falls within the fiscal quarter's month window for that FY (Medtronic: Q1=May–Jul, Q2=Aug–Oct, Q3=Nov–Jan, Q4=Feb–Apr; FY27 boundary per org calendar).
- **Filter scope:** Apply at API/adapter layer so program panel, workstream panel, `programRollup`, and PPTX export all receive consistent filtered data.
- **ADO operational prerequisite:** Features must be retagged in ADO (`Q4`→`Q1`, ADP months for Q1 FY'27) and re-synced — code cannot invent milestone rows without tags.
- **No calendar-quarter fallback:** Do not use `QUARTER_START_MONTH` calendar mapping (Jan/Apr/Jul/Oct) for fiscal filtering.

**Success Criteria:**

- With current sprint in `Q1 FY27` and ADO Features tagged `Q1` + `ADP-MAY`/`JUN`/`JUL`, dashboard shows only those milestones.
- Stale `Q4`-tagged Features do not appear in any milestone panel or rollup counts.
- Seeds, fixtures, and tests reflect Q1 FY'27 as the active quarter (not Q4 FY26).
- `.writ/product/mission.md` current position updated to Q1 FY'27.

**Scope Boundaries:**

- **Included:** Iteration path parser; current fiscal quarter resolver; milestone API + calculator + adapter filtering; UI label updates; seed/test/fixture refresh; mission.md update.
- **Excluded:** Automatic ADO retagging; fiscal quarter picker UI; multi-quarter comparison view; schema migrations; changes to ADP tag format in ADO.

**⚠️ Technical Concerns:**

- Iteration path formats vary (`Q1 FY27` vs `FY27\Q1`) — parser must handle both patterns seen in seed and test fixtures.
- Between-sprint gaps: if no current sprint, fail closed (empty/filtered) rather than showing all quarters.
- `computeProgramMilestoneRollup` currently counts all tagged milestones — must restrict to current fiscal quarter.

**💡 Recommendations:**

- Centralize fiscal parsing in `lib/fiscal/` (new) for reuse by API, adapter, and tests.
- Filter in `GET /api/milestones` before progress computation so export and dashboard share one path.
- Document Medtronic FY month map in code comments + `.writ/knowledge/` entry if one exists.

---

## Background

The milestone infrastructure (ADO Feature sync, ADP tag parsing, quarterly panel) is complete from prior specs. The team rolled from **Q4 FY26** to **Q1 FY'27** in ADO iterations, but the dashboard still surfaces stale quarter context because:

1. Quarter detection reads Feature tags, not sprint iterations.
2. No fiscal-year-aware filtering — all tagged quarters render.
3. Seeds, tests, and product docs still reference Q4 FY26.

---

## Detailed Requirements

### R1 — Fiscal quarter parsing from iterations

- Parse `adoIterationPath` segments matching `Q[1-4] FYyy` (e.g. `Q1 FY27`) or `FYyy\Q[1-4]`.
- Return structured `{ quarterDigit, fiscalYear, displayLabel }`.
- Unit tests cover seed path, test fixture paths, and malformed paths.

### R2 — Current fiscal quarter resolution

- Resolve from the current sprint record (synced `isCurrent` / date-range match — reuse existing sprint selection logic).
- Expose helper: `getCurrentFiscalQuarter(db | sprintPath)` for API use.
- When unresolvable → return `null`; downstream surfaces empty/error state.

### R3 — Milestone filtering

- Add `isInFiscalQuarter(milestone, fiscalQuarter): boolean` using quarter tag + `targetMonth` month window.
- Apply in `app/api/milestones/route.ts` before progress/rollup.
- Update `computeProgramMilestoneRollup` to accept optional fiscal quarter filter (or pre-filtered inputs).
- Update `groupMilestonesByQuarter` / month grouping adapters to exclude out-of-quarter milestones.

### R4 — Dashboard presentation

- `MilestoneQuarterlyPanel`: show at most one quarter group; badge reads `Q1 FY'27`.
- `MilestoneGoalsPanel`: only month groups whose milestones pass fiscal quarter filter.
- `ProgramSummarySection` rollup header reflects filtered quarter label and counts.
- Empty state: "No milestone data for Q1 FY'27" (with parsed label).

### R5 — Test & seed alignment

- Update `prisma/seed.ts`, dashboard fixtures, milestone sync tests from Q4 FY26 → Q1 FY27 scenarios.
- Update `.writ/product/mission.md` current position.
- Verify PPTX export program summary uses filtered rollup (inherits from API).

---

## Implementation Approach

1. **Story 1:** `lib/fiscal/parse-iteration-quarter.ts` + tests.
2. **Story 2:** Wire resolver into milestones API + calculator; adapter filter helpers.
3. **Story 3:** UI labels + empty/error states in dashboard components.
4. **Story 4:** Seeds, fixtures, integration tests, mission.md.

Operational step (manual, documented in spec): retag ADO Features for Q1 FY'27 and run ADO sync before validating in production.

---

## Story Plan

| # | Story | Dependencies |
|---|-------|--------------|
| 1 | Iteration fiscal quarter parser | None |
| 2 | Milestone API & rollup fiscal filtering | Story 1 |
| 3 | Dashboard quarter-only views & labels | Story 2 |
| 4 | Seeds, fixtures & test alignment | Story 2 |
