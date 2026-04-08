# Sprint Tab Badge Tooltip

> Created: 2026-04-08
> Status: Not Started
> Contract Locked: ✅
> Origin: Promoted from issue: .writ/issues/improvements/2026-04-08-sprint-tab-badge-tooltip.md

## Contract Summary

**Deliverable:** Add a Mantine `Tooltip` to the story-count badge on sprint tabs so users understand what the number represents.

**Must Include:** Tooltip wrapping the `Badge` in `SprintTabSelector`, showing `"N stories in this sprint"` on hover and focus.

**Hardest Constraint:** None — purely additive, zero data or API changes.

---

## 🎯 Experience Design

- **Entry point:** User hovers or keyboard-focuses the story-count badge on any sprint tab
- **Happy path:** Tooltip appears above the badge with the label `"12 stories in this sprint"` (count interpolated at render time)
- **Moment of truth:** The number goes from ambiguous to immediately meaningful
- **Feedback model:** Mantine `Tooltip` with `withArrow` — native hover/focus behavior, no custom logic
- **Error experience:** N/A — tooltip is always available whenever the badge renders
- **Empty/loading states:** Badge only renders when `sprint.totalStories > 0`, so tooltip never appears on zero-story sprints (unchanged behavior)
- **Responsive behavior:** Tooltip behavior defers to Mantine's built-in responsive handling; no custom breakpoint logic needed

---

## 📋 Business Rules

- Tooltip text: `"${sprint.totalStories} stories in this sprint"` — the exact same integer already rendered in the badge
- Tooltip appears on **both hover and focus** (keyboard accessible)
- No change to badge `size`, `color`, `variant`, `ml`, or position
- Change is purely additive — no existing badge behavior is removed or modified
- `withArrow` matches the tooltip style used elsewhere in the dashboard (existing pattern)

---

## Implementation Approach

Wrap the existing `<Badge>` in a `<Tooltip>` from `@mantine/core`. Add `Tooltip` to the existing named import on line 3. No new files, no new props, no new state.

```tsx
// Before
import { Badge, Tabs } from '@mantine/core';

// After
import { Badge, Tabs, Tooltip } from '@mantine/core';

// Before (lines 41–44)
{sprint.totalStories > 0 && (
  <Badge size="xs" ml={4} variant="light">
    {sprint.totalStories}
  </Badge>
)}

// After
{sprint.totalStories > 0 && (
  <Tooltip label={`${sprint.totalStories} stories in this sprint`} withArrow>
    <Badge size="xs" ml={4} variant="light">
      {sprint.totalStories}
    </Badge>
  </Tooltip>
)}
```

---

## Success Criteria

1. Hovering the badge on any sprint tab shows a tooltip reading `"N stories in this sprint"`
2. Keyboard focus on the badge also shows the tooltip (accessible)
3. Badge appearance (size, color, position) is identical to the pre-change state
4. No console errors; no TypeScript errors
5. No other components are touched

---

## Scope Boundaries

**Included:**
- `Tooltip` wrapper on the badge in `SprintTabSelector.tsx`
- `Tooltip` import added to existing `@mantine/core` import line

**Excluded:**
- Tests (explicitly out of scope per decision)
- Changes to badge style, color, or position
- Tooltip on any other badge or element in the dashboard
- Changes to data, API, or types
