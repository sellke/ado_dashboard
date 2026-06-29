'use client';

import { Anchor, Badge, Group, Skeleton, Stack, Text, Tooltip } from '@mantine/core';
import type { SprintStoryViewModel, StatusGroupViewModel, StoryRowViewModel } from '@/lib/dashboard/types';
import type { StatusGroup } from '@/lib/sprints/status-mapping';

export interface SprintStoryListPanelProps {
  sprints: SprintStoryViewModel[];
  activeSprintId: string;
  loading?: boolean;
  error?: string | null;
}

const STATUS_COLOR: Record<StatusGroup, string> = {
  Planned: 'gray',
  Active: 'blue',
  Testing: 'cyan',
  Resolved: 'yellow',
  Completed: 'green',
};

function StoryRow({ story }: { story: StoryRowViewModel }) {
  return (
    <Anchor
      href={story.adoUrl}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      aria-label={`Open ${story.title} in Azure DevOps`}
      style={{ display: 'block' }}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs" py={2}>
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            {story.adoId}
          </Text>
          <Tooltip label={story.title} multiline maw={360} openDelay={300}>
            <Text size="xs" truncate style={{ minWidth: 0 }}>
              {story.title}
            </Text>
          </Tooltip>
        </Group>
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Text size="xs" c="dimmed">
            {story.assignedTo}
          </Text>
          <Badge size="xs" variant="light" color={STATUS_COLOR[story.statusGroup]}>
            {story.storyPoints}
          </Badge>
        </Group>
      </Group>
    </Anchor>
  );
}

function StatusSection({ group }: { group: StatusGroupViewModel }) {
  return (
    <Stack gap={2}>
      <Group gap="xs">
        <Text size="xs" fw={600} c={STATUS_COLOR[group.group]}>
          {group.group}
        </Text>
        <Badge size="xs" variant="light" color={STATUS_COLOR[group.group]}>
          {group.totalStoryPoints}
        </Badge>
      </Group>
      {group.stories.map((story) => (
        <StoryRow key={story.adoId} story={story} />
      ))}
    </Stack>
  );
}

export function SprintStoryListPanel({
  sprints,
  activeSprintId,
  loading = false,
  error = null,
}: SprintStoryListPanelProps) {
  if (loading) {
    return (
      <Stack gap="xs" data-testid="sprint-story-list-panel">
        <Skeleton height={32} />
        <Skeleton height={80} />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack data-testid="sprint-story-list-panel">
        <Text size="sm" c="red">
          {error}
        </Text>
      </Stack>
    );
  }

  if (sprints.length === 0) {
    return (
      <Stack data-testid="sprint-story-list-panel">
        <Text size="sm" c="dimmed">
          No sprint data available
        </Text>
      </Stack>
    );
  }

  const selectedSprint = sprints.find((s) => s.id === activeSprintId);
  if (!selectedSprint) {
    return (
      <section aria-label="Sprint Stories" data-testid="sprint-story-list-panel">
        <Text size="sm" c="dimmed" py="sm">
          No stories for selected sprint
        </Text>
      </section>
    );
  }

  return (
    <section aria-label="Sprint Stories" data-testid="sprint-story-list-panel">
      {selectedSprint.statusGroups.length === 0 ? (
        <Text size="sm" c="dimmed" py="sm">
          No user stories in this sprint
        </Text>
      ) : (
        <Stack gap="sm">
          {selectedSprint.statusGroups.map((group) => (
            <StatusSection key={group.group} group={group} />
          ))}
        </Stack>
      )}
    </section>
  );
}
