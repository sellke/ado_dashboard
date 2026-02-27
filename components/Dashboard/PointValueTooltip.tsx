'use client';

import { Group, Stack, Text } from '@mantine/core';

interface PayloadEntry {
  name: string;
  value?: number | null;
  color?: string;
  stroke?: string;
}

interface PointValueTooltipProps {
  active?: boolean;
  payload?: PayloadEntry[];
}

function formatValue(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

/**
 * Minimal tooltip that renders values near the hovered data point.
 * Designed to replace the default Recharts/Mantine chart tooltip box.
 * Pass as `tooltipProps.content` on Mantine chart components.
 */
export function PointValueTooltip({ active, payload }: PointValueTooltipProps) {
  if (!active || !payload) return null;

  const seen = new Set<number>();
  const entries = payload.filter((p) => {
    if (p.value == null) return false;
    if (seen.has(p.value)) return false;
    seen.add(p.value);
    return true;
  });
  if (entries.length === 0) return null;

  if (entries.length === 1) {
    const e = entries[0];
    return (
      <Text
        size="xs"
        fw={700}
        style={{
          color: e.color || e.stroke,
          background: 'rgba(255,255,255,0.92)',
          borderRadius: 4,
          padding: '2px 6px',
          pointerEvents: 'none',
        }}
      >
        {formatValue(e.value!)}
      </Text>
    );
  }

  return (
    <Stack
      gap={1}
      style={{
        background: 'rgba(255,255,255,0.92)',
        borderRadius: 4,
        padding: '4px 8px',
        pointerEvents: 'none',
      }}
    >
      {entries.map((entry) => (
        <Group key={entry.name} gap={4} wrap="nowrap">
          <Text size="xs" fw={700} style={{ color: entry.color || entry.stroke }}>
            {formatValue(entry.value!)}
          </Text>
          <Text size="xs" c="dimmed">
            {entry.name}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}
