# Component Inventory — Cycle Time Tile Integration

> **Updated:** 2026-06-19 | **Wireframes:** see `mockups/README.md`

## Layout Components

| Component | Type | States | Implementation Notes |
|-----------|------|--------|----------------------|
| Program metric tile | display | populated, N/A, projected | Existing — Velocity, Overhead %, Predictability %, Carry-over % |
| Cycle time metric tile | display | populated, empty/N/A, partial unavailable | **New variant** — same `Card withBorder padding="md"` shell as program metrics |
| Cycle time section header | layout | default | `Text fw={600}` + `MetricDefinitionHint`; sits between sprint grid and cycle time grid |
| Workstream cycle time row | display | populated, N/A, unavailable badge | Inline row — mirrors workstream metric row pattern (label / value / badge) |
| Unavailable drilldown modal | nav/input | loading, error, empty list, populated table | **Reuse** existing modal in `CycleTimeBreakdown` — extract if needed |

## Refactor Targets

| Current | Target | Scope |
|---------|--------|-------|
| `CycleTimeBreakdown` (card wrapper + nested bordered stacks) | `CycleTimeBreakdown variant="tiles"` at program level | `ProgramSummarySection` |
| `CycleTimeBreakdown` (nested card in workstream) | `CycleTimeBreakdown variant="rows"` | `WorkstreamHealthCard` |
| Separate card below sprint tiles | Second `SimpleGrid` row, no outer card | Program summary |

## Program Summary Grid Structure

```
Program Summary (Title order={2})
├── Sprint context labels (dimmed)
├── SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} — sprint metrics
│   └── Card × 4 (Velocity, Overhead, Predictability, Carry-over)
├── Cycle Time section header + MetricDefinitionHint
├── SimpleGrid cols={{ base: 1, sm: 3 }} — cycle time metrics
│   └── Card × 3 (User Story, Spike, Bug)
├── ADP Milestones (unchanged)
└── Sprint Trend charts (unchanged)
```

## Workstream Card Structure (expanded)

```
WorkstreamHealthCard
├── Title + collapse toggle
├── Metric rows × 4 (existing)
├── [divider]
├── Sprint detail block (existing)
├── [divider]
├── CYCLE TIME header + hint
├── Cycle time rows × 3 (User Story, Spike, Bug)
├── [divider]
├── Velocity chart (existing)
└── … remaining sections unchanged
```

## Tile Anatomy (program level)

| Region | Mantine pattern | Content |
|--------|-----------------|---------|
| Label row | `Group justify="space-between"` | Uppercase type label + optional unavailable badge |
| Primary value | `Text fw={600} size="lg"` | `12.4 bd` avg or `N/A` |
| Secondary | `Text size="xs" c="dimmed"` | `Total 248 bd • 20 completed` |

## Row Anatomy (workstream level)

| Column | Width | Content |
|--------|-------|---------|
| Label | flex | Type name + optional entity icon |
| Value | shrink 0 | Average business days or `N/A` |
| Badge | shrink 0 | Unavailable count (clickable when drilldown enabled) |

## Responsive Rules

| Viewport | Program cycle time | Workstream cycle time |
|----------|-------------------|----------------------|
| ≥768px | 3-column tile grid | Inline rows |
| <768px | 1-column tile stack | Rows; badge may wrap to second line on narrow cards |

## Design Tokens (from design-system.md)

| Token | Use |
|-------|-----|
| `Card withBorder`, `padding="md"` | All metric tiles |
| `spacing="md"` | Grid gap between tiles |
| `size="xs" c="dimmed" tt="uppercase" fw={500}` | Tile labels |
| `fw={600} size="lg"` | Primary metric values |
| `Badge variant="light" color="yellow"` | Unavailable counts |
| `var(--mantine-color-default-border)` | Section dividers in workstream cards |

## States Wireframe Reference

See `cycle-time-tile-states.excalidraw` for populated, empty, and partial-unavailable tile variants.
