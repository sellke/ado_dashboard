# Recharts Chart Library — Technical Specification

> Spec: `../spec.md`
> Related stories: `../user-stories/`

## Tech Stack Reference

| Technology | Version |
|------------|---------|
| Next.js | 15.3.3 (App Router) |
| React | 19.1.0 |
| Mantine | 8.2.1 (@mantine/core, @mantine/hooks — NOT @mantine/charts after migration) |
| Recharts | 2.15.4 |
| TypeScript | 5.8.3 (strict) |
| Jest | 30 |
| React Testing Library | 16 |
| Storybook | 8.6.8 |
| PostCSS | with Mantine preset |

---

## 1. Architecture Overview

### Component Hierarchy Diagram

```
lib/charts/
├── index.ts                    # Public barrel export
├── theme.ts                    # useChartTheme() hook + color resolution
├── types.ts                    # ChartSeries, ChartTheme, shared types
├── ChartContainer.tsx          # ResponsiveContainer + overflow handling
├── ChartTooltip.tsx            # Shared tooltip (evolves from PointValueTooltip)
├── ChartLegend.tsx             # Shared legend (evolves from ChartLegend)
├── LineChart.tsx               # AppLineChart — thin Recharts LineChart wrapper
├── BarChart.tsx                # AppBarChart — thin Recharts BarChart wrapper
└── AreaChart.tsx               # AppAreaChart — thin Recharts AreaChart wrapper
```

### Consumption Flow

```
Dashboard Components (components/Dashboard/)
│
├── VelocityTrendChart ──────► AppLineChart
│   └── ChartLegend (external)
│   └── ChartTooltip (via chart)
│
├── OverheadBreakdownChart ──► AppLineChart
│   └── ChartLegend (external)
│   └── ChartTooltip (via chart)
│
├── OverheadCompositionChart ► AppBarChart (stacked)
│   └── ChartLegend (built-in via Recharts)
│   └── ChartTooltip (default)
│
├── BurnupChart ─────────────► AppAreaChart
│   └── ChartTooltip (default)
│
└── ProgramSummarySection ──► AppLineChart + AppBarChart
    └── ChartLegend (external for velocity)
    └── ChartTooltip (via chart)
```

### Data Flow

```
Dashboard ViewModels (lib/dashboard/types.ts)
    │
    ▼
Chart components transform data → { sprint, seriesKey1, seriesKey2, ... }
    │
    ▼
AppLineChart / AppBarChart / AppAreaChart
    │
    ├── useChartTheme() ──► resolveColor(), axisColors, gridColors, tooltipColors
    ├── ChartContainer ──► ResponsiveContainer (width: 100%, height: h)
    ├── series prop ──────► Line/Bar/Area + Line (Recharts sub-components)
    └── children ────────► Escape hatch: ReferenceLine, Brush, custom Tooltip, etc.
```

---

## 2. Theme System Design

### `useChartTheme()` Hook

**Location:** `lib/charts/theme.ts`

**Purpose:** Single integration point between Mantine theming and Recharts. Resolves Mantine color tokens to CSS color values and provides dark-mode-aware color sets for axis labels, grid lines, tooltips, and backgrounds.

**Dependencies:**
- `useMantineTheme()` — access to `theme.colors`, `theme.fn`
- `useMantineColorScheme()` or `useComputedColorScheme()` — current color scheme (`'light' | 'dark' | 'auto'`)

**Return Type:**

```typescript
interface ChartTheme {
  /** Resolves Mantine token (e.g. 'blue.6') to CSS color value */
  resolveColor(token: string): string;
  /** Axis tick label fill color */
  axisTickFill: string;
  /** Grid line stroke color */
  gridStroke: string;
  /** Tooltip background color */
  tooltipBackground: string;
  /** Tooltip text color */
  tooltipText: string;
  /** Tooltip border color */
  tooltipBorder: string;
  /** Chart background (typically transparent to inherit from Card) */
  chartBackground: string;
  /** Whether dark mode is active */
  isDark: boolean;
}
```

### Color Token Resolution Algorithm

