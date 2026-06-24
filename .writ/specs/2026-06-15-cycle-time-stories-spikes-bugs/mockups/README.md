# Cycle Time Dashboard — Visual Reference Catalog

> **Design pass:** 2026-06-19 — integrate cycle time with existing metric tiles  
> **Framework:** Mantine v8 | **Design system:** `.writ/docs/design-system.md`

## Problem

Cycle time currently renders as a separate nested card (`CycleTimeBreakdown`) below program metric tiles and inside workstream cards. The inner bordered stacks use a different visual hierarchy than sprint metric tiles (different title weight, nested boxes, card-in-card nesting).

## Target

Unify cycle time with the same tile and row patterns used for velocity, overhead, and other dashboard metrics. Preserve drilldown behavior for unavailable counts.

## Wireframes

| File | Viewport | Description |
|------|----------|-------------|
| `program-summary-cycle-time-integration.excalidraw` | 1440×900 desktop | Program summary with cycle time as a second tile row (no wrapper card) |
| `program-summary-cycle-time-mobile.excalidraw` | 375×812 mobile | Single-column stack: sprint tiles then cycle time tiles |
| `workstream-card-cycle-time-integration.excalidraw` | 1440×900 desktop | Workstream card with inline cycle time rows (no nested card) |
| `cycle-time-tile-states.excalidraw` | 1440×500 | Populated, empty/N/A, and partial-unavailable tile states |

## Design Notes

### Program summary

- Keep the existing 4-column sprint metric grid unchanged.
- Add a **Cycle Time** section label (`Text fw={600}`) with `MetricDefinitionHint` for `cycleTimeAverage`, placed directly above the cycle time tile row — not inside a wrapper card.
- Render **three Mantine `Card withBorder padding="md"` tiles** (User Story, Spike, Bug) using the same anatomy as sprint tiles:
  - Uppercase dimmed label (`size="xs" tt="uppercase"`)
  - Primary value: average business days (`fw={600} size="lg"`) or `N/A`
  - Secondary line: total business days and completed count (`size="xs" c="dimmed"`)
  - Unavailable count badge top-right (`Badge variant="light" color="yellow"`) — same placement as `RagBadge` on sprint tiles
- Grid: `SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md"` aligned to the sprint tile grid left edge.
- **Remove** the outer `CycleTimeBreakdown` card wrapper at program level; refactor component to support a `variant="tile"` layout.

### Workstream cards

- Replace nested `CycleTimeBreakdown` card with a **divider + inline metric rows** matching existing workstream metric rows.
- Section header: `CYCLE TIME` uppercase label + definition hint.
- Three rows: label left (User Story / Spike / Bug), average value right, unavailable badge inline when present.
- Keep drilldown modal behavior; only the presentation shell changes.

### Colors and tokens

| Element | Token | Notes |
|---------|-------|-------|
| User Story label accent | `blue.6` | Optional left icon `IconBook2` per design system |
| Spike label accent | `green.9` | Category color, not RYG |
| Bug label accent | `red.6` | Use only on Bug icon/label, not as status |
| Unavailable badge | `yellow` light variant | Warning semantics — distinct from RYG `yellow.6` badges on sprint metrics |
| Tile border | `Card withBorder` | Never custom nested border stacks |

### Responsive behavior

| Breakpoint | Program layout | Workstream layout |
|------------|----------------|-------------------|
| Desktop (≥768px) | 4 sprint tiles + 3 cycle time tiles in separate rows | Inline rows under divider |
| Mobile (<768px) | All tiles stack 1-column | Rows unchanged; badge wraps below value if needed |

### Unchanged behavior

- Unavailable badge click → lazy-load drilldown modal (existing API)
- `N/A` when no completed items (never show `0` average)
- Loading/error/empty states inherit dashboard shell — no separate fetch lifecycle

## Story Mapping

This design refines presentation from Story 4 (dashboard presentation). Implementation can be tracked as a follow-up polish story or issue.
