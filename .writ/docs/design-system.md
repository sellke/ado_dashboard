# Design System

> Created: 2026-03-23 | Framework: Mantine v8 + Recharts | Stack: Next.js + React 19

This document is the authoritative style reference for all UI work in this report. It defines color semantics, typography, spacing, component conventions, and chart patterns. The coding agent and visual QA agent both read this file.

---

## 1. ADO Entity Colors

Three ADO work item types anchor the entire color system. Every component, badge, chart series, and label that represents one of these entity types **must** use its canonical color. This mirrors ADO's own icon palette so the report feels continuous with the tool it draws data from.

| Entity | Mantine Token | Hex | Icon | Tabler Component |
|--------|--------------|-----|------|-----------------|
| **Epic** | `yellow.7` | `#F59F00` | Crown | `IconCrown` |
| **Feature** | `violet.6` | `#7048E8` | Trophy | `IconTrophy` |
| **Story** | `blue.6` | `#228BE6` | Book | `IconBook2` |

### Canonical Usage Pattern

```tsx
// Central constants — add to lib/dashboard/constants.ts or similar
export const ADO_ENTITY = {
  epic:    { color: 'yellow.7', icon: IconCrown    } as const,
  feature: { color: 'violet.6', icon: IconTrophy   } as const,
  story:   { color: 'blue.6',   icon: IconBook2    } as const,
} as const;

// Badge usage
<Badge color="yellow.7" leftSection={<IconCrown   size={12} />}>Epic</Badge>
<Badge color="violet.6" leftSection={<IconTrophy  size={12} />}>Feature</Badge>
<Badge color="blue.6"   leftSection={<IconBook2   size={12} />}>Story</Badge>
```

### Rules

