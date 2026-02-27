'use client';

import { LineChart } from '@mantine/charts';
import { Stack, Text } from '@mantine/core';
import type { TrendSprintViewModel } from '@/lib/dashboard/types';
import { ChartLegend } from './ChartLegend';
import { PointValueTooltip } from './PointValueTooltip';

export interface OverheadBreakdownChartProps {
  trendSprints: TrendSprintViewModel[];
}

type ChartDataPoint = {
  sprint: string;
  Mtgs: number;
  Spikes: number;
  Bugs: number;
  Support: number;
};

const OVERHEAD_SERIES = [
  { name: 'Mtgs' as const, color: 'blue.6' },
  { name: 'Spikes' as const, color: 'yellow.6' },
  { name: 'Bugs' as const, color: 'red.6' },
  { name: 'Support' as const, color: 'green.6' },
];

function buildChartData(sprints: TrendSprintViewModel[]): ChartDataPoint[] {
  return sprints.map((s) => {
    const point: ChartDataPoint = {
      sprint: s.sprintName,
      Mtgs: 0,
      Spikes: 0,
      Bugs: 0,
      Support: 0,
    };
    const keyMap: Record<string, keyof ChartDataPoint> = { Meetings: 'Mtgs' };
    for (const item of s.overheadBreakdown ?? []) {
      const key = (keyMap[item.category] ?? item.category) as keyof ChartDataPoint;
      (point[key] as number) = item.hours;
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
    <Stack gap={4} style={{ overflow: 'visible', padding: '12px 16px 4px 4px' }}>
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
        tooltipAnimationDuration={0}
        tooltipProps={{
          offset: 0,
          isAnimationActive: false,
          content: PointValueTooltip as never,
        }}
      />
      <ChartLegend
        items={OVERHEAD_SERIES.map((s) => ({ label: s.name, color: s.color }))}
      />
    </Stack>
  );
}
