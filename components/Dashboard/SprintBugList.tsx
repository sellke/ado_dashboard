'use client';

import { Box, Text } from '@mantine/core';
import type { TrendSprintViewModel } from '@/lib/dashboard/types';

export interface SprintBugListProps {
  trendSprints: TrendSprintViewModel[];
}

export function SprintBugList({ trendSprints }: SprintBugListProps) {
  if (trendSprints.length === 0) {
    return null;
  }

  return (
    <Box data-testid="sprint-bug-list">
      {trendSprints.map((sprint) => (
        <Box key={sprint.sprintId} mb="xs">
          <Text size="xs" fw={500} mb={4}>
            {sprint.sprintName}
          </Text>
          {sprint.bugs.length === 0 ? (
            <Text size="xs" c="dimmed">
              No bugs
            </Text>
          ) : (
            <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
              {sprint.bugs.map((bug) => (
                <Box key={bug.adoId} component="li" mb={2}>
                  <Text
                    size="xs"
                    td={bug.isClosed ? 'line-through' : undefined}
                    c={bug.isClosed ? 'dimmed' : undefined}
                    truncate
                  >
                    #{bug.adoId} — {bug.title}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}
