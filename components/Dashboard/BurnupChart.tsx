'use client';

import { AppAreaChart } from '@/lib/charts';
import type { ApiBurnupPoint } from '@/lib/dashboard/types';

export interface BurnupChartProps {
  burnupData: ApiBurnupPoint[];
  height?: number;
  /** Forwarded to AppAreaChart. Set false for static renders (e.g. PPTX export). */
  animateSeries?: boolean;
  /** Explicit pixel width. Forwarded to AppAreaChart (skips ResizeObserver). */
  width?: number;
}

const SERIES = [
  { name: 'completedSP', label: 'Completed SP', color: 'teal.6' },
  { name: 'totalSP', label: 'Target SP', color: 'gray.4', strokeDasharray: '4 2' },
];

export function BurnupChart({ burnupData, height = 160, animateSeries, width }: BurnupChartProps) {
  if (burnupData.length === 0) {
    return null;
  }

  const chartData = burnupData.map((p) => ({
    sprint: p.sprintName,
    completedSP: p.cumulativeCompletedSP,
    totalSP: p.totalSP,
  }));

  return (
    <AppAreaChart
      height={height}
      width={width}
      data={chartData}
      dataKey="sprint"
      series={SERIES}
      curveType="linear"
      animateSeries={animateSeries}
      xAxisProps={{
        interval: 0,
        tickFormatter: (v: string) => v.replace(/^Sprint\s*/i, ''),
        angle: -20,
        textAnchor: 'end',
        height: 52,
        tickMargin: 10,
      }}
      yAxisProps={{ domain: [0, 'auto'] }}
    />
  );
}
