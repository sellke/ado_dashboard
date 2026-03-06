'use client';

import { Anchor, Badge, Box, Group, Stack, Text, Tooltip } from '@mantine/core';
import type { OverheadItemViewModel } from '@/lib/dashboard/types';

const STATE_COLOR: Record<string, string> = {
  New: 'gray',
  Active: 'blue',
  Resolved: 'yellow',
  Closed: 'green',
  Done: 'green',
};

export interface CurrentSprintItemTablesProps {
  bugItems: OverheadItemViewModel[];
  spikeItems: OverheadItemViewModel[];
  supportItems: OverheadItemViewModel[];
}

function ItemRow({ item }: { item: OverheadItemViewModel }) {
  return (
    <Anchor
      href={item.adoUrl}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      aria-label={`Open ${item.title} in Azure DevOps`}
      style={{ display: 'block' }}
      td={item.isClosed ? 'line-through' : undefined}
      c={item.isClosed ? 'dimmed' : undefined}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs" py={2}>
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            {item.adoId}
          </Text>
          <Tooltip label={item.title} multiline maw={360} openDelay={300}>
            <Text size="xs" truncate style={{ minWidth: 0 }}>
              {item.title}
            </Text>
          </Tooltip>
        </Group>
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Text size="xs" c="dimmed">
            {item.hours}
          </Text>
          <Badge size="xs" variant="light" color={STATE_COLOR[item.state] ?? 'gray'}>
            {item.state}
          </Badge>
        </Group>
      </Group>
    </Anchor>
  );
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
        <Stack gap={0}>
          {items.map((item) => (
            <ItemRow key={item.adoId} item={item} />
          ))}
        </Stack>
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
