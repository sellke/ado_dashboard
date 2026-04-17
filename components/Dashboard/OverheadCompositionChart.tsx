'use client';

import { AppLineChart, ChartLegend } from '@/lib/charts';
import { Stack } from '@mantine/core';
import type { OverheadCompositionViewModel } from '@/lib/dashboard/types';

export interface OverheadCompositionChartProps {
  composition: OverheadCompositionViewModel[];
  /** Forwarded to AppLineChart. Set false for static renders (e.g. PPTX export). */
  animateSeries?: boolean;
  /** Chart height in px. Defaults to 200 to match dashboard card usage. */
  height?: number;
  /** Explicit pixel width. Forwarded to AppLineChart (skips ResizeObserver). */
  width?: number;
}

const SERIES = [
  { name: 'Meetings', color: 'gray.9' },
  { name: 'Bugs', color: 'red.6' },
  { name: 'Spikes', color: 'violet.6' },
  { name: 'Support', color: 'orange.6' },
];

export function OverheadCompositionChart({
  composition,
  animateSeries,
  height = 200,
  width,
}: OverheadCompositionChartProps) {
  if (composition.length === 0) {
    return null;
  }

  const chartData = composition.map((s) => ({
    sprint: s.sprintName,
    Meetings: s.ceremonyHours,
    Bugs: s.bugHours,
    Spikes: s.spikeHours,
    Support: s.supportHours,
  }));

  return (
    <Stack gap={4} style={{ overflow: 'visible', padding: '12px 16px 4px 4px' }}>
      <AppLineChart
        height={height}
        width={width}
        data={chartData}
        dataKey="sprint"
        withDots
        connectNulls={false}
        curveType="linear"
        animateSeries={animateSeries}
        series={SERIES}
        xAxisProps={{
          interval: 0,
          tickFormatter: (v: string) => v.replace(/^Sprint\s*/i, ''),
          angle: -20,
          textAnchor: 'end',
          height: 52,
          tickMargin: 10,
        }}
        yAxisProps={{ domain: [0, 'auto'] }}
        tooltipProps={{
          offset: 0,
          isAnimationActive: false,
        }}
      />
      <ChartLegend
        items={SERIES.map((s) => ({ label: s.name, color: s.color }))}
      />
    </Stack>
  );
}
