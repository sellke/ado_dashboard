# Phase 1B: UI Wireframes

> Spec: .writ/specs/2026-02-18-program-summary-ui/spec.md

## Program Summary Section — 5-Tile Layout

### Current State (After Stories 1-7)

```
┌─────────────────────────────────────────────────────────────────┐
│  Program Summary — Sprint 5 (Feb 10 – Feb 21)                  │
│  Computed: Feb 18, 2026 3:45 PM                                 │
├────────────┬────────────┬────────────┬────────────┐             │
│  Velocity  │ Overhead % │Predictabil.│ Carry-Over │             │
│    42 SP   │   32.5%    │   85.0%    │   Rate     │             │
│   [GREEN]  │  [AMBER]   │  [GREEN]   │   12.3%    │             │
│  avg: 38   │  avg: 30%  │  avg: 82%  │  [GREEN]   │             │
│            │            │            │  avg: 15%  │             │
└────────────┴────────────┴────────────┴────────────┘             │
│  Sprint Trends (Sprint 1-4) | Sprint 5 Predicted               │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Target State (After Stories 8-9)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Program Summary — Sprint 5 (Feb 10 – Feb 21)                           │
│  Computed: Feb 18, 2026 3:45 PM                                          │
├───────────┬───────────┬───────────┬──────────────┬──────────────┐        │
│ Velocity  │Overhead % │Carry-Over │  Monthly     │  Quarterly   │        │
│   42 SP   │  32.5%    │    %      │  Milestone % │  Milestone   │        │
│  [GREEN]  │ [AMBER]   │  12.3%    │     —        │  Progress    │        │
│  avg: 38  │ avg: 30%  │ [GREEN]   │  No milestone│     —        │        │
│           │           │ avg: 15%  │  data yet    │  No milestone│        │
│           │           │           │   [GRAY]     │  data yet    │        │
│           │           │           │              │   [GRAY]     │        │
└───────────┴───────────┴───────────┴──────────────┴──────────────┘        │
│  Sprint Trends (Sprint 1-4) | Sprint 5 Predicted                        │
│  ...                                                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key changes:**
- Predictability tile removed
- "Carry-Over Rate" renamed to "Carry-Over %"
- Two new milestone tiles with gray/neutral placeholder state

### Milestone Tile — Empty State

```
┌──────────────┐
│  Monthly     │
│  Milestone % │
│              │
│      —       │  ← Em dash, large text
│              │
│ No milestone │  ← Muted subtext
│  data yet    │
│              │
│    [GRAY]    │  ← Neutral indicator (not RAG)
└──────────────┘
```

### Milestone Tile — Populated State (Phase 1E)

```
┌──────────────┐
│  Monthly     │
│  Milestone % │
│              │
│    78.5%     │  ← Percentage value, large text
│              │
│ Feb 2026     │  ← Current month context
│              │
│   [AMBER]    │  ← RAG based on ThresholdConfig
└──────────────┘
```

## Workstream Health Cards — After Story 8

### Current Card Layout

```
┌─────────────────────────────────────────┐
│  Streams                       [GREEN]  │
├─────────────────────────────────────────┤
│  Velocity:        12 SP       [GREEN]   │
│  Overhead %:      28.5%       [GREEN]   │
│  Predictability:  90.0%       [GREEN]   │  ← REMOVED
│  Carry-Over Rate: 8.5%        [GREEN]   │  ← RENAMED
│                                         │
│  Planned: 15 SP  │  Completed: 12 SP   │
│  Carry-Over: 2 items (3 SP)            │
│                                         │
│  Sprint Trends (Sprint 1-4)            │
│  Velocity:       10  11  13  12         │
│  Velocity Rate: 0.8 0.9 1.0 0.9        │
│  Active Bugs:    3   2   4   1          │
│  Bugs Closed:    2   3   1   4          │
└─────────────────────────────────────────┘
```

### Target Card Layout

```
┌─────────────────────────────────────────┐
│  Streams                       [GREEN]  │
├─────────────────────────────────────────┤
│  Velocity:      12 SP         [GREEN]   │
│  Overhead %:    28.5%         [GREEN]   │
│  Carry-Over %:  8.5%          [GREEN]   │  ← Renamed
│                                         │
│  Planned: 15 SP  │  Completed: 12 SP   │
│  Carry-Over: 2 items (3 SP)            │
│                                         │
│  Sprint Trends (Sprint 1-4)            │
│  Velocity:       10  11  13  12         │
│  Velocity Rate: 0.8 0.9 1.0 0.9        │
│  Active Bugs:    3   2   4   1          │
│  Bugs Closed:    2   3   1   4          │
└─────────────────────────────────────────┘
```

**Key changes:**
- Predictability row removed
- "Carry-Over Rate" renamed to "Carry-Over %"

## Responsive Layout

### Desktop (≥1200px)
- Program Summary: 5 tiles in a single row
- Workstream Cards: 2-column grid (3+2 layout)

### Tablet (768-1199px)
- Program Summary: 3+2 tile layout (3 top row, 2 bottom row)
- Workstream Cards: 2-column grid

### Mobile (<768px)
- Program Summary: Single column, 5 stacked tiles
- Workstream Cards: Single column, stacked

## Color System

| State | Color | Usage |
|-------|-------|-------|
| Green | Mantine `green.6` | RAG: metric within healthy range |
| Amber | Mantine `yellow.6` | RAG: metric needs attention |
| Red | Mantine `red.6` | RAG: metric critical |
| Gray | Mantine `gray.5` | Placeholder: no data available |
