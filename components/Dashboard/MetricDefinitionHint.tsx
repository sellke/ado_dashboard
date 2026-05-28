'use client';

import { ActionIcon, Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { getMetricTooltip, type MetricId } from '@/lib/metrics/definitions';

export interface MetricDefinitionHintProps {
  /** Stable metric identifier whose definition/calculation copy to display. */
  metricId: MetricId;
  /** Human-readable label used to build the icon's accessible name. */
  label: string;
}

/**
 * Renders a subtle info icon beside a metric label or chart header. Hovering or
 * keyboard-focusing the icon reveals a multiline Mantine tooltip with the metric's
 * definition and calculation copy from the definitions registry.
 *
 * Returns `null` for unknown metric IDs (no copy available) so callers can render
 * it unconditionally without producing a broken affordance.
 */
export function MetricDefinitionHint({ metricId, label }: MetricDefinitionHintProps) {
  const tooltip = getMetricTooltip(metricId);
  if (!tooltip) {
    return null;
  }

  return (
    <Tooltip
      label={tooltip}
      withArrow
      multiline
      maw={360}
      openDelay={300}
      events={{ hover: true, focus: true, touch: true }}
    >
      <ActionIcon
        variant="subtle"
        size="xs"
        color="gray"
        aria-label={`Definition for ${label}`}
      >
        <IconInfoCircle size={14} />
      </ActionIcon>
    </Tooltip>
  );
}
