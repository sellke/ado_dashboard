'use client';

import { IconAlertCircle } from '@tabler/icons-react';
import { Alert, Button, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import type {
  DashboardViewModel,
  MilestoneQuarterGroup,
  SprintStoryViewModel,
} from '@/lib/dashboard/types';
import type { ApiProgramMilestoneRollup } from '@/lib/milestones/types';
import type { CycleTimeDrilldownContext } from './CycleTimeBreakdown';
import { ProgramSummarySection } from './ProgramSummarySection';
import { WorkstreamCardsGrid } from './WorkstreamCardsGrid';

export interface DashboardShellProps {
  viewModel: DashboardViewModel;
  onRetry: () => void;
  milestoneQuarterGroups?: MilestoneQuarterGroup[];
  milestonesLoading?: boolean;
  milestonesError?: string | null;
  programRollup?: ApiProgramMilestoneRollup | null;
  sprintStoriesMap?: Record<string, SprintStoryViewModel[]>;
  storiesLoading?: boolean;
  storiesError?: string | null;
  activeSprintId?: string;
  onActiveSprintChange?: (sprintId: string) => void;
  onCurrentSprintChange?: (sprintId: string | null) => void;
  cycleTimeDrilldownContext?: CycleTimeDrilldownContext;
  workstreamCount?: number;
  workstreamsLoading?: boolean;
}

function WorkstreamSection({
  viewModel,
  sprintStoriesMap,
  storiesLoading,
  storiesError,
  activeSprintId,
  onActiveSprintChange,
  onCurrentSprintChange,
  cycleTimeDrilldownContext,
}: {
  viewModel: DashboardViewModel;
  sprintStoriesMap?: Record<string, SprintStoryViewModel[]>;
  storiesLoading?: boolean;
  storiesError?: string | null;
  activeSprintId?: string;
  onActiveSprintChange?: (sprintId: string) => void;
  onCurrentSprintChange?: (sprintId: string | null) => void;
  cycleTimeDrilldownContext?: CycleTimeDrilldownContext;
}) {
  if (viewModel.state !== 'success') {
    return null;
  }
  const { workstreamCards } = viewModel;
  if (!workstreamCards || workstreamCards.length === 0) {
    return null;
  }
  return (
    <WorkstreamCardsGrid
      cards={workstreamCards}
      sprintStoriesMap={sprintStoriesMap}
      storiesLoading={storiesLoading}
      storiesError={storiesError}
      activeSprintId={activeSprintId}
      onActiveSprintChange={onActiveSprintChange}
      onCurrentSprintChange={onCurrentSprintChange}
      cycleTimeDrilldownContext={cycleTimeDrilldownContext}
    />
  );
}

/** Loading skeletons for summary and cards */
function LoadingSkeletons() {
  return (
    <Stack gap="xl" aria-label="Loading dashboard">
      <Stack gap="md">
        <Skeleton height={28} width={200} />
        <Skeleton height={16} width={300} />
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mt="md">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={80} radius="md" />
          ))}
        </SimpleGrid>
      </Stack>
      <Stack gap="md">
        <Skeleton height={28} width={150} />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={120} radius="md" />
          ))}
        </SimpleGrid>
      </Stack>
    </Stack>
  );
}

/** Empty state message */
function EmptyState({
  workstreamCount = 0,
  workstreamsLoading = false,
}: {
  workstreamCount?: number;
  workstreamsLoading?: boolean;
}) {
  const needsSeed = !workstreamsLoading && workstreamCount === 0;

  return (
    <Stack gap="md" align="center" py="xl">
      <Text size="lg" c="dimmed">
        {needsSeed ? 'Dashboard setup required' : 'No metrics data available'}
      </Text>
      <Text size="sm" c="dimmed" maw={480} ta="center">
        {needsSeed
          ? 'The database has no workstreams yet. Run `pnpm db:seed` locally, or add workstreams in Workstream Registry, then click Sync Now.'
          : 'Run Sync Now to pull Azure DevOps data and compute metrics for the current sprint.'}
      </Text>
    </Stack>
  );
}

/** Error state with retry */
function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      title="Error loading metrics"
      color="red"
      variant="light"
    >
      <Stack gap="md">
        <Text size="sm">{message ?? 'An error occurred while loading metrics.'}</Text>
        <Button variant="light" color="red" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    </Alert>
  );
}

export function DashboardShell({
  viewModel,
  onRetry,
  milestoneQuarterGroups,
  milestonesLoading,
  milestonesError,
  programRollup,
  sprintStoriesMap,
  storiesLoading,
  storiesError,
  activeSprintId,
  onActiveSprintChange,
  onCurrentSprintChange,
  cycleTimeDrilldownContext,
  workstreamCount,
  workstreamsLoading,
}: DashboardShellProps) {
  if (viewModel.state === 'loading') {
    return <LoadingSkeletons />;
  }

  if (viewModel.state === 'error') {
    return <ErrorState message={viewModel.errorMessage} onRetry={onRetry} />;
  }

  if (viewModel.state === 'empty') {
    return (
      <EmptyState
        workstreamCount={workstreamCount}
        workstreamsLoading={workstreamsLoading}
      />
    );
  }

  return (
    <Stack gap="xl">
      <ProgramSummarySection
        viewModel={viewModel}
        programRollup={programRollup}
        milestoneQuarterGroups={milestoneQuarterGroups}
        milestonesLoading={milestonesLoading}
        milestonesError={milestonesError}
        cycleTimeDrilldownContext={cycleTimeDrilldownContext}
      />
      <WorkstreamSection
        viewModel={viewModel}
        sprintStoriesMap={sprintStoriesMap}
        storiesLoading={storiesLoading}
        storiesError={storiesError}
        activeSprintId={activeSprintId}
        onActiveSprintChange={onActiveSprintChange}
        onCurrentSprintChange={onCurrentSprintChange}
        cycleTimeDrilldownContext={cycleTimeDrilldownContext}
      />
    </Stack>
  );
}
