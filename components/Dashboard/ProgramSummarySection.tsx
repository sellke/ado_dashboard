'use client';

import { AppBarChart, AppLineChart, ChartLegend } from '@/lib/charts';
import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import type { DashboardViewModel, TrendSprintViewModel } from '@/lib/dashboard/types';
import type { ApiProgramMilestoneRollup } from '@/lib/milestones/types';
import { RagBadge } from './RagBadge';

export interface ProgramSummarySectionProps {
  viewModel: DashboardViewModel;
  /** Stub: program-level milestone rollup passed through from milestones API (Phase 1B integration pending). */
  programRollup?: ApiProgramMilestoneRollup | null;
}

function buildVelocityChartData(
  sprints: TrendSprintViewModel[],
  prediction: DashboardViewModel['sprint5Prediction']
): Array<{ sprint: string; 'Completed Points'?: number; Forecasted?: number }> {
  const data: Array<{ sprint: string; 'Completed Points'?: number; Forecasted?: number }> =
    sprints.map((s) => ({
      sprint: s.sprintName,
      'Completed Points': s.rawVelocity ?? 0,
    }));

  if (prediction && data.length > 0) {
    const existingLabels = new Set(data.map((point) => point.sprint));
    const basePredictionLabel = prediction.sprintLabel || 'Current Sprint';
    let predictionLabel = basePredictionLabel;

    if (existingLabels.has(predictionLabel)) {
      predictionLabel = `${basePredictionLabel} (Forecasted)`;
      let index = 2;
      while (existingLabels.has(predictionLabel)) {
        predictionLabel = `${basePredictionLabel} (Forecasted ${index})`;
        index += 1;
      }
    }

    const lastActual = data[data.length - 1]['Completed Points'];
    if (typeof lastActual === 'number') {
      data[data.length - 1].Forecasted = lastActual;
    }

    const predictionPoint: { sprint: string; Forecasted?: number } = { sprint: predictionLabel };
    if (prediction.rawVelocity != null) {
      predictionPoint.Forecasted = prediction.rawVelocity;
    }
    data.push(predictionPoint);
  }

  return data;
}

function averageVelocity(sprints: TrendSprintViewModel[]): number | null {
  const values = sprints.map((s) => s.rawVelocity).filter((v): v is number => v !== null);
  if (values.length === 0) {
    return null;
  }
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100;
}

function buildBugChartData(sprints: TrendSprintViewModel[]) {
  return sprints.map((s) => ({
    sprint: s.sprintName,
    'Open (New/Active)': s.rawActiveBugs,
    'Closed (Resolved/Testing/Closed)': s.rawBugsClosed,
  }));
}

