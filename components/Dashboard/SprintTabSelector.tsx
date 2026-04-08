'use client';

import { Badge, Tabs, Tooltip } from '@mantine/core';
import type { SprintStoryViewModel } from '@/lib/dashboard/types';

export interface SprintTabSelectorProps {
  sprints: SprintStoryViewModel[];
  activeSprintId: string;
  onSprintChange: (sprintId: string) => void;
  loading?: boolean;
}

export function SprintTabSelector({
  sprints,
  activeSprintId,
  onSprintChange,
  loading = false,
}: SprintTabSelectorProps) {
  if (loading || sprints.length === 0) {
    return null;
  }

  const handleChange = (value: string | null) => {
    if (value !== null) {
      onSprintChange(value);
    }
  };

  return (
    <Tabs
      value={activeSprintId}
      onChange={handleChange}
      variant="outline"
      data-testid="sprint-tab-selector"
    >
      <Tabs.List>
        {sprints.map((sprint) => (
          <Tabs.Tab key={sprint.id} value={sprint.id}>
            {sprint.name}
            {sprint.isCurrent ? ' (current)' : ''}
            {sprint.totalStories > 0 && (
              <Tooltip label={`${sprint.totalStories} stories in this sprint`} withArrow>
                <Badge size="xs" ml={4} variant="light">
                  {sprint.totalStories}
                </Badge>
              </Tooltip>
            )}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {sprints.map((sprint) => (
        <Tabs.Panel key={sprint.id} value={sprint.id}>
          {null}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
