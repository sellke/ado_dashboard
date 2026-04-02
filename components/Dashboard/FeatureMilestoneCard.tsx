'use client';

import { Badge, Group, Paper, Stack, Text } from '@mantine/core';
import type { MilestoneGoalViewModel } from '@/lib/dashboard/types';
import { BurnupChart } from './BurnupChart';

export interface FeatureMilestoneCardProps {
  milestone: MilestoneGoalViewModel;
}

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatShortMonth(isoDate: string): string {
  const d = new Date(isoDate);
  return `${SHORT_MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatStatus(status: string): string {
  return status.replace(/([A-Z])/g, ' $1').trim();
}

export function FeatureMilestoneCard({ milestone }: FeatureMilestoneCardProps) {
  const isComplete = milestone.status === 'Done';

  return (
    <Paper
      withBorder
      p="sm"
      data-testid="feature-milestone-card"
      data-completed={isComplete}
      style={isComplete ? { borderColor: 'var(--mantine-color-teal-6)' } : undefined}
    >
      <Stack gap="xs">
        <Group justify="space-between">
          <Stack gap={2}>
            <Text size="sm" fw={500}>
              {milestone.title}
            </Text>
            <Text size="xs" c="dimmed">
              {formatShortMonth(milestone.targetMonth)}
            </Text>
          </Stack>
          <Group gap="xs" wrap="nowrap" align="flex-start">
            {milestone.adpMonTagLabel && (
              <Badge variant="outline" size="sm" color="violet">
                {milestone.adpMonTagLabel}
              </Badge>
            )}
            {milestone.adoFeatureId && (
              <Badge variant="light" size="sm" color="gray">
                {milestone.adoFeatureId}
              </Badge>
            )}
            <Badge size="sm" color={isComplete ? 'teal' : 'blue'} variant="light">
              {formatStatus(milestone.status)}
            </Badge>
          </Group>
        </Group>

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            Completed: {milestone.completedPoints} / {milestone.totalPoints} SP
          </Text>
          <Badge variant="light" size="sm" color={isComplete ? 'teal' : 'gray'}>
            {milestone.percentComplete}
          </Badge>
        </Group>

        {milestone.totalPoints === 0 ? (
          <Text size="sm" c="dimmed">
            No story points tracked
          </Text>
        ) : (
          <BurnupChart burnupData={milestone.burnupData} />
        )}
      </Stack>
    </Paper>
  );
}
