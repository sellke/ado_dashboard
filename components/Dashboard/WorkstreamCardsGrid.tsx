'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SimpleGrid, Stack, Title } from '@mantine/core';
import { deriveSprintList } from '@/lib/dashboard/sprint-utils';
import type { SprintStoryViewModel, WorkstreamCardViewModel } from '@/lib/dashboard/types';
import type { CycleTimeDrilldownContext } from './CycleTimeBreakdown';
import { SprintTabSelector } from './SprintTabSelector';
import { WorkstreamHealthCard } from './WorkstreamHealthCard';

export interface WorkstreamCardsGridProps {
  cards: WorkstreamCardViewModel[];
  sprintStoriesMap?: Record<string, SprintStoryViewModel[]>;
  storiesLoading?: boolean;
  storiesError?: string | null;
  activeSprintId?: string;
  onActiveSprintChange?: (sprintId: string) => void;
  onCurrentSprintChange?: (sprintId: string | null) => void;
  cycleTimeDrilldownContext?: CycleTimeDrilldownContext;
}

export function WorkstreamCardsGrid({
  cards,
  sprintStoriesMap,
  storiesLoading,
  storiesError,
  activeSprintId,
  onActiveSprintChange,
  onCurrentSprintChange,
  cycleTimeDrilldownContext,
}: WorkstreamCardsGridProps) {
  const [uncontrolledActiveSprintId, setUncontrolledActiveSprintId] = useState<string>('');

  const sprints = useMemo(() => deriveSprintList(sprintStoriesMap), [sprintStoriesMap]);
  const currentSprintId = sprints.find((s) => s.isCurrent)?.id ?? undefined;
  const selectedActiveSprintId = activeSprintId ?? uncontrolledActiveSprintId;
  const handleActiveSprintChange = useCallback(
    (sprintId: string) => {
      if (onActiveSprintChange) {
        onActiveSprintChange(sprintId);
        return;
      }
      setUncontrolledActiveSprintId(sprintId);
    },
    [onActiveSprintChange]
  );

  useEffect(() => {
    onCurrentSprintChange?.(currentSprintId ?? null);
    if (sprints.length === 0) {
      return;
    }
    const fallbackSprintId = currentSprintId ?? sprints[0].id;
    const stillValid = sprints.some((s) => s.id === selectedActiveSprintId);
    if (!selectedActiveSprintId || !stillValid) {
      handleActiveSprintChange(fallbackSprintId);
    }
  }, [
    currentSprintId,
    handleActiveSprintChange,
    onCurrentSprintChange,
    selectedActiveSprintId,
    sprints,
  ]);

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
          activeSprintId={selectedActiveSprintId}
          onSprintChange={handleActiveSprintChange}
        />
      )}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" style={{ alignItems: 'start' }}>
        {sortedCards.map((card) => (
          <WorkstreamHealthCard
            key={card.workstreamId}
            card={card}
            sprintStories={sprintStoriesMap?.[card.workstreamId]}
            activeSprintId={selectedActiveSprintId}
            currentSprintId={currentSprintId}
            cycleTimeDrilldownContext={cycleTimeDrilldownContext}
            storiesLoading={storiesLoading}
            storiesError={storiesError}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
