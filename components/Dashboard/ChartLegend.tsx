'use client';

import { Box, Group, Text } from '@mantine/core';

export interface ChartLegendItem {
  label: string;
  /** Mantine color notation, e.g. 'blue.6' */
  color: string;
  dashed?: boolean;
}

export interface ChartLegendProps {
  items: ChartLegendItem[];
}

function mantineColorVar(color: string): string {
  return `var(--mantine-color-${color.replace('.', '-')})`;
}

export function ChartLegend({ items }: ChartLegendProps) {
  return (
    <Group gap="md" justify="center" mt={4}>
      {items.map((item) => (
        <Group key={item.label} gap={6} align="center" wrap="nowrap">
          <Box
            w={16}
            h={0}
            style={{
              borderTop: `2px ${item.dashed ? 'dashed' : 'solid'} ${mantineColorVar(item.color)}`,
            }}
          />
          <Text size="xs" c="dimmed">
            {item.label}
          </Text>
        </Group>
      ))}
    </Group>
  );
}
