# Story 7: Overhead Breakdown Chart & Integration

> **Status:** Not Started ⬜
> **Priority:** High
> **Dependencies:** Story 2 (types amendment — `OverheadBreakdownItem` type), Story 6 (API data)

## User Story

**As a** stakeholder viewing workstream health
**I want to** see a line chart of overhead hours by category (Meetings, Spikes, Bugs, Support) across sprints within each workstream card
**So that** I can understand how overhead composition is trending and which categories are growing or shrinking

## Acceptance Criteria

- [ ] Given a workstream card with trend data, when rendered, then an overhead breakdown line chart appears between the velocity trend chart and the bug list
- [ ] Given 4 trend sprints with overhead data, when the chart renders, then it shows one line per category (Meetings, Spikes, Bugs, Support) with sprint names on the X-axis and hours on the Y-axis
- [ ] Given a category with zero hours in all sprints, when the chart renders, then that category's line is still shown (at zero) for consistency
- [ ] Given a sprint where Meetings hours differ from expectation, when hovering the chart, then the tooltip shows the exact hours value for each category
- [ ] Given no overhead data for a workstream, when the chart renders, then a "No overhead data available" empty state is shown
- [ ] Given the overhead chart is within a workstream card, then it does not overflow the card boundaries and matches the compact style of the velocity chart

## Implementation Tasks

- [ ] 7.1 Write component tests for `OverheadBreakdownChart`: renders all 4 category lines, renders empty state, tooltip shows correct hours values
- [ ] 7.2 Create `components/Dashboard/OverheadBreakdownChart.tsx` — Mantine `LineChart` with 4 series (one per overhead category), X-axis sprint names, Y-axis hours, ~200px height to match VelocityTrendChart
- [ ] 7.3 Define chart color scheme for the 4 categories (e.g., Meetings: blue, Spikes: orange, Bugs: red, Support: green) — use Mantine color tokens
- [ ] 7.4 Build chart data transformation in the component: map `TrendSprintViewModel.overheadBreakdown[]` per sprint into `LineChart` data array format `[{ sprint, Meetings: N, Spikes: N, Bugs: N, Support: N }]`
- [ ] 7.5 Update adapter (`mapTrendSprint()`) to map `overheadBreakdown` from `ApiTrendSprint` to `TrendSprintViewModel.overheadBreakdown` using `OverheadBreakdownItem` type (defined in Story 2 amendment)
- [ ] 7.6 Integrate `OverheadBreakdownChart` into `WorkstreamHealthCard.tsx` — place it between `VelocityTrendChart` and `SprintBugList`, with a section header (e.g., "Overhead Breakdown")
- [ ] 7.7 Handle empty state: hide overhead chart section when `trendSprints` is empty or all overhead hours are zero across all sprints
- [ ] 7.8 Update `__fixtures__/dashboard-fixtures.ts` with realistic overhead breakdown data for all 4 categories across multiple sprints
- [ ] 7.9 Verify responsive layout — chart stacks vertically without overflow at mobile/tablet/desktop breakpoints

## Notes

- Pattern: follow `VelocityTrendChart.tsx` closely for chart structure, props interface, empty state, and height
- Mantine `LineChart` supports multiple series natively — pass all 4 categories as separate `dataKey` entries in the `series` prop
- The `overheadBreakdown` data transformation should handle missing categories gracefully: if a sprint's breakdown doesn't include a category, default to `0`
- Component is purely presentational — no data fetching, receives `trendSprints: TrendSprintViewModel[]` as prop
- Section header "Overhead Breakdown" should match the visual hierarchy of the card — use Mantine `Text` with `size="sm"` and `fw={600}` to match existing card section labels

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Component tests passing for `OverheadBreakdownChart`
- [ ] Adapter correctly maps overhead breakdown data end-to-end
- [ ] Chart renders correctly with realistic fixture data in integration tests
- [ ] Responsive layout verified at all breakpoints
- [ ] No TypeScript errors
