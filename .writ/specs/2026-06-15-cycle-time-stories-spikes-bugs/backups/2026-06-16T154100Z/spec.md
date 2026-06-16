# Cycle Time for Stories, Spikes, and Bugs

> **Status:** Completed ✅
> **Created:** 2026-06-15
> **Owner:** @AdamSellke
> **Origin:** Promoted from issue: `.writ/issues/features/2026-06-15-cycle-time-stories-spikes-bugs.md`

## Specification Contract

**Deliverable:** Add configurable rolling-window cycle-time metrics for User Stories, Spikes, and Bugs, showing both program-level and per-workstream totals and team averages in business days.

**Must Include:** Accurate Active/In Progress to Done-like lifecycle dates from ADO, with missing lifecycle data excluded from calculations but surfaced as unavailable-data counts.

**Hardest Constraint:** Current `WorkItem` data only stores created and changed dates, so the feature depends on extending ADO sync and persistence before metric math or dashboard UI can be trustworthy.

### Experience Design

- **Entry point:** Existing dashboard program summary and workstream cards.
- **Happy path:** User opens the dashboard, sees rolling-window cycle-time summary by work item type at program level, then reviews each workstream card for the same User Story, Spike, and Bug breakdown.
- **Moment of truth:** A team can immediately compare whether bugs, spikes, or stories are taking longer to finish, without confusing effort hours with elapsed duration.
- **Feedback model:** Metrics update after ADO sync and dashboard refresh, following existing metric loading and error states.
- **Error experience:** If lifecycle dates are missing, affected items do not distort averages; the UI shows an unavailable-data count for transparency.

### Business Rules

- Cycle time is measured in business days from first Active/In Progress-like timestamp to Done-like timestamp.
- Done-like states align with existing metric engine conventions: `Closed`, `Done`, and `Resolved`, unless implementation discovery finds ADO type-specific state differences that need explicit mapping.
- Reporting scope is a configurable rolling window, not the currently selected sprint only.
- The first configurable window implementation extends or reuses the existing metric configuration surface rather than creating a separate settings experience.
- Breakdown types are `UserStory`, `Spike`, and `Bug`.
- Total cycle time is the aggregate elapsed business days per work item type.
- Team average cycle time is the mean cycle time per completed item per work item type.
- Items missing either start or done lifecycle date are excluded from total and average calculations and counted as unavailable.
- Calendar rule for v1 is Monday-Friday business days only, with no holiday calendar.

### Success Criteria

After sync, dashboard users can see rolling-window total cycle time and average cycle time by work item type at both program and workstream levels. Lifecycle-date gaps are visible, and tests cover lifecycle date extraction, business-day math, aggregation, API shape, dashboard mapping, and configuration behavior.

### Scope Boundaries

Included:

- Prisma schema extension for ADO lifecycle timestamps needed by cycle-time calculations.
- ADO sync changes to ingest lifecycle timestamps for User Story, Spike, and Bug work items.
- Pure cycle-time calculator functions for business-day duration, type breakdowns, totals, averages, and unavailable counts.
- Rolling-window configuration integration using the existing metric configuration patterns.
- Additive `GET /api/metrics` response fields for program and workstream cycle-time data.
- Dashboard program summary and workstream-card presentation.
- Tests for sync mapping, calculators, API response shape, adapter mapping, and UI rendering.

Excluded:

- Per-user cycle-time analytics.
- Percentile, median, scatterplot, or cumulative flow charts.
- Historical backfill beyond lifecycle fields available through the current ADO sync window.
- Holiday-aware business calendars.
- A separate cycle-time settings page.

### Technical Concerns

- ADO lifecycle field availability may vary. If `Microsoft.VSTS.Common.ActivatedDate` and `Microsoft.VSTS.Common.ClosedDate` are unreliable, implementation may need revision-history lookup, which is slower and should remain isolated in the sync layer.
- Program aggregation should sum elapsed days and item counts first, then derive averages. Averaging workstream averages would skew small teams.
- Current metric snapshots may not be the best persistence target because cycle-time values depend on item-level lifecycle dates and configurable rolling windows. Prefer deriving from synced work items unless performance proves snapshot persistence is needed.
- Configuring the cycle-time window must not break existing velocity rolling-window behavior.

### Recommendations

