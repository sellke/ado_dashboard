'use client';

import { Badge, Group, Progress, Stack, Text } from '@mantine/core';
import type { ApiMilestone } from '@/lib/milestones/types';

interface MilestoneProgressSummaryProps {
  milestones: ApiMilestone[];
}

interface SummaryCounts {
  NotStarted: number;
  InProgress: number;
  Done: number;
}

function buildCounts(milestones: ApiMilestone[]): SummaryCounts {
  const counts: SummaryCounts = {
    NotStarted: 0,
    InProgress: 0,
    Done: 0,
  };

  for (const milestone of milestones) {
    const status = milestone.status;
    if (status === 'NotStarted' || status === 'InProgress' || status === 'Done') {
      counts[status] += 1;
    }
  }

  return counts;
}

export function MilestoneProgressSummary({ milestones }: MilestoneProgressSummaryProps) {
  const counts = buildCounts(milestones);
  const total = milestones.length;
  const done = counts.Done;
  const completionPercent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <Stack gap="xs" aria-label="Milestone progress summary">
      <Group justify="space-between" align="center">
        <Text fw={600}>Progress Summary</Text>
        <Badge variant="light" color={completionPercent === 100 ? 'green' : 'blue'}>
          {completionPercent}% Complete
        </Badge>
      </Group>

      <Progress value={completionPercent} aria-label="Milestone completion percent" />

      <Group gap="sm">
        <Badge variant="outline">NotStarted: {counts.NotStarted}</Badge>
        <Badge variant="outline" color="blue">
          InProgress: {counts.InProgress}
        </Badge>
        <Badge variant="outline" color="green">
          Done: {counts.Done}
        </Badge>
      </Group>
    </Stack>
  );
}
