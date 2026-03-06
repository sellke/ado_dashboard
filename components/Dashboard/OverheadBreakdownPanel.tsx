'use client';

import { Stack, Text } from '@mantine/core';
import type { OverheadSprintViewModel, TrendSprintViewModel } from '@/lib/dashboard/types';
import { CurrentSprintItemTables } from './CurrentSprintItemTables';
import { OverheadBreakdownChart } from './OverheadBreakdownChart';

export interface OverheadBreakdownPanelProps {
  trendSprints: TrendSprintViewModel[];
  overheadItemsBySprint: OverheadSprintViewModel[];
  activeSprintId: string;
}

/**
 * Umbrella panel that composes OverheadBreakdownChart and CurrentSprintItemTables.
 * Finds the selected sprint's items from overheadItemsBySprint and passes them down.
 */
export function OverheadBreakdownPanel({
  trendSprints,
  overheadItemsBySprint,
  activeSprintId,
}: OverheadBreakdownPanelProps) {
  const selected = overheadItemsBySprint.find((s) => s.sprintId === activeSprintId);

  return (
    <Stack
      gap="xs"
      mt="xs"
      pt="xs"
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
      data-testid="overhead-breakdown-panel"
    >
      <Text size="xs" c="dimmed" tt="uppercase">
        Overhead Breakdown (Hours)
      </Text>
      <OverheadBreakdownChart trendSprints={trendSprints} />
      <CurrentSprintItemTables
        bugItems={selected?.bugs ?? []}
        spikeItems={selected?.spikes ?? []}
        supportItems={selected?.support ?? []}
      />
    </Stack>
  );
}
