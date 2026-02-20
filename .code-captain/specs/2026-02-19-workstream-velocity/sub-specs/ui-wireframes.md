# Phase 1C: UI Wireframes

> Spec: .code-captain/specs/2026-02-19-workstream-velocity/spec.md

## WorkstreamHealthCard — Before (Current)

```
┌─────────────────────────────────────────┐
│  Action Tracker                         │
├─────────────────────────────────────────┤
│  VELOCITY        12 SP         [GREEN]  │
│  OVERHEAD %      28.5%         [GREEN]  │
│  CARRY-OVER %    8.5%          [GREEN]  │
│─────────────────────────────────────────│
│  Planned: 15 SP  •  Completed: 12 SP   │
│  Carry-over: 2 items, 3 pts            │
│─────────────────────────────────────────│
│  Sprint Trend (1-4)                     │
│  Sprint 1                               │
│    Velocity: 10 pts • Velocity rate:    │
│    0.80 pts/hr                          │
│    Active bugs: 3 • Bugs closed: 2     │
│  Sprint 2                               │
│    Velocity: 11 pts • Velocity rate:    │
│    0.90 pts/hr                          │
│    Active bugs: 2 • Bugs closed: 3     │
│  Sprint 3                               │
│    ...                                  │
│  Sprint 4                               │
│    ...                                  │
└─────────────────────────────────────────┘
```

## WorkstreamHealthCard — After (Phase 1C)

```
┌──────────────────────────────────────────────┐
│  Action Tracker                              │
├──────────────────────────────────────────────┤
│  VELOCITY          12 SP            [GREEN]  │
│  VELOCITY RATE     0.95 pts/hr              │  ← NEW 4th tile
│  OVERHEAD %        28.5%            [GREEN]  │
│  CARRY-OVER %      8.5%            [GREEN]  │
│──────────────────────────────────────────────│
│  Planned: 15 SP  •  Completed: 12 SP        │
│  Carry-over: 2 items, 3 pts                 │
│──────────────────────────────────────────────│
│                                              │
│  Velocity Trend                              │
│                                              │
│  15 ┤                                        │
│     │              ●                         │
│  12 ┤    ●────────╱│╲                        │
│     │   ╱              ╲····● Predicted      │
│  10 ┤──●                                     │
│     │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ Avg: 11.5      │
│   8 ┤                                        │
│     └──┬────┬────┬────┬────┬──               │
│       S1   S2   S3   S4  S5(F)              │
│                                              │
│──────────────────────────────────────────────│
│                                              │
│  Sprint 1                                    │
│    #12001 — Login timeout on slow networks   │  ← closed (strikethrough)
│    #12045 — Export button misaligned         │  ← open
│                                              │
│  Sprint 2                                    │
│    #12089 — Null pointer in settings         │  ← closed (strikethrough)
│    #12102 — Dashboard crash on refresh       │  ← open
│    #12115 — Incorrect date formatting        │  ← open
│                                              │
│  Sprint 3                                    │
│    No bugs                                   │
│                                              │
│  Sprint 4                                    │
│    #12201 — Memory leak in chart render      │  ← open
│                                              │
└──────────────────────────────────────────────┘
```

## Velocity Trend Chart Detail

### Chart Anatomy

```
  Y (SP)
  │
  │         ●────── Actual data point (solid line, with dot)
  │        ╱ ╲
  │       ╱   ╲
  │      ╱     ····● Predicted data point (dashed line)
  │─────╱──────────── Reference line: "Avg: X" (horizontal dashed, gray)
  │    ╱
  │   ●
  │
  └───┬─────┬─────┬─────┬─────┬───
     S1    S2    S3    S4   S5(F)
```

**Visual encoding:**
- **Solid blue line + dots:** Completed sprint velocity (actual data)
- **Dashed blue line:** Predicted velocity for current sprint
- **Horizontal gray dashed line:** Rolling average with "Avg: X" label
- **X-axis labels:** Abbreviated sprint names; prediction labeled "S5 (F)"
- **Y-axis:** Story points, domain `[0, auto]`

### Chart Specifications

| Property | Value |
|----------|-------|
| Height | ~200px |
| Series 1 | "Completed Points" — solid line, `blue.6`, with dots |
| Series 2 | "Predicted" — dashed line, `blue.6`, `strokeDasharray: '5 5'` |
| Reference line | `{ y: avgVelocity, color: 'gray.5', label: 'Avg: X' }` |
| X-axis | Sprint names abbreviated (strip "Sprint " prefix), angle -20° |
| Y-axis | `[0, auto]` domain |
| Tooltip | Show on hover, animation 150ms |

### Prediction Line Connection

The prediction line connects from the last actual sprint to the predicted value:

```
                 Last actual        Predicted
                    ●················●
                    │                │
                  Sprint 4        Sprint 5 (F)
```

Implementation: The last actual data point gets both "Completed Points" and "Predicted" series values (as the connecting anchor). The prediction point only has "Predicted" value.

## Bug List Styling

### Open Bug

```
#12045 — Export button misaligned on mobile
```
- `Text size="xs"` 
- ADO ID bold or colored
- Normal text weight

### Closed Bug (Strikethrough)

```
̶#̶1̶2̶0̶0̶1̶ ̶—̶ ̶L̶o̶g̶i̶n̶ ̶t̶i̶m̶e̶o̶u̶t̶ ̶o̶n̶ ̶s̶l̶o̶w̶ ̶n̶e̶t̶w̶o̶r̶k̶s̶
```
- `Text size="xs" td="line-through" c="dimmed"`
- Full line gets strikethrough + muted color

### Empty Sprint

```
Sprint 3
  No bugs
```
- Sprint header in `fw={500}`
- "No bugs" in `c="dimmed" fs="italic"`

## Responsive Layout

### Desktop (≥1200px)
- Workstream cards in 2-column grid (unchanged from current)
- Velocity chart fills card width (~200px tall)
- Bug list below chart with full text

### Tablet (768-1199px)
- Workstream cards in 2-column grid (unchanged)
- Chart slightly narrower, same height
- Bug titles may wrap to 2 lines

### Mobile (<768px)
- Workstream cards stack vertically (single column)
- Chart fills full card width
- Bug list full width, titles may truncate with ellipsis

## Color System (Unchanged)

| State | Color | Usage |
|-------|-------|-------|
| Green | Mantine `green.6` | RAG: metric within healthy range |
| Amber | Mantine `yellow.6` | RAG: metric needs attention |
| Red | Mantine `red.6` | RAG: metric critical |
| Blue | Mantine `blue.6` | Chart: velocity line + dots |
| Gray | Mantine `gray.5` | Chart: reference line, bug strikethrough |

## Metric Tile Order

| # | Tile | Format | RAG |
|---|------|--------|-----|
| 1 | Velocity | `12 SP` | ✅ Green/Amber/Red |
| 2 | Velocity Rate | `0.95 pts/hr` | ❌ None (informational) |
| 3 | Overhead % | `28.5%` | ✅ Green/Amber/Red |
| 4 | Carry-Over % | `8.5%` | ✅ Green/Amber/Red |
