'use client';

import { useState } from 'react';
import { Badge, Button, Collapse, Group, Paper, Skeleton, Stack, Text } from '@mantine/core';
import type { MilestoneMonthGroup } from '@/lib/dashboard/types';
import { FeatureMilestoneCard } from './FeatureMilestoneCard';

export interface MilestoneGoalsPanelProps {
  milestoneGroups: MilestoneMonthGroup[];
  loading?: boolean;
  error?: string | null;
}

export function MilestoneGoalsPanel({
  milestoneGroups,
  loading = false,
  error = null,
}: MilestoneGoalsPanelProps) {
  if (loading) {
    return (
      <Stack gap="xs" data-testid="milestone-goals-panel">
        <Skeleton height={80} />
        <Skeleton height={80} />
        <Skeleton height={80} />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack data-testid="milestone-goals-panel">
        <Text size="sm" c="red">
          {error}
        </Text>
      </Stack>
    );
  }

  if (milestoneGroups.length === 0) {
    return (
      <Stack data-testid="milestone-goals-panel">
        <Text c="dimmed">No monthly goal Features found for this workstream</Text>
      </Stack>
    );
  }

  return (
    <section aria-label="Milestones" data-testid="milestone-goals-panel">
      <Stack gap="md">
        {milestoneGroups.map((group) => (
          <MilestoneMonthGroupBlock key={group.monthLabel} group={group} />
        ))}
      </Stack>
    </section>
  );
}

interface MilestoneMonthGroupBlockProps {
  group: MilestoneMonthGroup;
}

function MilestoneMonthGroupBlock({ group }: MilestoneMonthGroupBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const isCurrentMonth = group.isCurrentMonth;

  const header = (
    <Group justify="space-between">
      <Text fw={700} size="sm">
        {group.monthLabel}
        {isCurrentMonth ? ' (Current)' : ''}
      </Text>
      <Badge color={isCurrentMonth ? 'teal' : 'gray'} size="sm">
        {group.groupCompletionPercent}
      </Badge>
    </Group>
  );

  if (isCurrentMonth) {
    return (
      <Stack gap="xs">
        <Paper
          p="xs"
          style={{ background: 'var(--mantine-color-teal-0)' }}
          data-testid="current-month-header"
        >
          {header}
        </Paper>
        {group.milestones.map((m) => (
          <FeatureMilestoneCard key={m.id} milestone={m} />
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="nowrap">
        <Paper p="xs" style={{ flex: 1 }}>
          {header}
        </Paper>
        <Button
          variant="subtle"
          size="compact-xs"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Hide' : 'Show'}
        >
          {expanded ? 'Hide' : 'Show'}
        </Button>
      </Group>
      <Collapse in={expanded}>
        <Stack gap="xs">
          {group.milestones.map((m) => (
            <FeatureMilestoneCard key={m.id} milestone={m} />
          ))}
        </Stack>
      </Collapse>
    </Stack>
  );
}
