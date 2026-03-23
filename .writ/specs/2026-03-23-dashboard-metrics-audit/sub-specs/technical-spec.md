# Technical Specification — Dashboard Metrics Audit

> Parent: `.writ/specs/2026-03-23-dashboard-metrics-audit/spec.md`

## Architecture Impact

No new API endpoints. No schema changes. No new pages or routes. All changes are to existing components, the adapter layer, and one API response extension.

## Data Flow Changes

### Story 1: Sprint-Actual Metric Override

Current flow when non-current sprint is selected:
```
TrendSprintViewModel.overheadPercentAvg → WorkstreamHealthCard displayMetrics → Overhead % tile
TrendSprintViewModel.carryOverRateAvg → WorkstreamHealthCard displayMetrics → Carry-Over % tile
```

New flow:
```
TrendSprintViewModel.rawOverheadPercent (actual) → WorkstreamHealthCard displayMetrics → Overhead % tile
TrendSprintViewModel.rawCarryOverRate (actual) → WorkstreamHealthCard displayMetrics → Carry-Over % tile
```

**Source mapping:**
- `rawOverheadPercent` ← `ApiTrendSprint.overheadComposition.overheadPercent` (already in API response)
- `rawCarryOverRate` ← derived: `(carryOverPoints / plannedPoints) * 100` (both fields already on trend sprint)
- Division by zero guard: if `plannedPoints` is 0 or null → `rawCarryOverRate = null`

### Story 3: Composition Chart Wiring

No data flow change — `overheadComposition` already mapped to `OverheadCompositionViewModel[]` on `WorkstreamCardViewModel`. Just need to pass it through `WorkstreamHealthCard` → `OverheadBreakdownPanel` → `OverheadCompositionChart`.

### Story 4: Milestone API Extension

Current milestone API response per milestone:
```json
{
  "id": "...",
  "title": "Feature Name",
  "workstreamId": "...",
  "completedPoints": 15,
  "totalPoints": 30,
  "percentComplete": 50,
  "quarter": "Q3",
  "burnupData": [...]
}
```

Extended response (add `workstreamBreakdown`):
```json
{
  "id": "...",
  "title": "Feature Name",
  "workstreamId": "...",
  "completedPoints": 15,
  "totalPoints": 30,
  "percentComplete": 50,
  "quarter": "Q3",
  "burnupData": [...],
  "workstreamBreakdown": [
    {
      "workstreamId": "ws-1",
      "workstreamName": "Action Tracker",
      "totalStories": 12,
      "inProgressCount": 3,
      "inProgressPercent": 25,
      "completedCount": 6,
      "completedPercent": 50
    },
    {
      "workstreamId": "ws-2",
      "workstreamName": "Pitch Tracker",
      "totalStories": 8,
      "inProgressCount": 1,
      "inProgressPercent": 12.5,
      "completedCount": 6,
      "completedPercent": 75
    }
  ]
}
```

**Classification logic:** For each child UserStory under a Feature:
- Look up the story's `workstreamId` (from `WorkItem.workstreamId`)
- Classify by ADO state: use `mapStateToStatusGroup()` from `lib/sprints/status-mapping.ts`
  - `Active` group → In Progress
  - `Resolved` or `Completed` group → Completed
  - Other (Planned) → neither (not counted in either %)
- Group by workstream, compute counts and percentages

**Query:** The milestones route already fetches child stories via `prisma.workItem.findMany({ where: { parentAdoId: { in: featureAdoIds }, type: 'UserStory' } })`. Extend the select to include `workstreamId` and the `workstream` relation for name.

## Modified Files Summary

| File | Stories | Change |
|---|---|---|
| `lib/dashboard/types.ts` | 1, 4 | Add `rawOverheadPercent`, `rawCarryOverRate` to `TrendSprintViewModel`. Add `MilestoneQuarterGroup`, `MilestoneWorkstreamProgress` types. |
| `lib/dashboard/adapter.ts` | 1, 4 | Map new trend sprint fields. Add quarterly milestone grouping. |
| `lib/milestones/types.ts` | 4 | Add `MilestoneWorkstreamBreakdown` to API types. |
| `app/api/milestones/route.ts` | 4 | Add per-workstream story breakdown to response. |
| `components/Dashboard/WorkstreamHealthCard.tsx` | 1, 3 | Use actual values for override. Pass composition data. |
| `components/Dashboard/WorkstreamCardsGrid.tsx` | 2 | Grid cols change. |
| `components/Dashboard/OverheadBreakdownPanel.tsx` | 3 | Add composition chart + prop. |
| `components/Dashboard/ProgramSummarySection.tsx` | 4 | Replace count cards with quarterly panel. |
| `components/Dashboard/MilestoneQuarterlyPanel.tsx` | 4 | NEW — quarterly milestone display. |
| `components/Dashboard/BugReportContainer.tsx` | 5 | Add dashboard filter to fetch URL. |

## New Files

| File | Story | Purpose |
|---|---|---|
| `components/Dashboard/MilestoneQuarterlyPanel.tsx` | 4 | Quarterly-grouped milestone display with per-workstream breakdown |

## Error & Edge Cases

| Operation | What Can Fail | Handling |
|---|---|---|
| Derive carry-over rate | `plannedPoints` is 0 or null | Return null → tile shows "N/A" |
| Workstream breakdown | Child story has null workstreamId | Skip story (not counted) |
| Quarter grouping | Milestone has no quarter tag | Place in "Untagged" group at end |
| Composition chart | No overhead data for any sprint | Chart not rendered (existing behavior) |
| Bug page filter | No bugs for filtered workstreams | Empty state message (existing behavior) |

## Test Strategy

| Area | Approach | Location |
|---|---|---|
| Adapter: new trend sprint fields | Unit test: verify `rawOverheadPercent` and `rawCarryOverRate` mapping | `__tests__/lib/dashboard/adapter.test.ts` |
| Adapter: quarterly grouping | Unit test: verify grouping logic with mixed quarters and untagged | `__tests__/lib/dashboard/adapter.test.ts` |
| API: workstream breakdown | Unit test with mocked Prisma: verify per-workstream counts | `__tests__/app/api/milestones/route.test.ts` |
| WorkstreamHealthCard override | Component test: verify actual values used for non-current sprint | `__tests__/components/Dashboard/WorkstreamHealthCard.test.tsx` |
| OverheadBreakdownPanel | Component test: verify both charts render | `__tests__/components/Dashboard/OverheadBreakdownPanel.test.tsx` |
| MilestoneQuarterlyPanel | Component test: verify quarter groups and workstream rows | `__tests__/components/Dashboard/MilestoneQuarterlyPanel.test.tsx` |
| BugReportContainer | Component test: verify fetch URL includes dashboard param | `__tests__/components/Dashboard/BugReportContainer.test.tsx` |
