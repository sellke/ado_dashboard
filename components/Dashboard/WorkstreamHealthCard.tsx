'use client';

import { Card, Group, Stack, Text } from '@mantine/core';
import type { WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { OverheadBreakdownPanel } from './OverheadBreakdownPanel';
import { RagBadge } from './RagBadge';
import { SprintBugList } from './SprintBugList';
import { VelocityTrendChart } from './VelocityTrendChart';

export interface WorkstreamHealthCardProps {
  /** Workstream card view model with metrics and detail */
  card: WorkstreamCardViewModel;
}

/**
 * Renders a compact workstream health card with 4 core metrics (Velocity, Velocity Rate,
 * Overhead %, Carry-Over %), RAG status, detail block, velocity trend chart, and bug list.
 * Export-friendly for slide generation; handles null values gracefully.
 */
export function WorkstreamHealthCard({ card }: WorkstreamHealthCardProps) {
  const {
    workstreamName,
    metrics,
    detail,
    trendSprints = [],
    prediction,
    overheadComposition = [],
    currentSprintBugItems = [],
    currentSprintSupportItems = [],
  } = card;

  const showOverheadPanel =
    overheadComposition.length > 0 ||
    currentSprintBugItems.length > 0 ||
    currentSprintSupportItems.length > 0;

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

        <Stack
          gap="xs"
          mt="xs"
          pt="xs"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <VelocityTrendChart trendSprints={trendSprints} prediction={prediction ?? null} />
          {trendSprints.length > 0 && <SprintBugList trendSprints={trendSprints} />}
        </Stack>

        {showOverheadPanel && (
          <OverheadBreakdownPanel
            composition={overheadComposition}
            bugItems={currentSprintBugItems}
            supportItems={currentSprintSupportItems}
          />
        )}
      </Stack>
    </Card>
  );
}
