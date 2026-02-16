'use client';

import { Badge } from '@mantine/core';
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
}

/**
 * Renders a compact RAG indicator badge (Green/Amber/Red) with Mantine theme colors.
 *
 * @param rag - RAG status from MetricTileViewModel
 * @returns Badge or null when rag is null
 */
export function RagBadge({ rag }: RagBadgeProps) {
  if (rag === null) {
    return null;
  }

  const label = RAG_LABELS[rag];
  const color = RAG_COLORS[rag];

  return (
    <Badge color={color} size="sm" variant="light">
      {label}
    </Badge>
  );
}
