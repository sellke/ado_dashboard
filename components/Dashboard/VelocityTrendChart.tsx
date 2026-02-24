'use client';

import { LineChart } from '@mantine/charts';
import { Text } from '@mantine/core';
import type { TrendSprintViewModel, WorkstreamCardViewModel } from '@/lib/dashboard/types';

export interface VelocityTrendChartProps {
  trendSprints: TrendSprintViewModel[];
  prediction: WorkstreamCardViewModel['prediction'];
}

type ChartDataPoint = { sprint: string; 'Completed Points'?: number; Predicted?: number };

function buildChartData(
  sprints: TrendSprintViewModel[],
  prediction: VelocityTrendChartProps['prediction']
): ChartDataPoint[] {
  const data: ChartDataPoint[] = sprints.map((s) => {
    const point: ChartDataPoint = { sprint: s.sprintName };
    if (s.rawVelocity !== null) {
      point['Completed Points'] = s.rawVelocity;
    }
    return point;
  });

  if (prediction && data.length > 0) {
    const basePredictionLabel = prediction.sprintLabel || 'Current Sprint';
    const existingLabels = new Set(data.map((p) => p.sprint));

    let predictionLabel = `${basePredictionLabel} (Forecasted)`;
    let index = 2;
    while (existingLabels.has(predictionLabel)) {
      predictionLabel = `${basePredictionLabel} (Forecasted ${index})`;
      index += 1;
    }

    const lastActual = data[data.length - 1]['Completed Points'];
    if (typeof lastActual === 'number') {
      data[data.length - 1].Predicted = lastActual;
    }

    const predictionPoint: ChartDataPoint = { sprint: predictionLabel };
    if (prediction.rawVelocity != null) {
      predictionPoint.Predicted = prediction.rawVelocity;
    }
    data.push(predictionPoint);
  }

  return data;
}

function computeRollingAvg(sprints: TrendSprintViewModel[]): number | null {
  const values = sprints.map((s) => s.rawVelocity).filter((v): v is number => v !== null);
  if (values.length === 0) {
    return null;
  }
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100;
}

export function VelocityTrendChart({ trendSprints, prediction }: VelocityTrendChartProps) {
  if (trendSprints.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No trend data available
      </Text>
    );
  }

  const chartData = buildChartData(trendSprints, prediction);
  const rollingAvg = computeRollingAvg(trendSprints);

  return (
    <LineChart
      h={200}
      data={chartData}
      dataKey="sprint"
      withDots
      connectNulls={false}
      curveType="linear"
      series={[
        { name: 'Completed Points', color: 'blue.6' },
        { name: 'Predicted', color: 'blue.6', strokeDasharray: '5 5' },
      ]}
      xAxisProps={{
        interval: 0,
        tickFormatter: (v: string) =>
          v.replace(/^Sprint\s*/i, '').replace(/\s*\(Forecasted(?:\s+\d+)?\)/i, ' (F)'),
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
      referenceLines={
        rollingAvg !== null ? [{ y: rollingAvg, color: 'gray.5', label: `Avg: ${rollingAvg}` }] : []
      }
    />
  );
}
