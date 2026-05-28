import { AppLineChart } from './LineChart';

export default {
  title: 'Charts/AppLineChart',
  component: AppLineChart,
};

const velocityData = [
  { sprint: 'Sprint 26.24', velocity: 118, overhead: 28 },
  { sprint: 'Sprint 26.25', velocity: 122, overhead: 31 },
  { sprint: 'Sprint 26.26', velocity: 127, overhead: 29 },
  { sprint: 'Sprint 27.1', velocity: 131, overhead: 32 },
  { sprint: 'Sprint 27.2', velocity: 128, overhead: 30 },
];

export const Basic = () => (
  <AppLineChart
    data={velocityData}
    dataKey="sprint"
    series={[{ name: 'velocity', color: 'blue.6', label: 'Velocity (pts)' }]}
    height={220}
  />
);

export const MultiSeries = () => (
  <AppLineChart
    data={velocityData}
    dataKey="sprint"
    series={[
      { name: 'velocity', color: 'blue.6', label: 'Velocity (pts)' },
      { name: 'overhead', color: 'orange.6', label: 'Overhead %' },
    ]}
    height={220}
  />
);

export const WithReferenceLines = () => (
  <AppLineChart
    data={velocityData}
    dataKey="sprint"
    series={[{ name: 'velocity', color: 'blue.6', label: 'Velocity (pts)' }]}
    referenceLines={[
      { y: 120, color: 'gray.4', label: 'Target' },
      { y: 130, color: 'green.5', label: 'Stretch' },
    ]}
    height={220}
  />
);

export const DashedSeries = () => (
  <AppLineChart
    data={velocityData}
    dataKey="sprint"
    series={[
      { name: 'velocity', color: 'blue.6', label: 'Actual' },
      { name: 'overhead', color: 'orange.6', label: 'Target (projected)', strokeDasharray: '5 5' },
    ]}
    height={220}
  />
);

export const WithDots = () => (
  <AppLineChart
    data={velocityData}
    dataKey="sprint"
    series={[{ name: 'velocity', color: 'blue.6', label: 'Velocity (pts)' }]}
    withDots
    height={220}
  />
);

export const ConnectNulls = () => {
  const dataWithGaps = [
    { sprint: 'Sprint 26.24', velocity: 118 },
    { sprint: 'Sprint 26.25', velocity: null },
    { sprint: 'Sprint 26.26', velocity: 127 },
    { sprint: 'Sprint 27.1', velocity: null },
    { sprint: 'Sprint 27.2', velocity: 128 },
  ];
  return (
    <AppLineChart
      data={dataWithGaps}
      dataKey="sprint"
      series={[{ name: 'velocity', color: 'blue.6', label: 'Velocity (pts)' }]}
      connectNulls
      height={220}
    />
  );
};
