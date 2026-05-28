import { AppBarChart } from './BarChart';

export default {
  title: 'Charts/AppBarChart',
  component: AppBarChart,
};

const sprintData = [
  { sprint: 'Sprint 26.24', velocity: 118, overhead: 28, carryOver: 12 },
  { sprint: 'Sprint 26.25', velocity: 122, overhead: 31, carryOver: 8 },
  { sprint: 'Sprint 26.26', velocity: 127, overhead: 29, carryOver: 15 },
  { sprint: 'Sprint 27.1', velocity: 131, overhead: 32, carryOver: 10 },
  { sprint: 'Sprint 27.2', velocity: 128, overhead: 30, carryOver: 11 },
];

export const Basic = () => (
  <AppBarChart
    data={sprintData}
    dataKey="sprint"
    series={[{ name: 'velocity', color: 'blue.6', label: 'Velocity (pts)' }]}
    height={220}
  />
);

export const Stacked = () => (
  <AppBarChart
    data={sprintData}
    dataKey="sprint"
    series={[
      { name: 'velocity', color: 'blue.6', label: 'Velocity (pts)' },
      { name: 'overhead', color: 'orange.6', label: 'Overhead hrs' },
      { name: 'carryOver', color: 'teal.6', label: 'Carry-over pts' },
    ]}
    type="stacked"
    height={220}
  />
);

export const WithLegend = () => (
  <AppBarChart
    data={sprintData}
    dataKey="sprint"
    series={[
      { name: 'velocity', color: 'blue.6', label: 'Velocity (pts)' },
      { name: 'overhead', color: 'orange.6', label: 'Overhead hrs' },
    ]}
    withLegend
    height={220}
  />
);

export const MultiSeriesDefault = () => (
  <AppBarChart
    data={sprintData}
    dataKey="sprint"
    series={[
      { name: 'velocity', color: 'blue.6', label: 'Velocity (pts)' },
      { name: 'overhead', color: 'orange.6', label: 'Overhead hrs' },
    ]}
    height={220}
  />
);
