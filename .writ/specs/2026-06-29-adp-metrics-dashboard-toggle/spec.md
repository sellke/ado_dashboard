# ADP Metrics Dashboard Toggle

> **Status:** Complete
> **Created:** 2026-06-29
> **Owner:** @AdamSellke
> **Origin:** Promoted from issue: `.writ/issues/features/2026-06-29-adp-metrics-dashboard-toggle.md`
> **Contract Locked:** yes

## Specification Contract

**Deliverable:** Add a program-wide **ADP metrics inclusion rule** in Metric Configuration so operators can show or hide ADP content (dashboard panel + export) without changing synced ADO data.

**Must Include:** DB-persisted toggle in the Inclusion Rules tab; when excluded, hide ADP UI, strip ADP from exports, and skip `/api/milestones` fetches.

**Hardest Constraint:** ADP visibility is display/fetch scope, not metric-engine input — it must compose cleanly with workstream scope (cookies) and existing metric inclusion rules without forcing Recalculate.

### Experience Design

- **Entry point:** Dashboard header → **Metric configuration** → **Inclusion Rules** tab → new **ADP metrics** section (checkbox above work-item-type grids).
- **Happy path:** Open panel → toggle ADP off → **Save rules** → toast confirms save → user reloads/reopens dashboard → ADP Milestones panel gone, no milestone network calls.
- **Moment of truth:** After reload, Program Summary no longer shows ADP Milestones and DevTools shows no `/api/milestones` request.
- **Feedback model:** Save toast (same as other rule saves); no Recalculate prompt for this change.
- **Error experience:** If config load fails, panel shows existing recoverable error; active ADP setting unchanged. If save fails, inline/toast error; dashboard keeps prior state until reload succeeds.

### Business Rules

- **Default:** ADP metrics **included** (`includeAdpMetrics: true`) — matches today's behavior.
- **Persistence:** Program-wide DB on `MetricEngineConfig`; shared across all users and both dashboard views (`main`, `streams`).
- **When excluded:** Hide `MilestoneQuarterlyPanel` / "ADP Milestones" in `ProgramSummarySection`; omit export ADP content (program summary Monthly/Quarterly milestone tiles, per-workstream milestone slides, milestone context appendix); do not call `/api/milestones` on dashboard load, scope change, or sync refresh.
- **When included:** Current behavior unchanged.
- **Save semantics:** Persist on **Save rules**; effect applies after **page reload or reopen** (not immediate in-session).
- **Scope boundary:** Does not stop ADO sync of milestone-tagged Features; only affects dashboard display, export, and client-side milestone fetching.
- **Workstream scope:** Independent — scoped workstreams still apply when ADP is included; when excluded, milestone fetch is skipped regardless of scope.

### Success Criteria

