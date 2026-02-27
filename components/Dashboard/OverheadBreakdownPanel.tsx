'use client';

import { Stack, Text } from '@mantine/core';
import type { OverheadItemViewModel, TrendSprintViewModel } from '@/lib/dashboard/types';
import { CurrentSprintItemTables } from './CurrentSprintItemTables';
import { OverheadBreakdownChart } from './OverheadBreakdownChart';

export interface OverheadBreakdownPanelProps {
  trendSprints: TrendSprintViewModel[];
  bugItems: OverheadItemViewModel[];
  supportItems: OverheadItemViewModel[];
}

/**
 * Umbrella panel that composes OverheadBreakdownChart and CurrentSprintItemTables.
 * Purely presentational — rendered inline below velocity/bug sections in WorkstreamHealthCard.
 */
export function OverheadBreakdownPanel({
  trendSprints,
  bugItems,
  supportItems,
}: OverheadBreakdownPanelProps) {
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
      <CurrentSprintItemTables bugItems={bugItems} supportItems={supportItems} />
    </Stack>
  );
}
