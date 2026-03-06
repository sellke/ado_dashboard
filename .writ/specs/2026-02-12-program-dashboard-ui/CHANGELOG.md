# Changelog

## 2026-03-04 - Bug State Classification Rework

**Modification Contract:** Refine bug burndown state classification from generic done-like/non-done-like buckets to explicit ADO state sets. Open = `New|Active`. Resolved = `Resolved|Testing|Closed`. Chart legend and tooltip labels include constituent state names for alignment (e.g., "Open (New/Active)").

### Changes Made

- **Metric definitions updated:** `activeBugs` now explicitly matches `New` or `Active` states (was: catch-all remainder of non-done-like). `bugsClosed` now matches `Resolved`, `Testing`, or `Closed` states (was: `Closed|Done|Resolved`). `Done` excluded from bug classification.
- **`Testing` added as resolved-side state:** Bugs in `Testing` now count toward the closed/resolved bucket.
- **`changedDate` constraint preserved:** Resolved bugs still require `changedDate` within the sprint window.
- **Explicit exclusion:** Bugs in states outside both sets are excluded from both counts (previously caught by the catch-all remainder in `activeBugs`).

### Files Updated

- `spec.md` — Section 2 metric definitions and success criteria updated
- `spec-lite.md` — Locked metric rules section updated
- `user-stories/README.md` — Progress tracking, dependency graph, and notes updated
- `user-stories/story-6-metric-calculation-service-and-trend-api.md` — Reopened with tasks 6.3a, 6.5a and new acceptance criteria
- `user-stories/story-7-trend-and-bug-metrics-ui-integration.md` — Reopened with tasks 7.1a, 7.4a and new acceptance criterion

### Backup Location

`backups/20260304-154812/`

---

## 2026-02-16 - Sprint Trend and Bug Metrics Addition

**Initial Change Request:** Added sprint-trend analytics, velocity prediction, and bug metrics to the dashboard specification. Stories 6 and 7 created.