1. Fresh DB + default config shows ADP panel and fetches milestones (today's behavior).
2. ADP excluded + reload → panel hidden, no `/api/milestones` requests, export has no ADP slides/tiles.
3. ADP re-included + reload → full ADP panel and export restored.
4. Setting survives server restart (DB-backed).
5. Inclusion Rules tab documents ADP toggle separately from work-item-type checkboxes.

### Scope Boundaries

**Included:**

- `MetricEngineConfig.includeAdpMetrics` field + Prisma migration + seed default.
- Extend `GET /api/metric-config` and `PUT /api/metric-config/rules` to read/write the flag.
- Inclusion Rules UI in `MetricConfigPanel`.
- `DashboardContainer` conditional milestone fetch; `ProgramSummarySection` conditional render.
- Export adapter, slide plan, and program-summary slide gating.
- Unit and component tests.

**Excluded:**

- Per-user/per-browser ADP preference (cookies).
- Per-dashboard ADP settings (main vs streams share one program-wide flag).
- ADO sync changes.
- Workstream card milestone goals (none exist today).
- Auto-reload after save.
- Recalculate-now prompt for ADP toggle changes.

### Technical Concerns

- Store flag on existing `MetricEngineConfig` singleton (`includeAdpMetrics Boolean @default(true)`).
- `DashboardContainer` must load config on mount before milestone fetch to avoid excluded users briefly fetching milestones.
- Export path must respect the same flag when building `ExportInput` / slide plan even when milestones were never fetched.

### Recommendations

- Add helper `isAdpMetricsIncluded(engine: MetricEngineConfigInput): boolean` (default true when field absent).
- Extend rules save payload: `{ rules, includeAdpMetrics }` — persists rules and engine flag in one transaction.
- Panel helper text: "Changes take effect after you reload the dashboard."

### Cross-Spec Overlap

- **`2026-05-28-metric-calculation-config-ui`** (Complete) — extends `MetricConfigPanel` / Inclusion Rules tab / config API.
- **`2026-04-16-powerpoint-export`** (Complete) — export slide plan must honor ADP flag.
- **`2026-06-17-cookie-persisted-settings`** (Complete) — workstream scope stays cookie-based; ADP is orthogonal program-wide DB setting.

## Current State

- `ProgramSummarySection` always renders the **ADP Milestones** panel when milestone props are passed.
- `DashboardContainer` always fetches `/api/milestones` on load, scope change, and post-sync refresh.
- Metric Configuration covers thresholds, work-item inclusion rules, and velocity/rolling settings — not ADP visibility.
- `programRollup` is used in PowerPoint export (Monthly Milestone + Quarterly Progress tiles on program summary slide; milestone slides and appendix) but not rendered in live dashboard UI today.

## Detailed Requirements

### Config Model

Add `includeAdpMetrics: boolean` to:

- Prisma `MetricEngineConfig` model (default `true`).
- `MetricEngineConfigInput` in `lib/metrics/types.ts`.
- `DEFAULT_ENGINE_CONFIG` constant (`includeAdpMetrics: true`).
- `loadMetricConfig()` merge logic (default true when row missing).

### API

- **GET `/api/metric-config`** — `engine` object includes `includeAdpMetrics`.
- **PUT `/api/metric-config/rules`** — accept optional `includeAdpMetrics: boolean` alongside `rules` array; validate boolean type; upsert engine config in same transaction as rule upserts; return `{ rules, includeAdpMetrics }`.

No new endpoint required.

### Inclusion Rules UI

In `MetricConfigPanel` → Inclusion Rules tab:

- Add section **ADP metrics** above work-item-type grids.
- Single checkbox: "Include ADP metrics on dashboard and export" (checked = included).
- Helper text explaining reload requirement and that ADO sync is unaffected.
- `saveRules()` sends current checkbox state as `includeAdpMetrics`.
- Success toast unchanged; no Recalculate button activation for ADP-only saves.

### Dashboard Behavior

On `DashboardContainer` mount:

1. Fetch `GET /api/metric-config` (or reuse a lightweight fetch of `engine.includeAdpMetrics`).
2. If `includeAdpMetrics === false`:
   - Skip `fetchMilestones()` entirely (including on scope refresh and post-sync).
   - Pass `milestonesLoading: false`, empty milestone groups, `programRollup: null`.
   - Do not show ADP section in `ProgramSummarySection`.
3. If `true`: existing behavior.

`ProgramSummarySection` should not render the ADP Milestones stack when ADP is excluded (prop-driven, e.g. `showAdpMetrics={false}`).

### Export Behavior

When ADP excluded at export time:

- `buildSlidePlan`: omit `workstream-milestone` descriptors; omit `milestone-context-appendix` when appendices enabled.
- `buildTiles` in program-summary slide: omit Monthly Milestone and Quarterly Progress tiles (keep first three program metric tiles only).
- `enrichExportInput` / adapter: pass `milestones: []`, `programRollup: null`, `milestoneContext: null` when excluded.
- `DashboardContainer.handleExport` reads current `includeAdpMetrics` from loaded config state.

### State Catalog

| State | ADP included | ADP excluded |
|---|---|---|
| Dashboard load | Fetches milestones; panel visible | No milestone fetch; panel hidden |
| Scope save + reload | Milestones refetch with scope | Still no milestone fetch |
| Sync + reload | Milestones refetch after sync | Still no milestone fetch |
| Metric config save (no reload) | Prior session behavior until reload | Prior session behavior until reload |
| Export | Full ADP slides/tiles when data exists | No ADP slides/tiles |
| Config API down | Panel shows per last loaded config; milestone fetch follows loaded flag | Same |

## Implementation Approach

1. **Story 1** — Schema migration, types, loader, rules API extension, tests.
2. **Story 2** — Inclusion Rules UI checkbox + save wiring.
3. **Story 3** — Dashboard config load, conditional fetch/render.
4. **Story 4** — Export gating + integration tests.

Shared helper in `lib/metrics/config-rules.ts` or new `lib/metrics/adp-visibility.ts`:

```typescript
export function isAdpMetricsIncluded(engine: Pick<MetricEngineConfigInput, 'includeAdpMetrics'>): boolean {
  return engine.includeAdpMetrics !== false;
}
```

## Files in Scope

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `includeAdpMetrics` to `MetricEngineConfig` |
| `prisma/seed.ts` | Seed default `true` |
| `lib/metrics/types.ts` | Extend `MetricEngineConfigInput` |
| `lib/metrics/config-loader.ts` | Load/merge `includeAdpMetrics` |
| `app/api/metric-config/rules/route.ts` | Accept/persist `includeAdpMetrics` |
| `components/Dashboard/MetricConfigPanel.tsx` | ADP checkbox in Inclusion Rules tab |
| `components/Dashboard/DashboardContainer.tsx` | Load config; conditional milestone fetch/export |
| `components/Dashboard/ProgramSummarySection.tsx` | Conditional ADP section |
| `components/Dashboard/DashboardShell.tsx` | Forward `showAdpMetrics` prop if needed |
| `lib/export/slide-plan.ts` | Gate milestone slide kinds |
| `lib/export/slides/program-summary.tsx` | Gate milestone tiles |
| `lib/export/adapter.ts` | Gate milestone context mapping |
| `__tests__/app/api/metric-config/` | API tests |
| `__tests__/components/Dashboard/MetricConfigPanel.test.tsx` | UI tests |
| `__tests__/components/Dashboard/DashboardContainer.test.tsx` | Fetch gating tests |
| `__tests__/lib/export/` | Export gating tests |

## Story Plan

| Story | Description | Dependencies |
|---|---|---|
| 1 | Schema, loader, and rules API for `includeAdpMetrics` | None |
| 2 | Inclusion Rules UI checkbox and save | Story 1 |
| 3 | Dashboard conditional fetch and panel visibility | Story 1 |
| 4 | Export gating and end-to-end tests | Stories 1, 3 |

Stories 2 and 3 can proceed in parallel after Story 1.
