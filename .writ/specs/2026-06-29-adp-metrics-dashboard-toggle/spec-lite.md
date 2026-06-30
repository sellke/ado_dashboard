# ADP Metrics Dashboard Toggle (Lite)

> Source: .writ/specs/2026-06-29-adp-metrics-dashboard-toggle/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Program-wide DB toggle `includeAdpMetrics` in Metric Config Inclusion Rules; when false, hide ADP panel, skip `/api/milestones`, strip ADP from export.

**Implementation Approach:**
- Add `includeAdpMetrics Boolean @default(true)` to `MetricEngineConfig`; extend types/loader.
- Extend `PUT /api/metric-config/rules` with `{ rules, includeAdpMetrics }` — single transaction.
- Helper `isAdpMetricsIncluded(engine)` — default true when absent.
- `MetricConfigPanel` Inclusion Rules tab: ADP checkbox above work-item grids; Save rules persists flag.
- `DashboardContainer`: load config on mount; skip milestone fetch/export data when excluded.
- Export: gate `workstream-milestone`, milestone appendix, program-summary milestone tiles.

**Files in Scope:**
- `prisma/schema.prisma`, `prisma/seed.ts` — field + default
- `lib/metrics/types.ts`, `config-loader.ts` — type + load merge
- `app/api/metric-config/rules/route.ts` — read/write flag
- `components/Dashboard/MetricConfigPanel.tsx` — UI
- `components/Dashboard/DashboardContainer.tsx`, `ProgramSummarySection.tsx` — gating
- `lib/export/slide-plan.ts`, `slides/program-summary.tsx`, `adapter.ts` — export gating

**Error Handling:**
- Config load failure → panel error; dashboard keeps last-known flag or defaults included
- Save validation failure → 422; checkbox state unchanged in DB
- Export with ADP excluded → omit slides/tiles silently (no error)

**Integration Points:**
- Orthogonal to cookie workstream scope (`2026-06-17-cookie-persisted-settings`)
- Extends metric config UI (`2026-05-28-metric-calculation-config-ui`)
- No Recalculate required; reload applies dashboard/export changes

---

## For Review Agents

**Acceptance Criteria:**
1. Default DB seed: ADP included; dashboard fetches milestones and shows panel.
2. ADP excluded + page reload: no `/api/milestones` calls; panel hidden.
3. Export with ADP excluded: no milestone slides/tiles/appendix.
4. Save via Inclusion Rules persists to DB; survives restart.
5. Workstream scope and sprint metrics unchanged when ADP excluded.

**Business Rules:**
- Program-wide singleton on `MetricEngineConfig`; not per-dashboard or per-user
- Default `includeAdpMetrics: true`
- Save rules persists flag; effect after reload (not in-session)
- ADO sync unaffected; only client fetch/display/export gated
- No Recalculate prompt for ADP toggle

**Experience Design:**
- Entry: Metric configuration → Inclusion Rules → ADP metrics checkbox
- Happy path: uncheck → Save rules → toast → reload → panel gone
- Moment of truth: no milestone network activity after reload
- Feedback: existing save toast; helper text mentions reload
- Error: config load/save errors use existing panel patterns

---

## For Testing Agents

**Success Criteria:**
1. API tests: rules PUT persists `includeAdpMetrics`; GET returns it on `engine`.
2. Component tests: panel checkbox save; DashboardContainer skips fetch when false.
3. Export tests: slide plan excludes milestone kinds when flag false.
4. New code coverage ≥80%; API validation paths 100%.

**Shadow Paths to Verify:**
- **Happy path:** included → milestones fetch + panel + export ADP content
- **Nil input:** missing engine row → default included
- **Empty input:** N/A (boolean flag)
- **Upstream error:** config GET 500 → dashboard defaults included or last-known

**Edge Cases:**
- Save ADP off without reload → session still shows prior ADP state until reload
- ADP off + export → no milestone slides even if stale milestone state in memory
- ADP off + sync → no milestone refetch until re-included + reload
- Scope change with ADP off → metrics refetch; milestones still skipped

**Test Strategy:**
- Unit: loader merge, `isAdpMetricsIncluded`, slide-plan gating
- API: rules route with `includeAdpMetrics`
- Component: MetricConfigPanel, DashboardContainer fetch assertions
- Export: adapter + slide-plan integration tests
