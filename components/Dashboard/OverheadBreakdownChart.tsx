'use client';

import { LineChart } from '@mantine/charts';
import { Text } from '@mantine/core';
import type { TrendSprintViewModel } from '@/lib/dashboard/types';

export interface OverheadBreakdownChartProps {
  trendSprints: TrendSprintViewModel[];
}

type ChartDataPoint = {
  sprint: string;
  Meetings: number;
  Spikes: number;
  Bugs: number;
  Support: number;
};

const OVERHEAD_SERIES = [
  { name: 'Meetings' as const, color: 'blue.6' },
  { name: 'Spikes' as const, color: 'yellow.6' },
  { name: 'Bugs' as const, color: 'red.6' },
  { name: 'Support' as const, color: 'green.6' },
];

function buildChartData(sprints: TrendSprintViewModel[]): ChartDataPoint[] {
  return sprints.map((s) => {
    const point: ChartDataPoint = {
      sprint: s.sprintName,
      Meetings: 0,
      Spikes: 0,
      Bugs: 0,
      Support: 0,
    };
    for (const item of s.overheadBreakdown ?? []) {
      point[item.category] = item.hours;
    }
    return point;
  });
}

function hasOverheadData(sprints: TrendSprintViewModel[]): boolean {
  return sprints.some((s) => (s.overheadBreakdown ?? []).some((item) => item.hours > 0));
}

export function OverheadBreakdownChart({ trendSprints }: OverheadBreakdownChartProps) {
  if (trendSprints.length === 0 || !hasOverheadData(trendSprints)) {
    return (
      <Text size="sm" c="dimmed">
        No overhead data available
      </Text>
    );
  }

  const chartData = buildChartData(trendSprints);

  return (
    <LineChart
      h={200}
      data={chartData}
      dataKey="sprint"
      withDots
      connectNulls={false}
      curveType="linear"
      series={OVERHEAD_SERIES}
      xAxisProps={{
        interval: 0,
        tickFormatter: (v: string) => v.replace(/^Sprint\s*/i, ''),
        angle: -20,
        textAnchor: 'end',
        height: 52,
        tickMargin: 10,
      }}
      yAxisProps={{ domain: [0, 'auto'] }}
      tooltipAnimationDuration={150}
      tooltipProps={{
        position: { y: -20 },
        offset: 10,
        isAnimationActive: false,
      }}
    />
  );
}
