# Changelog

## 2026-06-16

- Implemented rolling metric detail data contracts and adapter mapping for supported program and workstream metrics.
- Added program-level delivery-to-bug trend row support through the metrics API and trend service.
- Added `RollingMetricDetailModal` with populated, empty, null-value, and close behavior coverage.
- Wired supported program tiles and workstream rows to open the modal while keeping workstream `Delivery/Bug` static.
- Verified with TypeScript and focused dashboard/API tests; full `pnpm test` remains blocked by repo-wide pre-existing Prettier issues.
