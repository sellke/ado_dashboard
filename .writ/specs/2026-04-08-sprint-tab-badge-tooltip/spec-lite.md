# Sprint Tab Badge Tooltip (Lite)

> Source: .writ/specs/2026-04-08-sprint-tab-badge-tooltip/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Wrap the story-count `Badge` in `SprintTabSelector.tsx` with a Mantine `Tooltip`.

**Implementation Approach:**
- Add `Tooltip` to existing `import { Badge, Tabs } from '@mantine/core'` (line 3)
- Wrap `<Badge size="xs" ml={4} variant="light">` (lines 41–44) with `<Tooltip label={`${sprint.totalStories} stories in this sprint`} withArrow>`
- No new files, no new props, no new state

**Files in Scope:**
- `components/Dashboard/SprintTabSelector.tsx` — sole change; add Tooltip import + wrapper

**Constraints:**
- Badge `size`, `ml`, `variant`, and color must remain identical
- Tooltip only appears when badge renders (inside `sprint.totalStories > 0` guard — already the case)

---

## For Review Agents

**Acceptance Criteria:**
1. Hovering the badge shows tooltip: `"N stories in this sprint"` (N = actual count)
2. Keyboard focus on the badge also triggers the tooltip
3. Badge visual appearance unchanged (size, color, position)
4. No TypeScript errors; no other files modified

**Business Rules:**
- Tooltip text is `"${sprint.totalStories} stories in this sprint"` — same integer as badge content
- `withArrow` required to match existing dashboard tooltip pattern
- Change is purely additive — no existing behavior removed

**Experience Design:**
- Entry: hover or focus the badge on any sprint tab
- Happy path: tooltip appears, number becomes self-explanatory
- Error: N/A — tooltip always available when badge renders

---

## For Testing Agents

**Note:** Tests explicitly out of scope for this change per spec decision.

**Manual Verification:**
- Hover each sprint tab badge → tooltip appears with correct count
- Tab to badge via keyboard → tooltip appears
- Badge position/size visually unchanged after change
