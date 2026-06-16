# Current UI Reference

The user selected "match existing app patterns" for visual references.

No live screenshot capture was performed in this spec creation pass. Use the current dashboard components as the visual source of truth:

- `components/Dashboard/ProgramSummarySection.tsx`
- `components/Dashboard/WorkstreamHealthCard.tsx`
- `components/Dashboard/RagBadge.tsx`
- `components/Dashboard/SprintTabSelector.tsx`
- `lib/dashboard/adapter.ts`
- `lib/dashboard/types.ts`

## Design Direction

- Reuse the existing program-summary and workstream-card visual hierarchy.
- Prefer compact by-type rows or grouped mini-metrics for User Story, Spike, and Bug.
- Use `N/A` for missing averages and show unavailable lifecycle-data counts as secondary text or a badge.
- Avoid introducing a new chart type in v1 unless implementation discovers the existing card layout cannot support the breakdown clearly.