export function ProgramSummarySection({ viewModel, programRollup }: ProgramSummarySectionProps) {
  if (viewModel.state !== 'success') {
    return null;
  }

  const {
    sprintLabel,
    rollingWindowLabel,
    computedAtLabel,
    programMetrics,
    programTrendSprints,
    sprint5Prediction,
  } = viewModel;

  const avgVelocity = averageVelocity(programTrendSprints);

  return (
    <Stack gap="md">
      <Title order={2}>Program Summary</Title>
      <Text size="sm" c="dimmed">
        {sprintLabel ?? '—'}
        {computedAtLabel ? ` • ${computedAtLabel}` : ''}
      </Text>
      {rollingWindowLabel && (
        <Text size="xs" c="dimmed">
          {rollingWindowLabel}
        </Text>
      )}
      {programMetrics && programMetrics.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          {programMetrics.map((m) => (
            <Card key={m.label} withBorder padding="md">
              <Stack gap="xs">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                    {m.label}
                  </Text>
                  {m.rag !== null && <RagBadge rag={m.rag} />}
                </Group>
                <Text fw={600} size="lg">
                  {m.value}
                </Text>
                {m.avgLabel && (
                  <Text size="xs" c="dimmed">
                    {m.avgLabel}
                  </Text>
                )}
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <Text size="sm" c="dimmed">
          No program metrics available
        </Text>
      )}

      {programRollup && programRollup.quarterlyMilestones.total > 0 ? (
        <Stack gap="xs" data-testid="milestone-rollup-section">
          <Text fw={600}>
            ADP Milestones{programRollup.quarter ? ` — ${programRollup.quarter}` : ''}
          </Text>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            <Card withBorder padding="sm">
              <Stack gap={2}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Total</Text>
                <Text fw={600} size="lg">{programRollup.quarterlyMilestones.total}</Text>
              </Stack>
            </Card>
            <Card withBorder padding="sm">
              <Stack gap={2}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Complete</Text>
                <Group gap="xs" align="baseline">
                  <Text fw={600} size="lg">{programRollup.quarterlyMilestones.complete}</Text>
                  <Badge size="sm" color="teal" variant="light">Done</Badge>
                </Group>
              </Stack>
            </Card>
            <Card withBorder padding="sm">
              <Stack gap={2}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={500}>In Progress</Text>
                <Group gap="xs" align="baseline">
                  <Text fw={600} size="lg">{programRollup.quarterlyMilestones.inProgress}</Text>
                  <Badge size="sm" color="blue" variant="light">Active</Badge>
                </Group>
              </Stack>
            </Card>
            <Card withBorder padding="sm">
              <Stack gap={2}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Not Started</Text>
                <Text fw={600} size="lg">{programRollup.quarterlyMilestones.notStarted}</Text>
              </Stack>
            </Card>
          </SimpleGrid>
          <Text size="xs" c="dimmed">
            {programRollup.currentMonth}:{' '}
            {programRollup.currentMonthCompletionPercent != null
              ? `${Math.round(programRollup.currentMonthCompletionPercent)}% complete`
              : 'N/A'}
            {' '}({programRollup.currentMonthCompletedSP} / {programRollup.currentMonthTotalSP} SP)
          </Text>
        </Stack>
      ) : programRollup !== undefined && (
        <Text size="sm" c="dimmed" data-testid="milestone-rollup-empty">
          No ADP milestones tracked
        </Text>
      )}

      {programTrendSprints.length > 0 && (
        <Stack gap="md">
          <Text fw={600}>Sprint Trend</Text>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Card withBorder padding="md" style={{ overflow: 'visible' }}>
              <Stack gap="xs">
                <Text size="sm" fw={500} c="dimmed">
                  Velocity (Points)
                </Text>
                <div style={{ overflow: 'visible', padding: '12px 16px 4px 4px' }}>
                <AppLineChart
                  height={220}
                  data={buildVelocityChartData(programTrendSprints, sprint5Prediction)}
                  dataKey="sprint"
                  withDots
                  connectNulls={false}
                  curveType="linear"
                  series={[
                    { name: 'Completed Points', color: 'blue.6' },
                    { name: 'Forecasted', color: 'blue.6', strokeDasharray: '5 5' },
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
                  tooltipProps={{
                    offset: 0,
                    isAnimationActive: false,
                  }}
                  referenceLines={
                    avgVelocity !== null
                      ? [{ y: avgVelocity, color: 'gray.5', label: `Avg: ${avgVelocity}` }]
                      : []
                  }
                />
                </div>
                <ChartLegend
                  items={[
                    { label: 'Completed Points', color: 'blue.6' },
                    { label: 'Forecasted', color: 'blue.6', dashed: true },
                  ]}
                />
              </Stack>
            </Card>
            <Card withBorder padding="md" style={{ overflow: 'visible' }}>
              <Stack gap="xs">
                <Text size="sm" fw={500} c="dimmed">
                  Bug Burndown
                </Text>
                <AppBarChart
                  height={220}
                  data={buildBugChartData(programTrendSprints)}
                  dataKey="sprint"
                  type="stacked"
                  withLegend
                  legendProps={{ verticalAlign: 'bottom', height: 30 }}
                  series={[
                    { name: 'Closed (Resolved/Testing/Closed)', color: 'green.6' },
                    { name: 'Open (New/Active)', color: 'red.6' },
                  ]}
                  xAxisProps={{
                    interval: 0,
                    tickFormatter: (v: string) => v.replace(/^Sprint\s*/i, ''),
                  }}
                  yAxisProps={{ domain: [0, 'auto'] }}
                  tooltipProps={{
                    position: { y: -20 },
                    offset: 10,
                    isAnimationActive: false,
                  }}
                />
              </Stack>
            </Card>
          </SimpleGrid>
        </Stack>
      )}
    </Stack>
  );
}