1. **Input:** Mantine color token string (e.g. `'blue.6'`, `'red.5'`, `'gray.4'`)
2. **Parse:** Split on `.` → `['blue', '6']` or `['gray', '4']`
3. **Resolve:**
   - Use Mantine's `theme.fn.variant()` or direct `theme.colors[color][shade]` if available
   - Fallback: construct CSS variable `var(--mantine-color-${color}-${shade})` (e.g. `var(--mantine-color-blue-6)`)
   - Mantine uses dot notation in API but hyphen in CSS: `blue.6` → `blue-6`
4. **Return:** Resolved string (CSS variable or computed hex/rgb when theme provides it)

**Implementation note:** Mantine 8 exposes colors via CSS variables. The `resolveColor` function can return the variable string directly (`var(--mantine-color-blue-6)`) since CSS variables resolve at render time and respect the active theme. For programmatic use (e.g. Recharts `stroke` prop), the variable works in inline styles.

### Light/Dark Mode Color Maps

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `axisTickFill` | `var(--mantine-color-dimmed)` or `#868e96` | `var(--mantine-color-dark-1)` or `#adb5bd` |
| `gridStroke` | `var(--mantine-color-gray-2)` or `#e9ecef` | `var(--mantine-color-dark-4)` or `#373a40` |
| `tooltipBackground` | `rgba(255,255,255,0.95)` | `var(--mantine-color-dark-6)` |
| `tooltipText` | `var(--mantine-color-dark-7)` | `var(--mantine-color-gray-1)` |
| `tooltipBorder` | `var(--mantine-color-gray-2)` | `var(--mantine-color-dark-4)` |
| `chartBackground` | `transparent` | `transparent` |

**Integration with `useComputedColorScheme()`:** When `colorScheme` is `'auto'`, use `window.matchMedia('(prefers-color-scheme: dark)')` or Mantine's computed value. `useMantineColorScheme()` returns `{ colorScheme, setColorScheme }`; the effective scheme is what Mantine applies to the DOM.

---

## 3. Chart Primitive API Design

### Shared Base Props (All Chart Types)

```typescript
interface ChartBaseProps<T> {
  data: T[];
  dataKey: keyof T & string;
  series: ChartSeries[];
  height?: number;
  children?: React.ReactNode;  // Escape hatch: raw Recharts components
}
```

### ChartSeries Type

```typescript
interface ChartSeries {
  name: string;
  color: string;           // Mantine token, e.g. 'blue.6'
  label?: string;          // Optional display label (e.g. 'Completed SP')
  strokeDasharray?: string; // e.g. '5 5' for dashed lines
}
```

### LineChart (AppLineChart)

**Props:**

```typescript
interface AppLineChartProps<T> extends ChartBaseProps<T> {
  withDots?: boolean;
  connectNulls?: boolean;
  curveType?: 'linear' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter';
  referenceLines?: Array<{ y: number; color?: string; label?: string }>;
  xAxisProps?: Partial<XAxisProps>;
  yAxisProps?: Partial<YAxisProps>;
  tooltipProps?: Partial<TooltipProps<number, string>>;
}
```

**`series` → Recharts mapping:**
- Each `series` entry maps to one `<Line>` component
- `dataKey` of each Line = `series[].name`
- `stroke` = `resolveColor(series[].color)`
- `strokeDasharray` = `series[].strokeDasharray` when present
- `dot` = `{ r: 4 }` when `withDots` is true, else `false`

**Children escape hatch:**
- If `children` includes `<XAxis>`, `<YAxis>`, `<Tooltip>`, `<ReferenceLine>`, etc., those override or supplement defaults
- Merge strategy: Default render `<XAxis>`, `<YAxis>`, `<CartesianGrid>`, `<Tooltip>`, `<Line>` for each series. If `children` contains `<ReferenceLine>`, append; if `<Tooltip>`, replace default; if `<XAxis>`, replace default (or use a slot pattern)

**Recommended implementation:** Use a `defaultSlots` pattern: render children first, then fill in defaults only for slots not provided. For example, check for `React.Children.toArray(children).some(c => c.type === XAxis)` — if not present, render default XAxis.

