'use client';

import { Stack, Text } from '@mantine/core';
import type { TrendSprintViewModel } from '@/lib/dashboard/types';
import { OverheadBreakdownChart } from './OverheadBreakdownChart';

export interface OverheadBreakdownPanelProps {
  trendSprints: TrendSprintViewModel[];
}

/**
 * Panel that renders the overhead line chart showing overhead hours by category over time.
 */
export function OverheadBreakdownPanel({ trendSprints }: OverheadBreakdownPanelProps) {
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
    </Stack>
  );
}
