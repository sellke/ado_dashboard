# Story 6: Remove @mantine/charts and Clean Up

> **Status:** Pending
> **Priority:** High
> **Dependencies:** Story 4

## User Story

**As a** developer  
**I want** `@mantine/charts` fully removed from the project and all related CSS hacks cleaned up  
**So that** the dependency chain is simplified and there are no dead references

## Acceptance Criteria

- Given `package.json`, when inspected after cleanup, then `@mantine/charts` is not listed as a dependency
- Given `app/global.css`, when inspected, then `.mantine-LineChart-root` and `.mantine-BarChart-root` CSS rules are removed
- Given the old `PointValueTooltip.tsx` and `ChartLegend.tsx` in `components/Dashboard/`, when inspected, then they either redirect to `lib/charts/` or are removed (if no other consumers exist)
- Given `pnpm build`, when it runs, then it succeeds with no import errors referencing `@mantine/charts`
- Given the full test suite, when it runs, then all tests pass
- Given `next.config.mjs`, when inspected, then any `@mantine/charts` entries in `optimizePackageImports` are removed

## Implementation Tasks

- [ ] 6.1 Remove old `PointValueTooltip.tsx` and `ChartLegend.tsx` from `components/Dashboard/` (after verifying all consumers use `lib/charts/`)
- [ ] 6.2 Update all remaining imports that reference old tooltip/legend paths
- [ ] 6.3 Remove `.mantine-LineChart-root` and `.mantine-BarChart-root` CSS from `app/global.css`
- [ ] 6.4 Remove `@mantine/charts` from `package.json` via `pnpm remove @mantine/charts`
- [ ] 6.5 Update `next.config.mjs` — remove `@mantine/charts` from `optimizePackageImports` if present
- [ ] 6.6 Run `pnpm build` and full test suite to verify no breakage
- [ ] 6.7 Update `.writ/docs/tech-stack.md` to document the new chart library

## Notes

- Story 4 must be complete before this story — all chart components must be migrated to `lib/charts/` first.
- Verify no other files import `@mantine/charts` before removal.
- The old `PointValueTooltip` and `ChartLegend` in `components/Dashboard/` are replaced by `lib/charts/ChartTooltip` and `lib/charts/ChartLegend` (Story 2).

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Build succeeds
- [ ] All tests pass
- [ ] Code reviewed
- [ ] Documentation updated
