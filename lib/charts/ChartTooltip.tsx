'use client';

import { Group, Stack, Text } from '@mantine/core';
import { useChartTheme } from './theme';

interface TooltipPayloadEntry {
  name: string;
  value?: number | null;
  color?: string;
  stroke?: string;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  formatValue?: (v: number) => string;
}

function defaultFormat(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

/**
 * Theme-aware tooltip for Recharts charts. Deduplicates entries by series
 * name and adapts styling for light/dark mode via useChartTheme().
 *
 * Pass as the `content` prop on Recharts `<Tooltip>`.
 */
export function ChartTooltip({ active, payload, formatValue }: ChartTooltipProps) {
  const theme = useChartTheme();
  const fmt = formatValue ?? defaultFormat;

  if (!active || !payload) return null;

  const seen = new Set<string>();
  const entries = payload.filter((p) => {
    if (p.value == null) return false;
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
  if (entries.length === 0) return null;

  const baseStyle: React.CSSProperties = {
    background: theme.tooltipBackground,
    borderRadius: 4,
    pointerEvents: 'none',
    border: theme.isDark ? `1px solid ${theme.tooltipBorder}` : 'none',
  };

  if (entries.length === 1) {
    const e = entries[0];
    return (
      <Text
        size="xs"
        fw={700}
        style={{
          ...baseStyle,
          color: e.color || e.stroke || theme.tooltipText,
          padding: '2px 6px',
        }}
      >
        {fmt(e.value!)}
      </Text>
    );
  }

  return (
    <Stack
      gap={1}
      style={{
        ...baseStyle,
        padding: '4px 8px',
      }}
    >
      {entries.map((entry) => (
        <Group key={entry.name} gap={4} wrap="nowrap">
          <Text
            size="xs"
            fw={700}
            style={{ color: entry.color || entry.stroke || theme.tooltipText }}
          >
            {fmt(entry.value!)}
          </Text>
          <Text size="xs" style={{ color: theme.isDark ? theme.tooltipText : undefined }} c={theme.isDark ? undefined : 'dimmed'}>
            {entry.name}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}
