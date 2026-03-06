# Recharts Chart Library — Spec Lite

> Created: 2026-03-05 | Status: Complete | Contract: ✅ Locked

## One-Line Summary

Replace `@mantine/charts` with a reusable Recharts-based chart library in `lib/charts/` that provides thin wrappers with Mantine theme integration, dark mode, and escape hatches to raw Recharts.

## Key Decisions

- **Location:** `lib/charts/`
- **API style:** Thin wrappers — sensible defaults + escape hatches via `children` prop
- **Theming:** Pull from Mantine theme tokens via `useChartTheme()` hook
- **Dark mode:** Yes — charts respect Mantine color scheme toggle
- **Storybook:** Yes — stories for each primitive + composition examples
- **Cleanup:** Remove `@mantine/charts` entirely after migration

## Library Structure

```
lib/charts/
├── index.ts          # Barrel export
├── theme.ts          # useChartTheme() hook, resolveColor()
├── ChartContainer.tsx # ResponsiveContainer + overflow
├── ChartTooltip.tsx  # Shared tooltip
├── ChartLegend.tsx   # Shared legend
├── LineChart.tsx      # Recharts LineChart wrapper
├── BarChart.tsx       # Recharts BarChart wrapper
├── AreaChart.tsx      # Recharts AreaChart wrapper
└── types.ts          # Shared types
```

## Components to Migrate (5 charts + 2 support)

| Component | Type | Key Features |
|---|---|---|
| VelocityTrendChart | Line | Reference lines, forecast dashed series |
| OverheadBreakdownChart | Line | Multi-series (4 categories) |
| OverheadCompositionChart | Bar | Stacked, built-in legend |
| BurnupChart | Area | Dual-area, dashed target line |
| ProgramSummarySection | Line + Bar | Inline velocity + bug burndown |
| PointValueTooltip | Support | Custom tooltip (already Recharts-compatible) |
| ChartLegend | Support | Custom legend with Mantine color tokens |

## Scope Boundaries

- **In:** 3 chart primitives, shared utilities, migration of all existing charts, Storybook, dark mode, @mantine/charts removal
- **Out:** New chart types (Pie, Radar, etc.), custom animations, API/data changes

## Success Criteria

1. All existing charts render identically (or better)
2. `@mantine/charts` removed from `package.json`
3. All existing tests pass
4. New chart primitives have Storybook stories
5. Dark mode works for all charts
