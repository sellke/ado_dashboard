'use client';

import { Badge } from '@mantine/core';

export type MilestoneStatus = 'NotStarted' | 'InProgress' | 'Done';

const STATUS_COLORS: Record<MilestoneStatus, string> = {
  NotStarted: 'gray',
  InProgress: 'blue',
  Done: 'green',
};

export interface MilestoneStatusBadgeProps {
  status: MilestoneStatus | string;
}

/**
 * Renders a Mantine Badge for milestone status with theme colors.
 * NotStarted=gray, InProgress=blue, Done=green.
 */
export function MilestoneStatusBadge({ status }: MilestoneStatusBadgeProps) {
  const color = STATUS_COLORS[status as MilestoneStatus] ?? 'gray';
  const label = status.replace(/([A-Z])/g, ' $1').trim();

  return (
    <Badge color={color} size="sm" variant="light">
      {label}
    </Badge>
  );
}
