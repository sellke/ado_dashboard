'use client';

import { BarChart } from '@mantine/charts';
import type { OverheadCompositionViewModel } from '@/lib/dashboard/types';

export interface OverheadCompositionChartProps {
  composition: OverheadCompositionViewModel[];
}

const SERIES = [
  { name: 'Ceremony', color: 'blue.6' },
  { name: 'Bugs', color: 'red.6' },
  { name: 'Spikes', color: 'orange.6' },
  { name: 'Support', color: 'yellow.6' },
];

export function OverheadCompositionChart({ composition }: OverheadCompositionChartProps) {
  if (composition.length === 0) {
    return null;
  }

  const chartData = composition.map((s) => ({
    sprint: s.sprintName,
    Ceremony: s.ceremonyHours,
    Bugs: s.bugHours,
    Spikes: s.spikeHours,
    Support: s.supportHours,
  }));

  return (
    <BarChart
      h={200}
      data={chartData}
      dataKey="sprint"
      type="stacked"
      series={SERIES}
      withLegend
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
    />
  );
}
