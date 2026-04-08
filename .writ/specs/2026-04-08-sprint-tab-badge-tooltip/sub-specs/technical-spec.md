# Technical Spec: Sprint Tab Badge Tooltip

> Parent spec: `.writ/specs/2026-04-08-sprint-tab-badge-tooltip/spec.md`
> Stories: Story 1

---

## Change Summary

**Type:** UI enhancement — purely additive, no data layer changes.

**File:** `components/Dashboard/SprintTabSelector.tsx` (sole file in scope)

---

## Before / After

### Import (line 3)

```tsx
// Before
import { Badge, Tabs } from '@mantine/core';

// After
import { Badge, Tabs, Tooltip } from '@mantine/core';
```

### Badge render (lines 41–44)

```tsx
// Before
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

## Component Hierarchy Context

```
<Tabs.List>
  <Tabs.Tab>
    {sprint.name}
    {sprint.isCurrent ? ' (current)' : ''}
    <Tooltip>          ← new wrapper
      <Badge />        ← unchanged
    </Tooltip>
  </Tabs.Tab>
</Tabs.List>
```

Mantine `Tooltip` renders its content in a portal outside the DOM tree, so z-index and overflow clipping from parent `Tabs` elements are not a concern.

---

## Mantine API Notes

| Prop | Value | Reason |
|---|---|---|
| `label` | `` `${sprint.totalStories} stories in this sprint` `` | Descriptive, matches badge content |
| `withArrow` | `true` | Matches existing tooltip usage in dashboard |
| `position` | (default: `"top"`) | Sufficient clearance above tabs; no override needed |

No additional Mantine props required.

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| z-index conflict | Very low | Mantine Tooltip uses portal rendering |
| Tooltip clipped by overflow | Very low | Portal rendering bypasses parent clip |
| Badge layout shift | None | Tooltip wrapper adds no layout footprint |
| TypeScript error | None | `Tooltip` is fully typed in `@mantine/core` |

**Net risk: negligible.**

---

## Cross-Spec Compatibility

Both prior specs that touched `SprintTabSelector` (`common-sprint-tab-selector`, `sprint-tabs-full-workstream-data`) are marked **Complete**. No in-flight specs touch this file.
