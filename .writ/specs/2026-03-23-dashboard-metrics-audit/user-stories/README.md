# User Stories — Dashboard Metrics Audit

> Spec: `../spec.md`
> Created: 2026-03-23

## Stories

| # | Title | Priority | Status | Dependencies | Tasks |
|---|---|---|---|---|---|
| 1 | [Sprint-Actual Overhead % and Carry-Over %](story-1-sprint-actual-metrics.md) | High | Completed ✅ | None | 8/8 |
| 2 | [Workstream Cards 2-Column Layout](story-2-two-column-layout.md) | Medium | Completed ✅ | None | 4/4 |
| 3 | [Wire Overhead Composition Stacked Bar Chart](story-3-overhead-composition-chart.md) | Medium | Completed ✅ | None | 6/6 |
| 4 | [Milestone Section Quarterly Rework](story-4-milestone-quarterly-rework.md) | High | Completed ✅ | None | 10/10 |
| 5 | [Bug Page Dashboard Filter](story-5-bug-page-dashboard-filter.md) | Low | Completed ✅ | None | 3/3 |

**Total: 5 stories, 31 tasks**

## Progress

```
Story 1: ██████████ 8/8
Story 2: ██████████ 4/4
Story 3: ██████████ 6/6
Story 4: ██████████ 10/10
Story 5: ██████████ 3/3
─────────────────────────
Total:   ██████████ 31/31 (100%)
```

## Build Order

Stories 1, 2, 3, and 5 are independent — they can be built in any order or in parallel. Story 4 (milestone rework) is the largest and can also start in parallel.

**Recommended order for solo execution:**
1. **Story 5** (bug filter) — 5 min, quick win
2. **Story 2** (layout) — 10 min, one-line change
3. **Story 1** (metric tiles) — 1–2 hrs, data accuracy fix
4. **Story 3** (composition chart) — 30 min, wire existing component
5. **Story 4** (milestone rework) — 3–4 hrs, API + types + adapter + new component

## Dependencies

None between stories. All stories modify different files except:
- Stories 1 and 3 both touch `WorkstreamHealthCard.tsx` (different sections — metric override vs. prop passing)
- Stories 1 and 4 both touch `lib/dashboard/types.ts` and `lib/dashboard/adapter.ts` (different type additions and mapping functions)

No merge conflicts expected if applied in the recommended order.
