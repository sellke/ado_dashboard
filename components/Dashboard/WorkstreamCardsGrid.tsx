'use client';

import { useEffect, useState } from 'react';
import { SimpleGrid, Stack, Title } from '@mantine/core';
import type { SprintStoryViewModel, WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { deriveSprintList } from '@/lib/dashboard/sprint-utils';
import { SprintTabSelector } from './SprintTabSelector';
import { WorkstreamHealthCard } from './WorkstreamHealthCard';

export interface WorkstreamCardsGridProps {
  cards: WorkstreamCardViewModel[];
  milestonesLoading?: boolean;
  milestonesError?: string | null;
  sprintStoriesMap?: Record<string, SprintStoryViewModel[]>;
  storiesLoading?: boolean;
  storiesError?: string | null;
}

export function WorkstreamCardsGrid({
  cards,
  milestonesLoading,
  milestonesError,
  sprintStoriesMap,
  storiesLoading,
  storiesError,
}: WorkstreamCardsGridProps) {
  const [activeSprintId, setActiveSprintId] = useState<string>('');

  const sprints = deriveSprintList(sprintStoriesMap);
  const currentSprintId = sprints.find((s) => s.isCurrent)?.id ?? undefined;

  useEffect(() => {
    if (sprints.length === 0) return;
    setActiveSprintId((prev) => {
      if (!prev) {
        const current = sprints.find((s) => s.isCurrent);
        return current?.id ?? sprints[0].id;
      }
      const stillValid = sprints.some((s) => s.id === prev);
      return stillValid ? prev : (sprints.find((s) => s.isCurrent)?.id ?? sprints[0].id);
    });
  }, [sprintStoriesMap]);

  if (!cards || cards.length === 0) {
    return null;
  }

  const sortedCards = [...cards].sort((a, b) =>
    a.workstreamName.localeCompare(b.workstreamName, undefined, { sensitivity: 'base' })
  );

  return (
    <Stack gap="md">
      <Title order={2}>Workstreams</Title>
      {!storiesLoading && sprints.length > 0 && (
        <SprintTabSelector
          sprints={sprints}
          activeSprintId={activeSprintId}
          onSprintChange={setActiveSprintId}
        />
      )}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {sortedCards.map((card) => (
          <WorkstreamHealthCard
            key={card.workstreamId}
            card={card}
            milestonesLoading={milestonesLoading}
            milestonesError={milestonesError}
            sprintStories={sprintStoriesMap?.[card.workstreamId]}
            activeSprintId={activeSprintId}
            currentSprintId={currentSprintId}
            storiesLoading={storiesLoading}
            storiesError={storiesError}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
