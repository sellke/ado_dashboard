# Technical Spec: ADP Milestones Q1 FY'27 Alignment

> Spec: `.writ/specs/2026-05-18-adp-milestones-q1-fy27/spec.md`
> Stories: 1–4

---

## Architecture

```
ADO Sync (existing)
  Sprint.adoIterationPath  e.g. "...\\Q1 FY27\\Sprint 1"
       │
       ▼
lib/fiscal/parse-iteration-quarter.ts
  → FiscalQuarter { quarter: "Q1", fiscalYear: 27, label: "Q1 FY'27" }
       │
       ▼
lib/fiscal/quarter-window.ts
  → isTargetMonthInFiscalQuarter(targetMonth, fiscalQuarter): boolean
       │
       ▼
GET /api/milestones/route.ts
  → filter features/milestones before progress + rollup
       │
       ├── computeProgramMilestoneRollup (filtered inputs)
       └── milestonesWithProgress (filtered)
       │
       ▼
lib/dashboard/adapter.ts
  → groupMilestonesByQuarter / groupMilestonesByMonth (already filtered)
       │
       ▼
Dashboard UI + PPTX export
```

---

## New Module: `lib/fiscal/`

### `parseIterationQuarter(path: string): FiscalQuarter | null`

**Patterns to support:**

| Pattern | Example |
|---------|---------|
| `Q# FYyy` segment | `Event Streaming Platform\App\LiveLink - Yellow Box\Q1 FY27\Sprint 1` |
| `FYyy\Q#` segment | `Event Streaming Platform\FY27\Q1\Sprint 27.1` |

**Return type:**

```typescript
interface FiscalQuarter {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  fiscalYear: number;       // 27 for FY27
  displayLabel: string;     // "Q1 FY'27"
}
```

### `quarter-window.ts`

Medtronic fiscal month map (0-indexed UTC months for `targetMonth` comparison):

| Quarter | Months (inclusive) | Notes |
|---------|-------------------|-------|
| Q1 | May–Jul (4–6) | FY starts ~late April; ADP months MAY/JUN/JUL |
| Q2 | Aug–Oct (7–9) | |
| Q3 | Nov–Jan (10, 11, 0) | Spans calendar year |
| Q4 | Feb–Apr (1–3) | |

**Year assignment for targetMonth:** Compare calendar year of `targetMonth` against fiscal year derived from iteration (FY27 ≈ May 2026 – Apr 2027 for Q1–Q4 mapping). Implementation: for each quarter, define `[startDate, endDate)` for the fiscal year and test membership.

### `getCurrentFiscalQuarter(db: PrismaClient): Promise<FiscalQuarter | null>`

1. Find current sprint (date range contains today, or most recent past sprint — match existing dashboard sprint resolution).
2. Parse `adoIterationPath`.
3. Return null if path missing or unparseable.

---

## API Changes (`app/api/milestones/route.ts`)

1. Call `getCurrentFiscalQuarter` at start of GET handler.
2. After building milestone candidates, filter with:

```typescript
function milestoneMatchesFiscalQuarter(
  quarter: string | null,
  targetMonth: Date,
  fiscal: FiscalQuarter
): boolean {
  if (!quarter || quarter !== fiscal.quarter) return false;
  return isTargetMonthInFiscalQuarter(targetMonth, fiscal);
}
```

3. Pass filtered list to progress calculator and rollup.
4. Extend `ApiProgramMilestoneRollup` response (optional): add `fiscalQuarterLabel: string | null` for UI — or reuse existing `quarter` field with FY label string.

**Backward compatibility:** No schema migration. Response shape additive only if new field added.

---

## Adapter Changes (`lib/dashboard/adapter.ts`)

- Defensive filter in `groupMilestonesByQuarter` if API pre-filter missed edge cases (prefer single filter point in API).
- `groupMilestonesByMonth` (workstream panel): exclude month groups with zero in-quarter milestones after filter.

---

## UI Changes

| Component | Change |
|-----------|--------|
| `MilestoneQuarterlyPanel` | Badge shows `displayLabel`; single group expected |
| `MilestoneGoalsPanel` | Empty copy: "No monthly goal Features found for Q1 FY'27" |
| `ProgramSummarySection` | Rollup quarter label uses FY format |

---

## Error & Rescue Map

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| Parse iteration path | Unknown path format | Return null; UI empty state | Unit tests for known + malformed paths |
| Resolve current sprint | No sprints in DB | Return null; empty milestones | Integration test with empty DB |
| GET /api/milestones | DB error | Existing 500 handler | Route test |
| Fiscal filter | All milestones out of quarter | Empty array; rollup zeros | Route test with Q4-only data |
| ADO sync (prerequisite) | Features still Q4-tagged | Empty panel after code deploy | Document manual retag step |

---

## Shadow Paths

| Flow | Happy Path | Nil Input | Empty Input | Upstream Error |
|---|---|---|---|---|
| Dashboard milestones | Q1 FY'27 Features shown | No sprint path → dimmed message | No in-quarter tags → "No milestone data for Q1 FY'27" | API error → red text |
| Workstream panel | In-quarter months only | Same as above | "No monthly goal Features…" | Error prop text |
| PPTX export | Filtered rollup in summary slide | Omit/zero quarterly metric | Zero counts | Export skips milestone slide (existing) |

---

## Interaction Edge Cases

| Edge Case | Planned Handling |
|---|---|
| Sprint transition week | Date-range current sprint picks new quarter automatically |
| Mixed Q1+Q4 tags in DB | Only Q1 in-window shown |
| Feature Q1 tag, ADP month from prior FY | Excluded by month window |
| `?workstreamId=` filter | Fiscal filter applied before workstream filter |

---

## Manual Operations (Out of Code Scope)

1. Retag ADO Features: `Q4` → `Q1`, update ADP months to Q1 FY'27 months (MAY/JUN/JUL per team practice).
2. Run ADO sync (`/api/sync-ado` or scheduled job).
3. Verify dashboard shows Q1 FY'27 data.

---

## Story Traceability

| Story | Primary files |
|-------|---------------|
| 1 | `lib/fiscal/*`, `__tests__/lib/fiscal/*` |
| 2 | `app/api/milestones/route.ts`, `lib/milestones/calculator.ts`, `lib/dashboard/adapter.ts` |
| 3 | `MilestoneQuarterlyPanel.tsx`, `MilestoneGoalsPanel.tsx`, `ProgramSummarySection.tsx` |
| 4 | `prisma/seed.ts`, `__tests__/**`, `.writ/product/mission.md` |
