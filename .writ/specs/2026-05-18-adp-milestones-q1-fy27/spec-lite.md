# ADP Milestones Q1 FY'27 (Lite)

> Source: .writ/specs/2026-05-18-adp-milestones-q1-fy27/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Derive current fiscal quarter from ADO sprint iteration paths; filter milestone API + dashboard to Q1 FY'27 only.

**Implementation Approach:**
- New `lib/fiscal/parse-iteration-quarter.ts` — parse `Q1 FY27` / `FY27\Q1` from `adoIterationPath`
- New `lib/fiscal/quarter-window.ts` — Medtronic FY month map (Q1=May–Jul, Q2=Aug–Oct, Q3=Nov–Jan, Q4=Feb–Apr)
- Resolve current quarter from current sprint in DB (reuse sync sprint selection)
- Filter in `app/api/milestones/route.ts` before progress calc
- Update `computeProgramMilestoneRollup`, `groupMilestonesByQuarter`, month grouping in adapter

**Files in Scope:**
- `lib/fiscal/*.ts` — new parser + quarter window helpers
- `app/api/milestones/route.ts` — fiscal filter gate
- `lib/milestones/calculator.ts` — rollup scoped to current quarter
- `lib/dashboard/adapter.ts` — filtered grouping
- `components/Dashboard/MilestoneQuarterlyPanel.tsx` — `Q1 FY'27` label
- `components/Dashboard/MilestoneGoalsPanel.tsx` — in-quarter months only
- `prisma/seed.ts`, test fixtures, `mission.md`

**Error Handling:**
- Unparseable iteration path → `currentFiscalQuarter: null`; API returns empty milestones + null quarter in rollup; UI shows dimmed message
- No current sprint → same fail-closed behavior
- Milestone has matching Q1 tag but targetMonth outside FY window → excluded

**Integration Points:**
- ADO sync must have run with Q1-tagged Features (manual retag prerequisite)
- PPTX export inherits filtered API response — no separate export filter

---

## For Review Agents

**Acceptance Criteria:**
1. Current sprint path `...\Q1 FY27\Sprint 1` → panels show `Q1 FY'27` only
2. Q4-tagged milestones excluded from API, panels, and rollup counts
3. Workstream `MilestoneGoalsPanel` shows only in-quarter month groups
4. Seeds/tests use Q1 FY27 fixtures; all tests pass

**Business Rules:**
- Iteration path is source of truth for active fiscal quarter
- Milestone must match quarter digit AND targetMonth within FY month window
- Fail closed when quarter unresolvable — never show stale all-quarters data

**Experience Design:**
- Entry: dashboard load
- Happy path: single quarter panel with FY label
- Moment of truth: correct Q1 FY'27 Features visible
- Feedback: existing loading/error patterns
- Error: "Unable to determine current fiscal quarter" or "No milestone data for Q1 FY'27"

---

## For Testing Agents

**Success Criteria:**
1. Parser handles seed + test iteration path variants
2. API returns 0 milestones when only Q4-tagged data exists during Q1 FY27 sprint
3. New code ≥80% coverage; fiscal filter paths 100%

**Shadow Paths to Verify:**
- **Happy path:** Q1 sprint + Q1-tagged milestones → filtered list
- **Nil input:** null iteration path → empty + message
- **Empty input:** no milestones in quarter → empty state copy
- **Upstream error:** milestones API error → existing red error text

**Edge Cases:**
- `FY27\Q1\Sprint 27.1` vs `Q1 FY27\Sprint 1` paths → both parse
- Q3 milestone with Nov targetMonth in FY27 → included when in Q3 FY27
- Milestone Q1 tag + ADP-JAN targetMonth during Q1 FY27 → excluded (wrong month window)

**Test Strategy:**
- Unit: parser, quarter window, filter predicate
- Integration: milestones route with mocked sprint + milestone fixtures
- Component: DashboardContainer/Integration with Q1-only mock data
