'use client';

import { Box, Group, Text } from '@mantine/core';
import { useChartTheme } from './theme';

export interface ChartLegendItem {
  label: string;
  /** Mantine color token (e.g. 'blue.6') or CSS color value */
  color: string;
  dashed?: boolean;
}

export interface ChartLegendProps {
  items: ChartLegendItem[];
  align?: 'start' | 'center' | 'end';
}

/**
 * Theme-aware chart legend with solid/dashed line indicators.
 * Resolves Mantine color tokens via useChartTheme() instead of
 * constructing CSS variables manually.
 */
export function ChartLegend({ items, align = 'center' }: ChartLegendProps) {
  const { resolveColor } = useChartTheme();

  return (
    <Group gap="md" justify={align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : 'center'} mt={4}>
      {items.map((item) => (
        <Group key={item.label} gap={6} align="center" wrap="nowrap">
          <Box
            w={16}
            h={0}
            style={{
              borderTop: `2px ${item.dashed ? 'dashed' : 'solid'} ${resolveColor(item.color)}`,
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
