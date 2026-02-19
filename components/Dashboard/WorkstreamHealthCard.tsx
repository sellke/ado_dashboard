'use client';

import { Card, Group, Stack, Text } from '@mantine/core';
import type { WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { RagBadge } from './RagBadge';

export interface WorkstreamHealthCardProps {
  /** Workstream card view model with metrics and detail */
  card: WorkstreamCardViewModel;
}

/**
 * Renders a compact workstream health card with 3 core metrics, RAG status, and detail block.
 * Export-friendly for slide generation; handles null values gracefully.
 */
export function WorkstreamHealthCard({ card }: WorkstreamHealthCardProps) {
  const { workstreamName, metrics, detail, trendSprints = [] } = card;

  return (
    <Card withBorder padding="md" shadow="sm">
      <Stack gap="sm">
        <Text fw={600} size="md">
          {workstreamName}
        </Text>

        {metrics.map((m) => (
          <Group key={m.label} justify="space-between" align="center" wrap="nowrap" gap="xs">
            <Text size="xs" c="dimmed" tt="uppercase" fw={500} style={{ flexShrink: 0 }}>
              {m.label}
            </Text>
            <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
              <Text size="sm" fw={500}>
                {m.value}
                {m.mode === 'projected' ? ' (Projected)' : ''}
              </Text>
              <RagBadge rag={m.rag} />
            </Group>
          </Group>
        ))}

        <Stack
          gap="xs"
          mt="xs"
          pt="xs"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Text size="xs" c="dimmed">
            Planned: {detail.plannedPoints} • Completed: {detail.completedPoints}
          </Text>
          <Text size="xs" c="dimmed">
            Carry-over: {detail.carryOverItems} items, {detail.carryOverPoints} pts
          </Text>
        </Stack>

        {trendSprints.length > 0 && (
          <Stack
            gap="xs"
            mt="xs"
            pt="xs"
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <Text size="xs" fw={600}>
              Sprint Trend (1-4)
            </Text>
            {trendSprints.map((trend) => (
              <Stack key={trend.sprintId} gap={2}>
                <Text size="xs" fw={500}>
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
        )}
      </Stack>
    </Card>
  );
}
