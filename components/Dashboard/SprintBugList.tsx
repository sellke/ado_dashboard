'use client';

import { Anchor, Badge, Group, Stack, Text, Tooltip } from '@mantine/core';
import type { TrendBugViewModel, TrendSprintViewModel } from '@/lib/dashboard/types';

export interface SprintBugListProps {
  trendSprints: TrendSprintViewModel[];
  /** Sprint to display. Falls back to the current sprint, then the last sprint in the list. */
  activeSprintId?: string;
}

function BugRow({ bug }: { bug: TrendBugViewModel }) {
  return (
    <Anchor
      href={bug.adoUrl}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      aria-label={`Open ${bug.title} in Azure DevOps`}
      style={{ display: 'block' }}
      td={bug.isClosed ? 'line-through' : undefined}
      c={bug.isClosed ? 'dimmed' : undefined}
    >
      <Group gap="xs" wrap="nowrap" py={2} style={{ minWidth: 0 }}>
        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
          #{bug.adoId}
        </Text>
        <Tooltip label={bug.title} multiline maw={360} openDelay={300}>
          <Text size="xs" truncate style={{ minWidth: 0 }}>
            {bug.title}
          </Text>
        </Tooltip>
      </Group>
    </Anchor>
  );
}

function BugSection({
  label,
  bugs,
  color,
  emptyLabel,
}: {
  label: string;
  bugs: TrendBugViewModel[];
  color: string;
  emptyLabel: string;
}) {
  return (
    <Stack gap={2}>
      <Group gap="xs">
        <Text size="xs" fw={600} c={color}>
          {label}
        </Text>
        <Badge size="xs" variant="light" color={color}>
          {bugs.length}
        </Badge>
      </Group>
      {bugs.length === 0 ? (
        <Text size="xs" c="dimmed">
          {emptyLabel}
        </Text>
      ) : (
        bugs.map((bug) => <BugRow key={bug.adoId} bug={bug} />)
      )}
    </Stack>
  );
}

export function SprintBugList({ trendSprints, activeSprintId }: SprintBugListProps) {
  if (trendSprints.length === 0) {
    return null;
  }

  const activeSprint =
    (activeSprintId ? trendSprints.find((s) => s.sprintId === activeSprintId) : null) ??
    trendSprints.find((s) => s.isCurrent) ??
    trendSprints[trendSprints.length - 1];

  if (!activeSprint) return null;

  const openBugs = activeSprint.bugs.filter((b) => !b.isClosed);
  const closedBugs = activeSprint.bugs.filter((b) => b.isClosed);

  return (
    <Stack gap="sm" data-testid="sprint-bug-list">
      <BugSection label="Open" bugs={openBugs} color="red" emptyLabel="No open bugs" />
      <BugSection label="Closed" bugs={closedBugs} color="green" emptyLabel="No closed bugs" />
    </Stack>
  );
}