**Simpler approach:** Always render defaults first, then append `children` at the end. Recharts typically allows multiple Tooltips/XAxis (with `id` props). For Tooltip, prefer: if children include a Tooltip, use it; else use default. Document that passing `<Tooltip>` in children replaces the default.

### BarChart (AppBarChart)

**Props:**

```typescript
interface AppBarChartProps<T> extends ChartBaseProps<T> {
  type?: 'default' | 'stacked';
  withLegend?: boolean;
  xAxisProps?: Partial<XAxisProps>;
  yAxisProps?: Partial<YAxisProps>;
  tooltipProps?: Partial<TooltipProps<number, string>>;
  legendProps?: Partial<LegendProps>;
}
```

**`series` → Recharts mapping:**
- Each `series` entry maps to one `<Bar>` component
- `dataKey` = `series[].name`
- `fill` = `resolveColor(series[].color)`
- `stackId` = `'stack'` when `type === 'stacked'` (all bars share same stackId for stacking)

**Children escape hatch:** Same as LineChart — `children` can include `<ReferenceLine>`, `<Brush>`, custom `<Tooltip>`, etc.

### AreaChart (AppAreaChart)

**Props:**

```typescript
interface AppAreaChartProps<T> extends ChartBaseProps<T> {
  curveType?: 'linear' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter';
  xAxisProps?: Partial<XAxisProps>;
  yAxisProps?: Partial<YAxisProps>;
  tooltipProps?: Partial<TooltipProps<number, string>>;
}
```

**`series` → Recharts mapping:**
- Each `series` entry maps to one `<Area>` + `<Line>` (Area fills, Line outlines)
- `dataKey` = `series[].name`
- `stroke` = `resolveColor(series[].color)`
- `fill` = same color with opacity (e.g. `fillOpacity: 0.3`)
- `strokeDasharray` = `series[].strokeDasharray` when present (e.g. for target line)

**Children escape hatch:** Same pattern as LineChart.

---

## 4. Tooltip Design

### ChartTooltip Component

**Location:** `lib/charts/ChartTooltip.tsx`  
**Evolution:** From `PointValueTooltip` in `components/Dashboard/PointValueTooltip.tsx`

### Recharts Payload Format

Recharts passes to custom tooltip content:

```typescript
interface TooltipPayload {
  name: string;
  value?: number | null;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  payload?: Record<string, unknown>;
  dataKey?: string;
}
```

### Deduplication Logic

**Current behavior (PointValueTooltip):** Filter entries where `value` is not null/undefined, and deduplicate by `value` (same value at same point = show once).

```typescript
const seen = new Set<number>();
const entries = payload.filter((p) => {
  if (p.value == null) return false;
  if (seen.has(p.value)) return false;
  seen.add(p.value);
  return true;
});
```

**Preserve this logic** in ChartTooltip. Optionally extend: deduplicate by `(name, value)` if multiple series can share the same value but different names (e.g. stacked bars). Current use cases: single value or multi-value with distinct names; dedup by value alone is sufficient.

### Theme-Aware Styling

**Light mode:**
- Background: `rgba(255,255,255,0.92)` (current PointValueTooltip)
- Text: series color for value, `dimmed` for label
- Border: none or subtle

**Dark mode:**
- Background: `var(--mantine-color-dark-6)` or equivalent
- Text: `var(--mantine-color-gray-1)` for value, `var(--mantine-color-dark-2)` for label
- Border: `var(--mantine-color-dark-4)`

**Use `useChartTheme()`** to read `tooltipBackground`, `tooltipText`, `tooltipBorder`.

### Value Formatting

- Integer: `v % 1 === 0 ? String(v) : v.toFixed(1)`
- Optional: allow `formatValue` prop for custom formatters

---

## 5. Legend Design

### ChartLegend Component

**Location:** `lib/charts/ChartLegend.tsx`  
**Evolution:** From `components/Dashboard/ChartLegend.tsx`

### Props

