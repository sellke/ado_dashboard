import { ChartLegend } from './ChartLegend';

export default {
  title: 'Charts/ChartLegend',
  component: ChartLegend,
};

const basicItems = [
  { label: 'Velocity (pts)', color: 'blue.6' },
  { label: 'Overhead %', color: 'orange.6' },
  { label: 'Carry-Over %', color: 'teal.6' },
];

export const Basic = () => <ChartLegend items={basicItems} />;

export const WithDashedIndicators = () => (
  <ChartLegend
    items={[
      { label: 'Actual Velocity', color: 'blue.6' },
      { label: 'Target (projected)', color: 'gray.5', dashed: true },
    ]}
  />
);

export const AlignStart = () => (
  <ChartLegend items={basicItems} align="start" />
);

export const AlignCenter = () => (
  <ChartLegend items={basicItems} align="center" />
);

export const AlignEnd = () => (
  <ChartLegend items={basicItems} align="end" />
);

export const MixedSolidAndDashed = () => (
  <ChartLegend
    items={[
      { label: 'Velocity', color: 'blue.6' },
      { label: 'Target', color: 'gray.5', dashed: true },
      { label: 'Overhead', color: 'orange.6' },
    ]}
  />
);
