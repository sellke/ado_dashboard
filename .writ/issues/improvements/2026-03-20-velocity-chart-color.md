# Update Velocity Chart Color

> **Type:** Improvement
> **Priority:** Normal
> **Effort:** Small
> **Created:** 2026-03-20
> **spec_ref:**

## TL;DR

Change the color scheme of the velocity trend chart to improve visual clarity or match updated design intent.

## Current State

- `VelocityTrendChart` renders via `AppLineChart` from `@/lib/charts`
- Chart uses whatever default color palette is provided by the chart library/theme
- No explicit color override is applied for the velocity series

## Expected Outcome

- Velocity chart series colors are explicitly set to the desired palette
- Colors are consistent with the broader dashboard design language

## Relevant Files

- `components/Dashboard/VelocityTrendChart.tsx` - chart component to update
