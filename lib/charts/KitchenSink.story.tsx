import { ReferenceLine } from 'recharts';
import { AppLineChart } from './LineChart';
import { AppBarChart } from './BarChart';
import { AppAreaChart } from './AreaChart';
import { ChartLegend } from './ChartLegend';

export default {
  title: 'Charts/KitchenSink',
};

const velocityData = [
  { sprint: 'Sprint 26.24', velocity: 118, overhead: 28 },
  { sprint: 'Sprint 26.25', velocity: 122, overhead: 31 },
  { sprint: 'Sprint 26.26', velocity: 127, overhead: 29 },
  { sprint: 'Sprint 27.1', velocity: 131, overhead: 32 },
  { sprint: 'Sprint 27.2', velocity: 128, overhead: 30 },
];

/**
 * Composition example showing escape hatches: custom ReferenceLine via children,
 * custom axis props, and ChartLegend used alongside charts.
 */
export const LineChartWithCustomReferenceLine = () => (
  <div style={{ padding: 16 }}>
    <AppLineChart
      data={velocityData}
      dataKey="sprint"
      series={[{ name: 'velocity', color: 'blue.6', label: 'Velocity (pts)' }]}
      referenceLines={[{ y: 120, label: 'Target' }]}
      height={220}
      xAxisProps={{ angle: -15, textAnchor: 'end' }}
      yAxisProps={{ domain: [100, 140] }}
    >
      <ReferenceLine y={130} stroke="#40c057" strokeDasharray="6 4" />
    </AppLineChart>
    <ChartLegend
      items={[
        { label: 'Velocity', color: 'blue.6' },
        { label: 'Target', color: 'gray.5', dashed: true },
        { label: 'Stretch', color: 'green.6', dashed: true },
      ]}
      align="center"
    />
  </div>
);

export const BarChartWithCustomAxes = () => (
  <div style={{ padding: 16 }}>
    <AppBarChart
      data={velocityData}
      dataKey="sprint"
      series={[
        { name: 'velocity', color: 'blue.6', label: 'Velocity (pts)' },
        { name: 'overhead', color: 'orange.6', label: 'Overhead hrs' },
      ]}
      withLegend
      height={220}
      xAxisProps={{ angle: -20, textAnchor: 'end' }}
      yAxisProps={{ domain: [0, 150] }}
    />
  </div>
);

export const AreaChartComposition = () => (
  <div style={{ padding: 16 }}>
    <AppAreaChart
      data={velocityData}
      dataKey="sprint"
      series={[
        { name: 'velocity', color: 'blue.6', label: 'Velocity (pts)' },
        { name: 'overhead', color: 'orange.6', label: 'Overhead hrs', strokeDasharray: '5 5' },
      ]}
      curveType="monotone"
      height={220}
      yAxisProps={{ domain: [0, 150] }}
    />
    <ChartLegend
      items={[
        { label: 'Velocity', color: 'blue.6' },
        { label: 'Overhead', color: 'orange.6', dashed: true },
      ]}
    />
  </div>
);
