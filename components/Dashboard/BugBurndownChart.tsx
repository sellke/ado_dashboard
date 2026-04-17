'use client';

import { AppBarChart } from '@/lib/charts';
import type { TrendSprintViewModel } from '@/lib/dashboard/types';

export interface BugBurndownChartProps {
  trendSprints: TrendSprintViewModel[];
  /** Chart height in px. Defaults to 220. */
  height?: number;
  /** Forwarded to AppBarChart. Set false for static renders (e.g. PPTX export). */
  animateSeries?: boolean;
  /** Explicit pixel width. Forwarded to AppBarChart (skips ResizeObserver). */
  width?: number;
}

const SERIES = [
  { name: 'Open (New/Active)', color: 'red.6' },
  { name: 'Closed (Resolved/Testing/Closed)', color: 'green.6' },
];

export function BugBurndownChart({
  trendSprints,
  height = 220,
  animateSeries,
  width,
}: BugBurndownChartProps) {
  if (trendSprints.length === 0) {
    return null;
  }

  const data = trendSprints.map((s) => ({
    sprint: s.sprintName,
    'Open (New/Active)': s.rawActiveBugs,
    'Closed (Resolved/Testing/Closed)': s.rawBugsClosed,
  }));

  return (
    <AppBarChart
      height={height}
      width={width}
      data={data}
      dataKey="sprint"
      type="stacked"
      withLegend
      legendProps={{ verticalAlign: 'bottom', height: 30 }}
      series={SERIES}
      animateSeries={animateSeries}
      xAxisProps={{
        interval: 0,
        tickFormatter: (v: string) => {
          const label = v.replace(/^Sprint\s*/i, '');
          const isCurrent = trendSprints.find((s) => s.sprintName === v)?.isCurrent;
          return isCurrent ? `${label} (Cur)` : label;
        },
      }}
      yAxisProps={{ domain: [0, 'auto'] }}
    />
  );
}
