'use client';

import { Badge, Tooltip } from '@mantine/core';
import type { RagStatus } from '@/lib/dashboard/types';

const RAG_LABELS: Record<NonNullable<RagStatus>, string> = {
  Green: 'G',
  Amber: 'A',
  Red: 'R',
};

const RAG_COLORS: Record<NonNullable<RagStatus>, string> = {
  Green: 'green',
  Amber: 'yellow',
  Red: 'red',
};

/**
 * Props for the RAG badge.
 */
export interface RagBadgeProps {
  /** RAG status: Green | Amber | Red. Null renders nothing. */
  rag: RagStatus;
  /**
   * Optional RAG explanation. When provided (and rag is non-null), the badge is
   * wrapped in a Mantine Tooltip so hover/focus reveals the threshold copy.
   */
  ragTooltip?: string | null;
}

/**
 * Renders a compact RAG indicator badge (Green/Amber/Red) with Mantine theme colors.
 * When `ragTooltip` is provided, the badge becomes a focusable tooltip trigger.
 *
 * @returns Badge (optionally tooltip-wrapped) or null when rag is null
 */
export function RagBadge({ rag, ragTooltip }: RagBadgeProps) {
  if (rag === null) {
    return null;
  }

  const label = RAG_LABELS[rag];
  const color = RAG_COLORS[rag];

  const badge = (
    <Badge
      color={color}
      size="sm"
      variant="light"
      tabIndex={ragTooltip ? 0 : undefined}
      aria-label={ragTooltip ? `${rag} status. ${ragTooltip}` : undefined}
    >
      {label}
    </Badge>
  );

  if (!ragTooltip) {
    return badge;
  }

  return (
    <Tooltip
      label={ragTooltip}
      withArrow
      multiline
      maw={360}
      openDelay={300}
      events={{ hover: true, focus: true, touch: true }}
    >
      {badge}
    </Tooltip>
  );
}
