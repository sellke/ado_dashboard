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

  const { sprintLabel, computedAtLabel, programMetrics } = viewModel;

  return (
    <Stack gap="md">
      <Title order={2}>Program Summary</Title>
      <Text size="sm" c="dimmed">
        {sprintLabel ?? '—'}
        {computedAtLabel ? ` • ${computedAtLabel}` : ''}
      </Text>
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
    </Stack>
  );
}