- Persist explicit lifecycle fields such as `adoActivatedDate` and `adoClosedDate` on `WorkItem`.
- Start with unavailable item counts by type and scope. Defer detailed unavailable reason breakdown unless users need auditability later.
- Keep business-day math pure and covered by unit tests before adding API or UI changes.
- Use existing dashboard adapter patterns so React components receive formatted view models, not raw API math.

### Cross-Spec Overlap

- `2026-05-28-metric-calculation-config-ui` is complete and owns metric configuration patterns. This spec should reuse or extend that surface for the cycle-time rolling window.
- `2026-02-11-ado-data-sync` and `2026-06-05-five-sprint-window-visible-tabs` overlap with sync depth and rolling-window data availability.
- `2026-02-11-metric-engine` overlaps with Done-like rules, pure calculator conventions, and `GET /api/metrics` patterns.

## Detailed Requirements

### Data Ingestion

ADO sync must ingest lifecycle timestamps for approved work item types that contribute to cycle time:

- `User Story` mapped to `UserStory`
- `Spike` mapped to `Spike`
- `Bug` mapped to `Bug`

The preferred timestamp fields are:

- Start timestamp: `Microsoft.VSTS.Common.ActivatedDate`
- Done timestamp: `Microsoft.VSTS.Common.ClosedDate`

If the preferred fields are unavailable in the existing batch work item API response, the technical implementation must evaluate revision-history lookup as an isolated sync-layer enhancement. The spec does not require arbitrary historical backfill beyond the configured ingestion window.

### Metric Calculation

Cycle-time calculation must be pure and deterministic:

1. Filter work items to the configured rolling window based on done timestamp.
2. Keep only `UserStory`, `Spike`, and `Bug`.
3. Exclude items missing start or done timestamps from totals and averages.
4. Compute business-day elapsed duration from start to done.
5. Aggregate per workstream and for the program.
6. Group each aggregate by work item type.

Each type group must include:

- `totalBusinessDays`
- `averageBusinessDays`
- `completedItemCount`
- `unavailableItemCount`

Program-level values must be derived from item-level totals and counts, not from averaging workstream-level averages.

### Configuration

The rolling window must be configurable through the existing metric configuration patterns. The default should preserve current dashboard expectations by aligning to the visible rolling-window behavior already used by trend charts unless the existing config provides a better default at implementation time.

The configuration should support:

- A positive integer window size.
- A unit or interpretation that implementation can apply consistently to the dashboard, preferably sprint-window based if that matches existing metric config.
- Validation that rejects zero, negative, non-integer, or unsupported values.

### API

`GET /api/metrics` must expose cycle-time data additively so existing consumers continue to work. The response should include cycle-time data in both program and workstream payloads.

The API must preserve existing loading, empty, and error behavior:

- No snapshots or no selected sprint: current empty response behavior remains.
- No completed cycle-time items in scope: cycle-time values render as empty or `N/A`, not zero unless the data truly sums to zero.
- Missing lifecycle dates: unavailable counts are returned without failing the request.

### Dashboard UI

The dashboard must show:

- Program-level total and average cycle time by User Story, Spike, and Bug.
- Per-workstream cycle-time breakdown by the same types.
- Unavailable-data counts where lifecycle timestamps are missing.

The UI should follow existing dashboard patterns:

- Mantine cards, stacks, groups, badges, and tooltips.
- Existing loading/error/empty handling through `DashboardContainer`, `DashboardShell`, and adapter view models.
- Existing chart and metric visual language where useful, but v1 does not require new chart types.

## Story Plan

1. `story-1-lifecycle-dates`: Persist and sync ADO lifecycle dates. Dependencies: None.
2. `story-2-cycle-time-calculators`: Compute business-day cycle-time aggregates. Dependencies: Story 1.
3. `story-3-api-and-config`: Expose configurable rolling-window cycle-time data through metrics APIs. Dependencies: Stories 1 and 2.
4. `story-4-dashboard-presentation`: Render program and workstream cycle-time metrics with unavailable counts. Dependencies: Story 3.

## Implementation Approach

Follow the existing data flow:

1. Extend Prisma `WorkItem` fields and migration.
2. Extend ADO mapping and work-item sync tests.
3. Add pure calculator functions under `lib/metrics/`.
4. Add or extend config loading for cycle-time window rules.
5. Surface additive API fields in `app/api/metrics/route.ts`.
6. Map API response into dashboard view models in `lib/dashboard/adapter.ts` and related types.
7. Render using existing dashboard component patterns.

Do not read Prisma inside calculator functions. Keep database access in API, sync, or orchestrator layers.
