'use client';

import { Anchor, Box, Stack, Text } from '@mantine/core';
import type { OverheadItemViewModel } from '@/lib/dashboard/types';

export interface CurrentSprintItemTablesProps {
  bugItems: OverheadItemViewModel[];
  spikeItems: OverheadItemViewModel[];
  supportItems: OverheadItemViewModel[];
}

function ItemList({
  items,
  testId,
  emptyLabel,
}: {
  items: OverheadItemViewModel[];
  testId: string;
  emptyLabel: string;
}) {
  return (
    <Box data-testid={testId}>
      {items.length === 0 ? (
        <Text size="xs" c="dimmed">
          {emptyLabel}
        </Text>
      ) : (
        <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
          {items.map((item) => (
            <Box key={item.adoId} component="li" mb={2}>
              <Anchor
                href={item.adoUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                td={item.isClosed ? 'line-through' : undefined}
                c={item.isClosed ? 'dimmed' : undefined}
                truncate
              >
                {item.adoId} — {item.title} ({item.hours}) [{item.state}]
              </Anchor>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export function CurrentSprintItemTables({
  bugItems,
  spikeItems,
  supportItems,
}: CurrentSprintItemTablesProps) {
  return (
    <Stack gap="xs">
      <Box>
        <Text size="xs" fw={500} mb={4}>
          Bugs
        </Text>
        <ItemList items={bugItems} testId="bug-items" emptyLabel="No bug items" />
      </Box>
      <Box>
        <Text size="xs" fw={500} mb={4}>
          Spikes
        </Text>
        <ItemList items={spikeItems} testId="spike-items" emptyLabel="No spike items" />
      </Box>
      <Box>
        <Text size="xs" fw={500} mb={4}>
          Support
        </Text>
        <ItemList items={supportItems} testId="support-items" emptyLabel="No support items" />
      </Box>
    </Stack>
  );
}
