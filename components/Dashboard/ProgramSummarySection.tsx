'use client';

import { useState } from 'react';
import { Button, Card, Grid, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { AppLineChart, ChartLegend } from '@/lib/charts';
import type {
  DashboardViewModel,
  MilestoneQuarterGroup,
  RollingMetricDetailViewModel,
  TrendSprintViewModel,
} from '@/lib/dashboard/types';
import { getRagTooltip } from '@/lib/metrics/definitions';
import type { ApiProgramMilestoneRollup } from '@/lib/milestones/types';
import { BugBurndownChart } from './BugBurndownChart';
import { CycleTimeBreakdown, type CycleTimeDrilldownContext } from './CycleTimeBreakdown';
import { MetricDefinitionHint } from './MetricDefinitionHint';
import { MilestoneQuarterlyPanel } from './MilestoneQuarterlyPanel';
import { RagBadge } from './RagBadge';
import { RollingMetricDetailModal } from './RollingMetricDetailModal';

export interface ProgramSummarySectionProps {
  viewModel: DashboardViewModel;
  /** Stub: program-level milestone rollup passed through from milestones API (Phase 1B integration pending). */
  programRollup?: ApiProgramMilestoneRollup | null;
  /** Quarterly-grouped milestone view models for the new breakdown panel. */
  milestoneQuarterGroups?: MilestoneQuarterGroup[];
  milestonesLoading?: boolean;
  milestonesError?: string | null;
  showAdpMetrics?: boolean;
  cycleTimeDrilldownContext?: CycleTimeDrilldownContext;
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
    // Prefer the sprint explicitly marked current; fall back to the last sprint.
    const currentIdx = sprints.findIndex((s) => s.isCurrent);
    const targetIdx = currentIdx >= 0 ? currentIdx : data.length - 1;

    // Place the forecast on the current sprint's data point so it shares the
    // same x-axis tick rather than appearing as a separate "(F)" entry.
    if (prediction.rawVelocity != null) {
      data[targetIdx].Forecasted = prediction.rawVelocity;

      // Bridge the prior sprint so the dashed forecast line has a visible
      // connecting segment from the previous actual value to the forecast dot.
      if (targetIdx > 0) {
        const priorActual = data[targetIdx - 1]['Completed Points'];
        if (typeof priorActual === 'number') {
          data[targetIdx - 1].Forecasted = priorActual;
        }
      }
    }
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

export function ProgramSummarySection({
  viewModel,
  programRollup: _programRollup,
  milestoneQuarterGroups = [],
  milestonesLoading,
  milestonesError,
  showAdpMetrics = true,
  cycleTimeDrilldownContext,
}: ProgramSummarySectionProps) {
  const [selectedRollingMetric, setSelectedRollingMetric] =
    useState<RollingMetricDetailViewModel | null>(null);

  if (viewModel.state !== 'success') {
    return null;
  }

  const {
    sprintLabel,
    rollingWindowLabel,
    computedAtLabel,
    programMetrics,
    programCycleTime,
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
        <Grid gutter="md">
          {programMetrics.map((m) => (
            <Grid.Col key={m.label} span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder padding="md">
                <Stack gap="xs">
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Group gap={4} align="center" wrap="nowrap">
                      <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                        {m.label}
                      </Text>
                      {m.metricId && <MetricDefinitionHint metricId={m.metricId} label={m.label} />}
                    </Group>
                    {m.rag !== null && (
                      <RagBadge
                        rag={m.rag}
                        ragTooltip={m.metricId ? getRagTooltip(m.metricId) : null}
                      />
                    )}
                  </Group>
                  <Text fw={600} size="lg">
                    {m.value}
                  </Text>
                  {m.avgLabel && (
                    <Text size="xs" c="dimmed">
                      {m.avgLabel}
                    </Text>
                  )}
                  {m.rollingMetric ? (
                    <Button
                      type="button"
                      variant="subtle"
                      size="xs"
                      px={0}
                      onClick={() => setSelectedRollingMetric(m.rollingMetric ?? null)}
                      aria-label={`Open rolling details for ${m.label}`}
                    >
                      View rolling details
                    </Button>
                  ) : null}
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      ) : (
        <Text size="sm" c="dimmed">
          No program metrics available
        </Text>
      )}

      {programCycleTime && programCycleTime.length > 0 ? (
        <CycleTimeBreakdown
          title="Cycle Time"
          items={programCycleTime}
          variant="tiles"
          drilldownContext={
            cycleTimeDrilldownContext
              ? { ...cycleTimeDrilldownContext, scopeLabel: 'Program' }
              : undefined
          }
        />
      ) : null}

      {showAdpMetrics ? (
        <Stack gap="xs">
          <Text fw={600}>ADP Milestones</Text>
          <MilestoneQuarterlyPanel
            quarterGroups={milestoneQuarterGroups}
            loading={milestonesLoading}
            error={milestonesError}
          />
        </Stack>
      ) : null}

      {programTrendSprints.length > 0 && (
        <Stack gap="md">
          <Text fw={600}>Sprint Trend</Text>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Card withBorder padding="md" style={{ overflow: 'visible' }}>
              <Stack gap="xs">
                <Group gap={4} align="center" wrap="nowrap">
                  <Text size="sm" fw={500} c="dimmed">
                    Velocity (Points)
                  </Text>
                  <MetricDefinitionHint metricId="chartVelocity" label="Velocity (Points)" />
                </Group>
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
                      { name: 'Forecasted', color: 'blue.4', strokeDasharray: '5 5' },
                    ]}
                    xAxisProps={{
                      interval: 0,
                      tickFormatter: (v: string) => v.replace(/^Sprint\s*/i, ''),
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
                    { label: 'Forecasted', color: 'blue.4', dashed: true },
                  ]}
                />
              </Stack>
            </Card>
            <Card withBorder padding="md" style={{ overflow: 'visible' }}>
              <Stack gap="xs">
                <Group gap={4} align="center" wrap="nowrap">
                  <Text size="sm" fw={500} c="dimmed">
                    Bug Burndown
                  </Text>
                  <MetricDefinitionHint metricId="chartBugBurndown" label="Bug Burndown" />
                </Group>
                <BugBurndownChart trendSprints={programTrendSprints} height={220} />
              </Stack>
            </Card>
          </SimpleGrid>
        </Stack>
      )}

      <RollingMetricDetailModal
        opened={selectedRollingMetric !== null}
        metric={selectedRollingMetric}
        onClose={() => setSelectedRollingMetric(null)}
      />
    </Stack>
  );
}
