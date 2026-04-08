# Add Tooltip to Story Count Badge on Sprint Tabs

> **Type:** Improvement
> **Priority:** Normal
> **Effort:** Small
> **Created:** 2026-04-08
> **spec_ref:** .writ/specs/2026-04-08-sprint-tab-badge-tooltip/spec.md

## TL;DR

The badge showing a story count on each sprint tab has no label, leaving users to guess what the number represents. A tooltip should clarify it.

## Current State

- `SprintTabSelector` renders a Mantine `Badge` beside the sprint name whenever `sprint.totalStories > 0`
- The badge displays the raw integer (e.g. `12`) with no accompanying label or tooltip
- There is no visual affordance indicating the number is a story count vs. a point total or any other metric

## Expected Outcome

- Hovering (or focusing) the badge shows a tooltip with a short label such as **"12 stories in this sprint"**
- Tooltip uses Mantine's `Tooltip` component, consistent with existing dashboard patterns
- No change to badge size, color, or position — tooltip is purely additive

## Implementation Notes

- Wrap the `<Badge>` in `<Tooltip label={`${sprint.totalStories} stories in this sprint`} withArrow>` (Mantine `Tooltip`)
- Import `Tooltip` from `@mantine/core` alongside the existing `Badge` import
- No data or API changes required

## Relevant Files

- `components/Dashboard/SprintTabSelector.tsx` — sole change needed; line 42–44 is the badge render