```typescript
interface ChartLegendItem {
  label: string;
  color: string;   // Mantine token, e.g. 'blue.6'
  dashed?: boolean;
}

interface ChartLegendProps {
  items: ChartLegendItem[];
  /** Optional: override layout (default: horizontal, center) */
  align?: 'start' | 'center' | 'end';
}
```

### Color Resolution

**Current:** `mantineColorVar(color)` → `var(--mantine-color-${color.replace('.', '-')})`

**New:** Use `resolveColor(token)` from `useChartTheme()`. This ensures:
- Consistent resolution with chart primitives
- Dark mode: Mantine CSS variables already resolve correctly in light/dark

**Note:** `resolveColor` can return the same variable string; `var(--mantine-color-blue-6)` works in both modes because Mantine switches the variable values when the scheme changes.

### Legend Indicator Style

- **Solid:** `borderTop: 2px solid ${color}`
- **Dashed:** `borderTop: 2px dashed ${color}`

Use a 16×0 or 16×2px Box as the indicator (matching current ChartLegend).

### Integration with Recharts Legend

- **External legend:** ChartLegend is a standalone component used below charts (VelocityTrendChart, OverheadBreakdownChart, ProgramSummarySection velocity card).
- **Built-in legend:** Recharts `<Legend>` component for BarChart (OverheadCompositionChart, ProgramSummarySection bug burndown). The built-in legend needs theme-aware colors: pass `resolveColor(series[].color)` to each Bar's `fill` so Recharts Legend picks up the correct colors.

---

## 6. ChartContainer Design

### Purpose

- Wraps Recharts `ResponsiveContainer`
- Handles overflow visibility (replacing global CSS hack)
- Manages height

### Props

```typescript
interface ChartContainerProps {
  height: number;
  children: React.ReactNode;
  /** Optional: min width for very narrow viewports */
  minWidth?: number;
}
```

### Implementation

```tsx
<div style={{ width: '100%', height, overflow: 'visible', position: 'relative' }}>
  <ResponsiveContainer width="100%" height={height}>
    {children}
  </ResponsiveContainer>
</div>
```

**Overflow handling:** Recharts `ResponsiveContainer` renders an SVG that can clip content (e.g. dots at chart edges). The global CSS currently sets `overflow: visible !important` on `.mantine-LineChart-root .recharts-responsive-container`. ChartContainer wraps the chart in a div with `overflow: visible` and ensures the ResponsiveContainer's inner SVG/div also allows overflow. Recharts may apply `overflow: hidden` by default; we may need to pass a style or className to override. Check Recharts ResponsiveContainer API — it might accept `style={{ overflow: 'visible' }}` or a wrapper.

**Alternative:** Apply `overflow: visible` to the chart container div. If Recharts ResponsiveContainer uses a nested structure, we may need a scoped CSS class in ChartContainer:

```css
.chart-container-root .recharts-responsive-container {
  overflow: visible !important;
}
```

Or use a data attribute and target it in a CSS module. The key is to keep the fix local to `lib/charts/` and remove the global `.mantine-LineChart-root` rules from `app/global.css`.

---

## 7. Migration Strategy

### Step-by-Step Approach

| Step | Action | Verification |
|------|--------|--------------|
| 1 | Build `lib/charts/` foundation (theme, types, ChartContainer) | Unit tests for useChartTheme, ChartContainer |
| 2 | Build ChartTooltip, ChartLegend | Unit tests, Storybook |
| 3 | Build Chart primitives (Line, Bar, Area) | Unit tests, Storybook |
| 4 | Migrate VelocityTrendChart | Update import, use AppLineChart, ChartTooltip, ChartLegend; run VelocityTrendChart tests |
| 5 | Migrate OverheadBreakdownChart | Same pattern; run OverheadBreakdownChart tests |
| 6 | Migrate OverheadCompositionChart | Use AppBarChart; run OverheadCompositionChart tests |
| 7 | Migrate BurnupChart | Use AppAreaChart; run BurnupChart tests |
| 8 | Migrate ProgramSummarySection | Update both LineChart and BarChart; run ProgramSummarySection tests |
| 9 | Remove `@mantine/charts` from package.json | `pnpm remove @mantine/charts` |
| 10 | Remove `@mantine/charts/styles.css` import if present | Grep for import |
| 11 | Remove global CSS hack from app/global.css | Delete lines 1–7 |
| 12 | Add Storybook stories for all chart primitives | Visual verification |
| 13 | Run full test suite | `pnpm test` |
| 14 | Run build | `pnpm build` |
| 15 | Manual visual check in light and dark mode | All 5 chart components |

