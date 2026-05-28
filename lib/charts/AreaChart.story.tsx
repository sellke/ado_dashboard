import { AppAreaChart } from './AreaChart';

export default {
  title: 'Charts/AppAreaChart',
  component: AppAreaChart,
};

const velocityWithTarget = [
  { sprint: 'Sprint 26.24', velocity: 118, target: 120 },
  { sprint: 'Sprint 26.25', velocity: 122, target: 120 },
  { sprint: 'Sprint 26.26', velocity: 127, target: 125 },
  { sprint: 'Sprint 27.1', velocity: 131, target: 125 },
  { sprint: 'Sprint 27.2', velocity: 128, target: 130 },
];

export const Basic = () => (
  <AppAreaChart
    data={velocityWithTarget}
    dataKey="sprint"
    series={[{ name: 'velocity', color: 'blue.6', label: 'Velocity (pts)' }]}
    height={220}
  />
);

export const DualSeriesWithDashedTarget = () => (
  <AppAreaChart
    data={velocityWithTarget}
    dataKey="sprint"
    series={[
      { name: 'velocity', color: 'blue.6', label: 'Actual Velocity' },
      { name: 'target', color: 'gray.5', label: 'Target', strokeDasharray: '5 5' },
    ]}
    height={220}
  />
);

export const MonotoneCurve = () => (
  <AppAreaChart
    data={velocityWithTarget}
    dataKey="sprint"
    series={[
      { name: 'velocity', color: 'teal.6', label: 'Velocity (pts)' },
    ]}
    curveType="monotone"
    height={220}
  />
);
