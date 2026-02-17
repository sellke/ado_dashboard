'use client';

import { Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import type { DashboardViewModel } from '@/lib/dashboard/types';
import { RagBadge } from './RagBadge';

/**
 * Props for the Program Summary section.
 */
export interface ProgramSummarySectionProps {
  /** View model with sprint label, computed-at label, and program metrics (velocity, overhead, predictability, carry-over). */
  viewModel: DashboardViewModel;
}

/**
 * Renders the program summary section: velocity, overhead, predictability, carry-over as card tiles, with RAG indicators.
 *
 * @param viewModel - Dashboard view model (state, sprintLabel, programMetrics, etc.)
 * @returns The section layout or null when state is not 'success'
 */
export function ProgramSummarySection({ viewModel }: ProgramSummarySectionProps) {
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
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
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
                  {m.mode === 'projected' ? ' (Projected)' : ''}
                </Text>
                {m.avgLabel && (
                  <Text size="xs" c="dimmed">
                    Avg: {m.avgLabel}
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

      {programTrendSprints.length > 0 && (
        <Card withBorder padding="md">
          <Stack gap="xs">
            <Text fw={600}>Sprint 1-4 Trend</Text>
            {programTrendSprints.map((trend) => (
              <Stack key={trend.sprintId} gap={2}>
                <Text size="sm" fw={500}>
                  {trend.sprintName}
                </Text>
                <Text size="xs" c="dimmed">
                  Velocity: {trend.velocity} • Velocity rate: {trend.velocityRate}
                </Text>
                <Text size="xs" c="dimmed">
                  Active bugs: {trend.activeBugs} • Bugs closed: {trend.bugsClosed}
                </Text>
              </Stack>
            ))}
          </Stack>
        </Card>
      )}

      {sprint5Prediction && (
        <Card withBorder padding="md">
          <Stack gap={2}>
            <Text fw={600}>Sprint 5 Predicted Velocity</Text>
            <Text size="sm">
              {sprint5Prediction.velocity}
              {sprint5Prediction.isPredicted ? ' (Predicted)' : ''}
            </Text>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
