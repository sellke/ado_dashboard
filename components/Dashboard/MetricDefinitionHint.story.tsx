import { Group, Stack, Text } from '@mantine/core';
import type { MetricId } from '@/lib/metrics/definitions';
import { MetricDefinitionHint } from './MetricDefinitionHint';

export default {
  title: 'Dashboard/MetricDefinitionHint',
  component: MetricDefinitionHint,
};

const VARIANTS: Array<{ metricId: MetricId; label: string }> = [
  { metricId: 'velocity', label: 'Avg Velocity' },
  { metricId: 'velocityRate', label: 'Velocity Rate' },
  { metricId: 'overheadPercent', label: 'Overhead %' },
  { metricId: 'carryOverRate', label: 'Carry-Over %' },
  { metricId: 'chartVelocity', label: 'Velocity (Points)' },
  { metricId: 'chartBugBurndown', label: 'Bug Burndown' },
];

const HintRow = ({ metricId, label }: { metricId: MetricId; label: string }) => (
  <Group gap={4}>
    <Text size="sm" tt="uppercase" fw={600} c="dimmed">
      {label}
    </Text>
    <MetricDefinitionHint metricId={metricId} label={label} />
  </Group>
);

export const Velocity = () => <HintRow metricId="velocity" label="Avg Velocity" />;

export const VelocityRate = () => <HintRow metricId="velocityRate" label="Velocity Rate" />;

export const OverheadPercent = () => <HintRow metricId="overheadPercent" label="Overhead %" />;

export const CarryOverRate = () => <HintRow metricId="carryOverRate" label="Carry-Over %" />;

export const ChartVelocity = () => <HintRow metricId="chartVelocity" label="Velocity (Points)" />;

export const ChartBugBurndown = () => (
  <HintRow metricId="chartBugBurndown" label="Bug Burndown" />
);

export const Gallery = () => (
  <Stack gap="sm" p="md">
    {VARIANTS.map((v) => (
      <HintRow key={v.metricId} metricId={v.metricId} label={v.label} />
    ))}
  </Stack>
);

export const UnknownId = () => (
  <Group gap={4} p="md" style={{ border: '1px dashed var(--mantine-color-gray-4)' }}>
    <Text size="sm">Unknown metric</Text>
    <MetricDefinitionHint metricId={'bogus' as MetricId} label="Mystery" />
    <Text size="xs" c="dimmed">
      (no icon renders for unknown metric IDs)
    </Text>
  </Group>
);