### Test Update Strategy

**Current tests mock `@mantine/charts` with a simple div that exposes data attributes:**

```tsx
jest.mock('@mantine/charts', () => ({
  LineChart: (props) => (
    <div data-testid="velocity-line-chart"
         data-series={JSON.stringify(props.series)}
         data-points={JSON.stringify(props.data)}
         ... />
  ),
}));
```

**After migration:**
- Mock `@/lib/charts` or `@/lib/charts/LineChart` instead
- Or: mock Recharts components (`recharts`) so Chart primitives render a simplified structure
- Or: don't mock — test the actual AppLineChart with shallow data. Recharts renders SVG; jsdom can render it. Assert on presence of chart container, data passed, etc.

**Recommended:** Mock `@/lib/charts` or the specific chart primitive (e.g. `AppLineChart`) with the same data-attribute pattern. This keeps tests fast and focused on the Dashboard component's behavior (data transformation, empty states, etc.). Update the mock to match the new component name and props.

**Example updated mock:**

```tsx
jest.mock('@/lib/charts', () => ({
  AppLineChart: (props: Record<string, unknown>) => (
    <div
      data-testid="velocity-line-chart"
      data-series={JSON.stringify(props.series)}
      data-points={JSON.stringify(props.data)}
      data-reference-lines={JSON.stringify(props.referenceLines)}
      data-h={String(props.height)}
    />
  ),
}));
```

**Note:** VelocityTrendChart test expects `series` to include `Predicted` but the component uses `Forecasted`. Align test expectations with actual component behavior during migration.

---

## 8. Dark Mode Implementation

### Color Palette

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Axis tick labels | `var(--mantine-color-dimmed)` | `var(--mantine-color-dark-1)` |
| Axis line | `var(--mantine-color-gray-2)` | `var(--mantine-color-dark-4)` |
| Grid stroke | `var(--mantine-color-gray-2)` | `var(--mantine-color-dark-4)` |
| Tooltip background | `rgba(255,255,255,0.95)` | `var(--mantine-color-dark-6)` |
| Tooltip text | `var(--mantine-color-dark-7)` | `var(--mantine-color-gray-1)` |
| Chart background | `transparent` | `transparent` |
| Series colors | Mantine tokens (e.g. blue.6) | Same — CSS variables resolve per scheme |

### Recharts Props Requiring Theme Awareness

| Recharts Component | Prop | Light | Dark |
|--------------------|------|-------|------|
| XAxis | `tick={{ fill: ... }}` | axisTickFill | axisTickFill |
| YAxis | `tick={{ fill: ... }}` | axisTickFill | axisTickFill |
| CartesianGrid | `stroke` | gridStroke | gridStroke |
| Tooltip | `contentStyle` | background, color | background, color |
| Tooltip | `wrapperStyle` | border if needed | border if needed |
| ReferenceLine | `stroke` | resolveColor | resolveColor |
| ReferenceLine | `label={{ fill: ... }}` | axisTickFill | axisTickFill |

### Implementation

- `useChartTheme()` returns `axisTickFill`, `gridStroke`, `tooltipBackground`, `tooltipText` based on `colorScheme`
- Chart primitives pass these to Recharts sub-components
- ChartTooltip uses `tooltipBackground`, `tooltipText`, `tooltipBorder` from theme

---

## 9. Testing Strategy

### jsdom Limitations with SVG

- jsdom can render SVG elements
- Recharts produces SVG output; basic structure exists in DOM
- Recharts may use `getBoundingClientRect`, `getBBox`, or other layout APIs that jsdom can stub
- Some Recharts internals may expect a browser environment; if tests fail, mock at the chart boundary

