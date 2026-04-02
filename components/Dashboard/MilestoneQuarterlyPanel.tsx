'use client';

import { Badge, Card, Group, Progress, Stack, Text } from '@mantine/core';
import type { MilestoneQuarterGroup } from '@/lib/dashboard/types';

export interface MilestoneQuarterlyPanelProps {
  quarterGroups: MilestoneQuarterGroup[];
  loading?: boolean;
  error?: string | null;
}

export function MilestoneQuarterlyPanel({
  quarterGroups,
  loading,
  error,
}: MilestoneQuarterlyPanelProps) {
  if (loading) {
    return (
      <Text size="sm" c="dimmed">
        Loading milestone data...
      </Text>
    );
  }

  if (error) {
    return (
      <Text size="sm" c="red">
        {error}
      </Text>
    );
  }

  if (quarterGroups.length === 0) {
    return (
      <Text size="sm" c="dimmed" data-testid="milestone-quarterly-empty">
        No milestone data available
      </Text>
    );
  }

  return (
    <Stack gap="md" data-testid="milestone-quarterly-panel">
      {quarterGroups.map((group) => (
        <Card key={group.quarter} withBorder padding="sm">
          <Stack gap="xs">
            <Group gap="xs">
              <Badge variant="light" color="indigo" size="sm">
                {group.quarter}
              </Badge>
            </Group>

            {group.features.map((feature) => (
              <Stack key={feature.id} gap={4} pl="xs">
                <Group gap="xs" align="baseline">
                  <Text size="sm" fw={500}>
                    {feature.title}
                  </Text>
                  {feature.adpMonTagLabel && (
                    <Badge variant="outline" size="xs" color="violet">
                      {feature.adpMonTagLabel}
                    </Badge>
                  )}
                  {feature.adoFeatureId && (
                    <Text size="xs" c="dimmed">
                      ({feature.adoFeatureId})
                    </Text>
                  )}
                </Group>

                {feature.workstreams.length === 0 ? (
                  <Text size="xs" c="dimmed" pl="md">
                    No rollup-tagged child stories in local data for this feature (sync User Stories or
                    check parent link).
                  </Text>
                ) : (
                  feature.workstreams.map((ws) => (
                    <Stack key={ws.workstreamId} gap={2} pl="md">
                      <Group justify="space-between" wrap="nowrap">
                        <Text size="xs" c="dimmed">
                          {ws.workstreamName}: {ws.totalStories} stories
                        </Text>
                        <Group gap={4} wrap="nowrap">
                          <Text size="xs" c="blue">
                            {ws.inProgressPercent}% active
                          </Text>
                          <Text size="xs" c="teal">
                            {ws.completedPercent}% done
                          </Text>
                        </Group>
                      </Group>
                      <Progress.Root size="xs">
                        <Progress.Section value={ws.completedPercent} color="teal" />
                        <Progress.Section value={ws.inProgressPercent} color="blue" />
                      </Progress.Root>
                    </Stack>
                  ))
                )}
              </Stack>
            ))}
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
