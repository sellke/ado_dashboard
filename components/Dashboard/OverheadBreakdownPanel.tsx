'use client';

import { Stack, Text } from '@mantine/core';
import type { OverheadCompositionViewModel, OverheadItemViewModel } from '@/lib/dashboard/types';
import { CurrentSprintItemTables } from './CurrentSprintItemTables';
import { OverheadCompositionChart } from './OverheadCompositionChart';

export interface OverheadBreakdownPanelProps {
  composition: OverheadCompositionViewModel[];
  bugItems: OverheadItemViewModel[];
  supportItems: OverheadItemViewModel[];
}

/**
 * Umbrella panel that composes OverheadCompositionChart and CurrentSprintItemTables.
 * Purely presentational — rendered inline below velocity/bug sections in WorkstreamHealthCard.
 */
export function OverheadBreakdownPanel({
  composition,
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
        Overhead Breakdown
      </Text>
      <OverheadCompositionChart composition={composition} />
      <CurrentSprintItemTables bugItems={bugItems} supportItems={supportItems} />
    </Stack>
  );
}
