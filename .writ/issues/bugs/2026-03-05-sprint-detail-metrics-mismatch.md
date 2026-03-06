# Sprint Detail Section Metrics Don't Match Summary Metrics

> **Type:** Bug
> **Priority:** High
> **Effort:** Medium
> **Created:** 2026-03-05

## TL;DR

The workstream card shows contradictory data — 93.94% carry-over in the summary metrics but 0 carry-over items/points in the sprint detail section, because the two sections pull from different sprints.

## Current State

- The **Carry-Over %** metric in the card header shows **93.94%**, implying nearly all work is incomplete
- The **sprint detail section** below it shows **Sprint 26.22 · Feb 16 – Feb 27** with **Planned: 19 · Completed: 19** and **Carry-over: 0 items, 0 pts**
- These numbers directly contradict each other on the same card
- The carry-over % likely comes from the **current in-progress sprint (26.23)** where items haven't been completed yet, inflating the rate
- The detail section shows the **last completed sprint (26.22)** where all items were done

## Expected Outcome

- The carry-over % metric and the sprint detail section should reference the same sprint, OR
- The card should clearly indicate which sprint each section references (e.g., "Carry-Over % (current sprint)" vs "Last Completed Sprint: 26.22")
- A user should never see 93.94% carry-over next to "Carry-over: 0 items, 0 pts" on the same card — the data must be self-consistent

## Relevant Files

- `lib/metrics/calculators.ts` - `calculateCarryOver()` computes carry-over rate from work items; need to verify which sprint's items are used
- `app/api/metrics/route.ts` - API route assembles `metrics.carryOverRate` and `detail.carryOverItems/Points` — likely from different sprint snapshots
- `lib/dashboard/adapter.ts` - Maps API response to view model; lines 510–527 build the detail block from `ws.detail`

## Notes

- The `priorDetailMap` mechanism in the API route (line 350) suggests intentional separation of "prior sprint" detail data from current metrics — the UX just doesn't communicate this clearly
- This may affect all workstream cards, not just Action Tracker
- Consider whether carry-over % should use rolling average across completed sprints only, excluding the in-progress sprint