- Never swap entity colors — a violet Epic or a blue Feature creates semantic confusion.
- Always pair color with the canonical icon when space allows. Color alone is not sufficient for accessibility.
- `yellow.7` (#F59F00) is **Epic gold**, not a warning color. Its neighboring shade `yellow.6` (#FAB005) is the RYG amber — they are intentionally distinct. Don't place them adjacent without an icon or label differentiating them.

---

## 2. Status / RYG Colors

**Red and green are reserved for status indicators only.** They must never appear as decorative colors, entity type colors, or chart series colors for non-status data.

| Status | Mantine Token | Hex | Semantic |
|--------|--------------|-----|----------|
| On Track / Positive | `green.6` | `#40C057` | Met, complete, improving, positive delta |
| At Risk / Caution | `yellow.6` | `#FAB005` | Warning, near threshold, slight risk |
| Off Track / Negative | `red.6` | `#FA5252` | Exceeded, overdue, missed, negative delta |

### Rules

- **Use `RagBadge`** for any red/amber/green status indicator — do not recreate the pattern inline.
- **Positive/negative deltas**: Green for improvement, red for regression. Never use for neutral or informational trends.
- **Do not use `red.6` or `green.6` as chart series colors** unless the series literally represents status (e.g., a "bugs introduced" line is allowed to be red).
- `yellow.6` (RYG amber) and `yellow.7` (Epic gold) are different shades. Always use the correct one for the context — `yellow.7` for Epic entities, `yellow.6` for at-risk status.

---

## 3. Work Item Category Colors

Overhead and activity categories used in breakdown and composition charts. These are distinct from ADO entity types (Section 1) and must not be confused with RYG status colors.

| Category | Mantine Token | Hex | Notes |
|----------|--------------|-----|-------|
| **Spike** | `lime.6` | `#82C91E` | Research/exploration work. Yellow-green, reads as green but distinct from RYG `green.6` |
| **Support** | `pink.6` | `#E64980` | Reactive support work, incidents |
| **Meetings** | `gray.5` | `#ADB5BD` | Ceremonies, overhead time |

### Why `lime.6` and not `green.6` for Spikes

`green.6` (#40C057) is reserved exclusively for RYG "on track" status. Using it for Spikes would create ambiguity — a green spike bar could be read as a positive status signal. `lime.6` (#82C91E) is visually green but clearly a different hue; it carries no status connotation.

### Rules

- **Spikes** = `lime.6`. Never use `green.6` for spike data, even in chart series.
- **Support** = `pink.6`. Pink has no other semantic claim in this system.
- **Meetings / Ceremonies** = `gray.5`. Neutral grey reflects the neutral/overhead nature of meeting time.
- These three tokens are for **overhead category charts only** (e.g., `OverheadBreakdownChart`, `OverheadCompositionChart`). Do not repurpose them for entity type badges or RYG indicators.

---

## 5. Supplementary Palette

For UI chrome, secondary states, completion indicators, and non-entity data series:

| Token | Hex | Purpose |
|-------|-----|---------|
| `teal.6` | `#12B886` | Milestone completion, done/closed state accents, burnup target lines |
| `teal.0` | `#E6FCF5` | Milestone complete card background tint |
| `gray.5` | `#ADB5BD` | Reference lines, dividers, chart grid lines; also the Meetings category color (Section 3) |
| `gray.4` | `#CED4DA` | Disabled states, empty data, skeleton fills, "not started" badges |
| `indigo.6` | `#4263EB` | Tertiary chart series, secondary metric lines |
| `orange.6` | `#FD7E14` | Tertiary bar segments, general overhead |
| `cyan.6` | `#15AABF` | Quinary chart series |
| `dimmed` | *(Mantine semantic)* | All secondary/supportive text — axis labels, legend text, helper text, metadata |

### Chart Series Color Assignment Order

**General metric charts** (velocity, burnup, trend lines) — assign series in this priority order:

| Priority | Token | Typical Use |
|----------|-------|------------|
| 1st | `blue.6` | Primary metric (velocity, story points, Stories) |
| 2nd | `violet.6` | Secondary metric (feature throughput, Features) |
| 3rd | `teal.6` | Target or completion line |
| 4th | `indigo.6` | Tertiary series |
| 5th | `orange.6` | Quaternary series |
| 6th | `cyan.6` | Quinary series |

**Overhead / activity breakdown charts** — use category-specific colors from Section 3:

| Series | Token |
|--------|-------|
| Spike | `lime.6` |
| Support | `pink.6` |
| Meetings | `gray.5` |
| Other overhead | `orange.6` |

**Reserved — do not use as generic series colors:**

- `yellow.7` — Epic-level data series only
- `red.6` — Status/negative only
- `yellow.6` — Status/at-risk only
- `green.6` — Status/positive only
- `lime.6` — Spikes only
- `pink.6` — Support only

---

## 6. Typography

The app uses Mantine's default system font stack. No custom font is loaded. Do not add `next/font` or a custom `fontFamily` without a design decision.

### Scale

| Role | Mantine Props | Notes |
|------|--------------|-------|
| Page / section heading | `<Title order={2}>` | Workstream section heads only |
| Card / panel heading | `<Text fw={600} size="sm">` | Card titles, panel headers |
| Data value | `<Text fw={500} size="sm">` | Metric numbers, key figures |
| Body | `<Text size="sm">` | Default prose, descriptions |
| Caption / secondary | `<Text size="xs" c="dimmed">` | Axis labels, helper text, metadata |
| Uppercase label | `<Text size="xs" tt="uppercase" fw={500}>` | Section dividers, category labels |
| Chart tooltip value | `<Text size="xs" fw={700}>` | Active value in tooltip only |

### Rules

- `fw={700}` is the maximum weight — reserved for chart tooltip active values. Never use it decoratively.
- Always add `truncate` to text that may overflow its container (card titles, workstream names, sprint labels).
- Use `c="dimmed"` for all secondary text — never hardcode `c="gray"` or a gray hex value.
- Do not mix `size` and explicit `fz` (rem) values in the same component family.

---

## 7. Spacing

Use Mantine layout props exclusively. Do not write inline `marginTop`, `paddingBottom`, or similar CSS properties directly on components.

| Token | Value | Typical Use |
|-------|-------|-------------|
| `xs` | 8px | Icon-to-label gaps, tight list items |
| `sm` | 12px | Card inner padding (secondary) |
| `md` | 16px | Default gap between stacked items, card padding |
| `lg` | 24px | Between card sections |
| `xl` | 32px | Top-level section separation |

**Chart padding exception**: Charts may use inline `padding` values (e.g., `'12px 16px 4px 4px'`) to control SVG whitespace. This is expected and allowed within `lib/charts/` wrappers.

---

## 8. Component Conventions

### Badges

| Context | Color | Variant | Icon |
|---------|-------|---------|------|
| Epic entity type | `yellow.7` | filled | `IconCrown` (12px) |
| Feature entity type | `violet.6` | filled | `IconTrophy` (12px) |
| Story entity type | `blue.6` | filled | `IconBook2` (12px) |
| RAG / health status | via `RagBadge` | filled | none (text only) |
| Milestone status | via `MilestoneStatusBadge` | varies | — |
| Sprint active | `blue` | light | — |
| Sprint complete | `green` | light | — |
| Sprint not started / backlog | `gray` | outline | — |
| Blocked / empty state | `gray` | outline | — |

Never create a one-off colored badge outside these patterns. Extend `RagBadge` or `MilestoneStatusBadge` instead.

### Cards

- Use Mantine `<Card withBorder>` — never apply custom border CSS on a card root.
- Default border radius: `radius="md"` (do not override unless there's a documented reason).
- Teal left-border accent (`borderLeft: '3px solid var(--mantine-color-teal-6)'`) is reserved exclusively for **milestone complete** states.
- Use `<Card.Section>` with `inheritPadding` for visual dividers between card regions.
- `p="md"` is the default card padding. Use `p="sm"` only for compact/dense cards.

### Alerts

- Informational / sync status: `color="blue"`, `variant="light"`
- Warning: `color="yellow"`, `variant="light"`
- Error: `color="red"`, `variant="light"`
- Never use `variant="filled"` for persistent alerts — filled is for toasts/transient notifications only.

### Icons

Always pair entity type labels with the canonical icon. Use `@tabler/icons-react`. Do not substitute alternate icons for entity types.

| Concept | Icon | Size (inline) | Size (standalone) |
|---------|------|--------------|------------------|
| Epic | `IconCrown` | 14px | 16px |
| Feature | `IconTrophy` | 14px | 16px |
| Story | `IconBook2` | 14px | 16px |
| Bug | `IconBug` | 14px | 16px |
| Sprint | `IconRun` | 14px | 16px |
| Milestone | `IconFlag` | 14px | 16px |
| Sync / refresh | `IconRefresh` | 14px | 16px |
| Warning | `IconAlertTriangle` | 14px | 16px |
| Success / check | `IconCircleCheck` | 14px | 16px |

---

## 9. Charts

All charts in `components/Dashboard/` must use `lib/charts/` wrappers (`AppLineChart`, `AppBarChart`, `AppAreaChart`). Never import Recharts components directly in Dashboard component files.

### Axis Conventions

- `interval: 0` on all x-axis ticks — do not let Recharts auto-skip labels.
- Sprint label formatter: `tickFormatter` → formatted sprint name string.
- Sprint tick angle: `-20°`, `textAnchor: 'end'`.
- Tick font size: `12px` (managed in `lib/charts/`).
- Y-axis domain: `[0, 'auto']` unless a specific range is required.

### Reference Lines

- Color: `gray.5` (`#ADB5BD`), dashed stroke.
- Font size: `11px` for reference line labels.
- Use for rolling averages, capacity lines, sprint boundaries, and predicted values.

### Series Colors (see Section 5 for priority order)

- Pass series colors as Mantine dot-tokens (`'blue.6'`, `'violet.6'`) — not hex values.
- Resolution from token to hex happens in `lib/charts/theme.ts` via `resolveColorToken`.
- Prediction / forecast segments: same color as actual series, dashed stroke style.

### Sizing

| Chart type | Min height | Notes |
|------------|-----------|-------|
| Full-width trend line | `240px` | Standard for workstream health cards |
| Stacked bar | `200px` | Overhead breakdown |
| Burnup / area | `220px` | Milestone panels |
| Sparkline / mini | `120px` | Compact inline previews |

- Always wrap charts in `overflow: 'visible'` when reference lines or prediction labels may bleed outside the SVG bounds.

---

## 10. Dark Mode

Mantine handles dark/light mode transparently. Follow these rules to ensure components work correctly in both schemes without manual branching:

- **Never hardcode hex values in component `style={{}}` props.** Use Mantine prop tokens (`color="blue.6"`) or `var(--mantine-color-*)` CSS variables.
- **`var(--mantine-color-default-border)`** — use for all card/section divider borders.
- **`var(--mantine-color-teal-6)`** — use for milestone complete accent borders.
- **Exception**: `lib/charts/theme.ts` manages chart chrome colors (grid lines, ticks, tooltip backgrounds) with explicit hex/rgba by necessity. This is the only permitted location for hardcoded color values.

---

## 11. Accessibility

- Minimum contrast ratio: **4.5:1** for all text against its background.
- **Never rely on color alone** to convey meaning — always pair with an icon, label, or text pattern.
- RYG status indicators must always include a text label (`RagBadge` satisfies this).
- ADO entity badges must always include the canonical icon alongside the entity color.
- Interactive elements must have visible focus rings (Mantine provides these by default — do not suppress them with `outline: none`).

---

## 12. What Each Color Must Never Be Used For

| Color | Reserved For | Never Use For |
|-------|-------------|---------------|
| `red.6` | Off-track status, errors, negative deltas | Decorative accent, chart series (non-status), entity labeling |
| `green.6` | On-track status, positive deltas, success states | Decorative accent, chart series (non-status), entity labeling, Spikes |
| `yellow.6` | At-risk/caution status, RYG amber | Entity type coloring, positive indicators |
| `yellow.7` | Epic entity type only | RYG status, warnings, generic accents |
| `violet.6` | Feature entity type, secondary chart series | Epic labeling, status indicators |
| `blue.6` | Story entity type, primary chart series | Status indicators, Epic/Feature labeling |
| `teal.6` | Milestone completion, done/closed states | Entity type labeling, RYG replacement |
| `lime.6` | Spike category only | RYG status, general "green" accent |
| `pink.6` | Support category only | General accent, entity type labeling |
| `gray.5` | Reference lines, dividers, Meetings category | Status indicators, positive/negative meaning |
| `dimmed` | Secondary/supportive text | Headings, data values, status labels |

---

*This file is the source of truth for visual decisions in this report. All agents and developers should consult it before introducing new color, typography, or component patterns. Update it when deliberate design decisions are made — not as a post-hoc record.*
