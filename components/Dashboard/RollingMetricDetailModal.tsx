'use client';

import { Badge, Group, Modal, Stack, Text, VisuallyHidden } from '@mantine/core';
import { AppLineChart, ChartLegend } from '@/lib/charts';
import type { RollingMetricDetailViewModel } from '@/lib/dashboard/types';
import { getMetricTooltip } from '@/lib/metrics/definitions';
import { RagBadge } from './RagBadge';

export interface RollingMetricDetailModalProps {
  opened: boolean;
  metric: RollingMetricDetailViewModel | null;
  onClose: () => void;
}

type ChartDataPoint = {
  sprint: string;
  Value?: number;
};

function buildChartData(metric: RollingMetricDetailViewModel): ChartDataPoint[] {
  return metric.rows.map((row) => ({
    sprint: row.sprintName,
    Value: row.rawValue ?? undefined,
  }));
}

export function RollingMetricDetailModal({
  opened,
  metric,
  onClose,
}: RollingMetricDetailModalProps) {
  const definition = metric ? getMetricTooltip(metric.definitionMetricId) : '';
  const chartData = metric ? buildChartData(metric) : [];

  return (
    <Modal
      opened={opened && metric !== null}
      onClose={onClose}
      title={metric?.title ?? 'Rolling metric detail'}
      centered
      size="lg"
      closeButtonProps={{ 'aria-label': 'Close rolling metric detail' }}
    >
      {metric ? (
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" gap="sm">
            <Stack gap={2}>
              <Text size="sm" c="dimmed">
                Scope: {metric.scopeLabel}
              </Text>
              {metric.rollingWindowLabel ? (
                <Text size="sm" c="dimmed">
                  {metric.rollingWindowLabel}
                </Text>
              ) : null}
            </Stack>
            <Group gap="xs" wrap="nowrap">
              <Badge variant="light" size="lg">
                {metric.summaryValue}
              </Badge>
              <RagBadge rag={metric.rag} />
            </Group>
          </Group>

          {definition ? (
            <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
              {definition}
            </Text>
          ) : null}

          {metric.rows.length === 0 ? (
            <Text size="sm" c="dimmed">
              {metric.emptyMessage}
            </Text>
          ) : (
            <Stack gap={4} style={{ overflow: 'visible', padding: '12px 16px 4px 4px' }}>
              <AppLineChart
                height={260}
                data={chartData}
                dataKey="sprint"
                withDots
                connectNulls={false}
                curveType="linear"
                series={[{ name: 'Value', color: 'blue.6' }]}
                xAxisProps={{
                  interval: 0,
                  tickFormatter: (value: string) => value.replace(/^Sprint\s*/i, ''),
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
              />
              <ChartLegend items={[{ label: 'Value', color: 'blue.6' }]} />
              <VisuallyHidden>
                <ul>
                  {metric.rows.map((row) => (
                    <li key={row.sprintId}>
                      {row.sprintName}: {row.value}
                    </li>
                  ))}
                </ul>
              </VisuallyHidden>
            </Stack>
          )}
        </Stack>
      ) : null}
    </Modal>
  );
}
