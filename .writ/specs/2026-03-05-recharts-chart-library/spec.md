# Recharts Chart Library Specification

> Created: 2026-03-05
> Status: Complete
> Contract Locked: ✅

## Contract Summary

**Deliverable:** A reusable chart component library (`lib/charts/`) built directly on Recharts, replacing `@mantine/charts` with thin wrappers that provide sensible defaults, Mantine theme integration, dark mode support, and escape hatches to raw Recharts props.

**Must Include:** Mantine theme token integration for colors, dark mode support via Mantine's color scheme, and backward-compatible migration of all 5 existing chart components + 2 supporting components.

**Hardest Constraint:** Maintaining visual parity with current charts while restructuring the component architecture — the migration must not regress the existing dashboard UI or break existing tests.

**Success Criteria:** All existing charts render identically (or better), `@mantine/charts` is fully removed from `package.json`, all existing tests pass (updated as needed), and new chart primitives have Storybook stories.

**Scope Boundaries:**

- Included: 3 chart primitives (Line, Bar, Area), shared theming/tooltip/legend/axis utilities, migration of all 5 chart components, Storybook stories, dark mode, `@mantine/charts` removal
- Excluded: New chart types not already in use (Pie, Radar, etc.), animated transitions beyond Recharts defaults, data fetching or API changes

## Detailed Requirements

### Motivation

The project currently uses `@mantine/charts` (v8.2.1) to wrap Recharts (v2.15.4) for all chart rendering. This has hit customization limitations:

- Custom tooltip content requires `as never` type casts to bypass Mantine's constrained API
- Axis configuration relies heavily on pass-through props (`xAxisProps`, `yAxisProps`) that defeat the purpose of the wrapper
- Global CSS hacks in `app/global.css` override Recharts SVG behavior through Mantine class selectors
- The abstraction adds bundle weight without providing sufficient value

### Architecture

#### Library Location

```
lib/charts/
├── index.ts                    # Public barrel export
├── theme.ts                    # useChartTheme() hook + color resolution
├── ChartContainer.tsx          # ResponsiveContainer + overflow handling
├── ChartTooltip.tsx            # Shared tooltip component (evolves from PointValueTooltip)
├── ChartLegend.tsx             # Shared legend component (evolves from current ChartLegend)
├── LineChart.tsx               # Thin wrapper around Recharts LineChart
├── BarChart.tsx                # Thin wrapper around Recharts BarChart
├── AreaChart.tsx               # Thin wrapper around Recharts AreaChart
└── types.ts                    # Shared chart types
```

#### API Design: Thin Wrappers with Escape Hatches

Each chart primitive provides:

1. **Sensible defaults** — consistent axis formatting, tooltip behavior, responsive sizing, dark mode colors
2. **Simplified props** — high-level `series` config similar to current Mantine Charts API
3. **Escape hatches** — `children` prop accepts raw Recharts sub-components (`<XAxis>`, `<Tooltip>`, etc.) that override defaults
4. **Theme integration** — colors resolve from Mantine theme tokens automatically

```tsx
// Simple usage (sensible defaults)
<AppLineChart
  data={chartData}
  dataKey="sprint"
  series={[{ name: 'Velocity', color: 'blue.6' }]}
/>

// With escape hatches (raw Recharts)
<AppLineChart data={chartData} dataKey="sprint" series={[...]}>
  <ReferenceLine y={avgVelocity} stroke="gray" label="Avg" />
  <Brush dataKey="sprint" height={30} />
</AppLineChart>
```

#### Theme Integration

A `useChartTheme()` hook resolves Mantine color tokens (e.g., `'blue.6'`) to CSS color values and handles dark mode:

- Reads from `useMantineTheme()` and `useMantineColorScheme()`
- Provides `resolveColor(token: string): string` utility
- Returns dark-mode-aware axis/grid/background colors
- Single integration point between Mantine theming and Recharts

#### Dark Mode Support

Charts respond to Mantine's color scheme toggle:

- Axis tick labels: light text on dark backgrounds
- Grid lines: muted colors that adapt
- Tooltip backgrounds: theme-aware surfaces
- Chart backgrounds: transparent (inherits from Card)

### Components to Migrate

| Current Component | Location | Chart Type | Notes |
|---|---|---|---|
| `VelocityTrendChart` | `components/Dashboard/` | LineChart | Reference lines, forecast dashed series |
| `OverheadBreakdownChart` | `components/Dashboard/` | LineChart | Multi-series, 4 categories |
| `OverheadCompositionChart` | `components/Dashboard/` | BarChart (stacked) | Stacked bar with legend |
| `BurnupChart` | `components/Dashboard/` | AreaChart | Dual-area with dashed target |
| `ProgramSummarySection` (inline) | `components/Dashboard/` | LineChart + BarChart | Velocity chart + Bug Burndown |
| `PointValueTooltip` | `components/Dashboard/` | (support) | Already speaks Recharts payload format |
| `ChartLegend` | `components/Dashboard/` | (support) | Uses `mantineColorVar()` helper |

### Existing Test Coverage

All chart components have dedicated test files in `__tests__/components/Dashboard/`:

- `VelocityTrendChart.test.tsx`
- `OverheadBreakdownChart.test.tsx`
- `OverheadCompositionChart.test.tsx`
- `BurnupChart.test.tsx`
- `ProgramSummarySection.test.tsx`

These tests must continue to pass after migration (with updated mocks/assertions as needed).

### CSS Cleanup

The following global CSS in `app/global.css` targets Mantine chart classes and should be replaced or removed:

```css
.mantine-LineChart-root svg,
.mantine-LineChart-root .recharts-responsive-container,
.mantine-BarChart-root svg,
.mantine-BarChart-root .recharts-responsive-container {
  overflow: visible !important;
}
```

The `ChartContainer` component will handle overflow natively, eliminating these hacks.

## Implementation Approach

### Strategy: Bottom-Up Migration

1. **Foundation first** — Build `lib/charts/` primitives (theme, container, tooltip, legend)
2. **Chart wrappers** — Create Line/Bar/Area chart wrappers with the new API
3. **Migrate consumers** — Update each Dashboard chart component to use new library
4. **Verify & clean** — Run all tests, remove `@mantine/charts`, clean CSS
5. **Storybook** — Add stories for documentation and visual testing

### Risk Mitigation

- **Visual regression**: Compare before/after screenshots of each chart component
- **Test breakage**: Update mocks incrementally — Recharts components have different DOM structure than Mantine wrappers
- **Bundle size**: Removing `@mantine/charts` should reduce bundle; verify with `pnpm build`
- **Dark mode**: Test both schemes before marking complete