### What to Mock

| Scenario | Mock approach |
|----------|---------------|
| Dashboard component tests | Mock `@/lib/charts` or `AppLineChart`/`AppBarChart`/`AppAreaChart` with data-attribute div |
| Chart primitive tests | Option A: Don't mock Recharts; render full chart with minimal data. Option B: Mock Recharts `ResponsiveContainer` to avoid layout. Option C: Mock Recharts `LineChart`/`BarChart`/`AreaChart` to return a simple div. |
| useChartTheme tests | Mock `useMantineTheme` and `useMantineColorScheme`; assert on returned values |
| ChartTooltip tests | Render ChartTooltip with mock payload; assert on output structure and values |
| ChartLegend tests | Render ChartLegend with items; assert on indicators and labels |

### What to Assert

**Chart primitives:**
- Renders without throwing
- Renders correct number of Line/Bar/Area for each series
- Passes resolved colors to Recharts (stroke/fill)
- Renders children when provided
- Applies default XAxis, YAxis, CartesianGrid, Tooltip when no children override

**ChartTooltip:**
- Returns null when `!active` or `!payload`
- Deduplicates by value
- Formats single value with single-entry layout
- Formats multiple values with multi-entry layout
- Applies theme colors (can snapshot or assert on style)

**ChartLegend:**
- Renders one item per entry
- Solid indicator when `dashed` is false
- Dashed indicator when `dashed` is true
- Resolves color via theme

**Integration (Dashboard components):**
- Renders chart when data present
- Shows empty state when data empty
- Passes correct data shape to chart
- Passes correct series config
- Passes reference lines when applicable

### Snapshot Testing

- Use sparingly; prefer explicit assertions
- If used, snapshot structure only (e.g. ChartTooltip output); avoid snapshotting full SVG (brittle)

---

## 10. Bundle Impact

### Current State

- `@mantine/charts`: ^8.2.1 (direct dependency)
- `recharts`: ^2.15.4 (direct dependency)
- `@mantine/charts` depends on `recharts` (peer dependency)

### Expected Change

| Package | Before | After |
|---------|--------|-------|
| @mantine/charts | ~1.2–1.3 MB unpacked | **Removed** |
| recharts | ~2.15.4 (unchanged) | **Unchanged** (already direct) |
| lib/charts/* | — | **Small addition** (~5–10 KB estimated) |

### Analysis

- **Removal of @mantine/charts:** Eliminates the wrapper layer. Mantine Charts adds its own components, styles, and abstractions. Removing it reduces bundle size.
- **Recharts:** Remains; we use it directly. No change in Recharts bundle.
- **lib/charts:** Thin wrappers, theme hook, tooltip, legend. Minimal code; negligible impact.
- **Net effect:** Expected **reduction** of roughly 50–150 KB (gzipped) depending on tree-shaking. Actual numbers depend on what was imported from @mantine/charts.

### Verification

1. Run `pnpm build` before migration; note `.next` chunk sizes or use `ANALYZE=true pnpm build` if bundle analyzer is configured.
2. Run `pnpm build` after migration.
3. Compare main chunk and chart-related chunks.

### Bundle Analyzer

The project has `"analyze": "ANALYZE=true next build"`. Use this to compare before/after bundle composition.

---

## Appendix: File Checklist

| File | Purpose |
|------|---------|
| `lib/charts/index.ts` | Barrel export |
| `lib/charts/theme.ts` | useChartTheme, resolveColor |
| `lib/charts/types.ts` | ChartSeries, ChartTheme, shared types |
| `lib/charts/ChartContainer.tsx` | ResponsiveContainer + overflow |
| `lib/charts/ChartTooltip.tsx` | Shared tooltip |
| `lib/charts/ChartLegend.tsx` | Shared legend |
| `lib/charts/LineChart.tsx` | AppLineChart |
| `lib/charts/BarChart.tsx` | AppBarChart |
| `lib/charts/AreaChart.tsx` | AppAreaChart |
