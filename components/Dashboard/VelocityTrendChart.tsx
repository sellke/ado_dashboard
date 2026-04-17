'use client';

import React from 'react';
import { AppLineChart, ChartLegend } from '@/lib/charts';
import { Stack, Text } from '@mantine/core';
import type { TrendSprintViewModel, WorkstreamCardViewModel } from '@/lib/dashboard/types';

export interface VelocityTrendChartProps {
  trendSprints: TrendSprintViewModel[];
  prediction: WorkstreamCardViewModel['prediction'];
  activeSprintId?: string;
  /** ID of the currently in-flight sprint — used to overlay forecast and render hollow dot. */
  currentSprintId?: string;
  /** Forwarded to AppLineChart. Set false for static renders (e.g. PPTX export). */
  animateSeries?: boolean;
  /** Chart height in px. Defaults to 200 to match dashboard card usage. */
  height?: number;
  /** Explicit pixel width. Forwarded to AppLineChart (skips ResizeObserver). */
  width?: number;
}

type ChartDataPoint = {
  sprint: string;
  'Completed Points'?: number;
  Forecasted?: number;
  isCurrentSprint?: boolean;
};

function buildChartData(
  sprints: TrendSprintViewModel[],
  prediction: VelocityTrendChartProps['prediction']
): ChartDataPoint[] {
  const data: ChartDataPoint[] = sprints.map((s) => {
    const point: ChartDataPoint = { sprint: s.sprintName, isCurrentSprint: s.isCurrent };
    if (s.rawVelocity !== null) {
      point['Completed Points'] = s.rawVelocity;
    }
    return point;
  });

  if (prediction && data.length > 0) {
    // Prefer the sprint explicitly marked current; fall back to the last sprint.
    const currentIdx = sprints.findIndex((s) => s.isCurrent);
    const targetIdx = currentIdx >= 0 ? currentIdx : data.length - 1;

    // Place the forecast on the current sprint's data point so it shares the
    // same x-axis tick rather than appearing as a separate "(F)" entry.
    if (prediction.rawVelocity != null) {
      data[targetIdx].Forecasted = prediction.rawVelocity;

      // Bridge the prior sprint so the dashed forecast line has a visible
      // connecting segment from the previous actual value to the forecast dot.
      if (targetIdx > 0) {
        const priorActual = data[targetIdx - 1]['Completed Points'];
        if (typeof priorActual === 'number') {
          data[targetIdx - 1].Forecasted = priorActual;
        }
      }
    }
  }

  return data;
}

function completedPointsDot(props: Record<string, unknown>): React.ReactElement | null {
  const { cx, cy, stroke, payload } = props as {
    cx?: number;
    cy?: number;
    stroke: string;
    payload: ChartDataPoint;
  };
  if (cx == null || cy == null) return null;
  if (payload.isCurrentSprint) {
    return (
      <circle
        key={`dot-${cx}-${cy}`}
        cx={cx}
        cy={cy}
        r={4}
        stroke={stroke}
        strokeWidth={2}
        fill="white"
      />
    );
  }
  return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={stroke} />;
}

function computeRollingAvg(sprints: TrendSprintViewModel[]): number | null {
  const values = sprints.map((s) => s.rawVelocity).filter((v): v is number => v !== null);
  if (values.length === 0) {
    return null;
  }
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100;
}

export function VelocityTrendChart({
  trendSprints,
  prediction,
  activeSprintId,
  animateSeries,
  height = 200,
  width,
}: VelocityTrendChartProps) {
  if (trendSprints.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No trend data available
      </Text>
    );
  }

  const chartData = buildChartData(trendSprints, prediction);
  const rollingAvg = computeRollingAvg(trendSprints);
  const activeSprintName = activeSprintId
    ? trendSprints.find((s) => s.sprintId === activeSprintId)?.sprintName ?? null
    : null;

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
        series={[
          { name: 'Completed Points', color: 'blue.6', dot: completedPointsDot },
          { name: 'Forecasted', color: 'blue.4', strokeDasharray: '5 5' },
        ]}
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
        referenceLines={[
          ...(rollingAvg !== null
            ? [{ y: rollingAvg, color: 'gray.5', label: `Avg: ${rollingAvg}` }]
            : []),
          ...(activeSprintName
            ? [{ x: activeSprintName, color: 'gray.5' }]
            : []),
        ]}
      />
      <ChartLegend
        items={[
          { label: 'Completed Points', color: 'blue.6' },
          { label: 'Forecasted', color: 'blue.4', dashed: true },
        ]}
      />
    </Stack>
  );
}
