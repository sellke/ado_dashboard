import { ChartTooltip } from './ChartTooltip';

export default {
  title: 'Charts/ChartTooltip',
  component: ChartTooltip,
};

export const SingleValue = () => (
  <ChartTooltip
    active
    payload={[{ name: 'Velocity (pts)', value: 128, color: '#228be6' }]}
  />
);

export const MultiValue = () => (
  <ChartTooltip
    active
    payload={[
      { name: 'Velocity (pts)', value: 128, color: '#228be6' },
      { name: 'Overhead %', value: 31.2, color: '#fd7e14' },
      { name: 'Carry-Over %', value: 12, color: '#12b886' },
    ]}
  />
);

export const CustomFormat = () => (
  <ChartTooltip
    active
    payload={[{ name: 'Overhead %', value: 31.2, color: '#fd7e14' }]}
    formatValue={(v) => `${v.toFixed(1)}%`}
  />
);

export const Inactive = () => (
  <ChartTooltip active={false} payload={[]} />
);
