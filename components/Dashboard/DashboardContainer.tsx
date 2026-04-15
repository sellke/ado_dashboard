'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Group, Stack, Title } from '@mantine/core';
import {
  createErrorViewModel,
  createLoadingViewModel,
  groupMilestonesByQuarter,
  mapApiResponseToDashboardViewModel,
} from '@/lib/dashboard/adapter';
import { mapSprintStoriesResponse } from '@/lib/dashboard/sprint-stories-adapter';
import type { DashboardId } from '@/lib/dashboard/config';
import type { ApiResponse, SprintStoriesApiResponse, SprintStoryViewModel } from '@/lib/dashboard/types';
import type {
  ApiMilestonesResponse,
  ApiMilestoneWithProgress,
  ApiProgramMilestoneRollup,
} from '@/lib/milestones/types';
import { DashboardShell } from './DashboardShell';
import { SyncControl } from './SyncControl';

const SYNC_ENDPOINT = '/api/sync/ado';

export interface DashboardContainerProps {
  dashboard?: DashboardId;
  title?: string;
}

export function DashboardContainer({ dashboard, title = 'Dashboard' }: DashboardContainerProps) {
  const [rawMetrics, setRawMetrics] = useState<ApiResponse | null>(null);
  const [metricsViewState, setMetricsViewState] = useState<'loading' | 'error' | 'success'>(
    'loading'
  );
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<ApiMilestoneWithProgress[]>([]);
  const [programRollup, setProgramRollup] = useState<ApiProgramMilestoneRollup | null>(null);
  const [milestonesLoading, setMilestonesLoading] = useState(true);
  const [milestonesError, setMilestonesError] = useState<string | null>(null);
  const [sprintStoriesMap, setSprintStoriesMap] = useState<Record<string, SprintStoryViewModel[]>>({});
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncPartialSuccess, setSyncPartialSuccess] = useState(false);

  const metricsUrl = dashboard ? `/api/metrics?dashboard=${dashboard}` : '/api/metrics';

  const viewModel = useMemo(() => {
    if (metricsViewState === 'loading') {
      return createLoadingViewModel();
    }
    if (metricsViewState === 'error') {
      return createErrorViewModel(metricsError ?? 'Unknown error');
    }
    if (!rawMetrics) {
      return createLoadingViewModel();
    }
    return mapApiResponseToDashboardViewModel(rawMetrics);
  }, [metricsViewState, metricsError, rawMetrics]);

  const milestoneQuarterGroups = useMemo(
    () => groupMilestonesByQuarter(milestones),
    [milestones]
  );

  const fetchMetrics = useCallback(
    async (options?: { skipLoadingState?: boolean }) => {
      if (!options?.skipLoadingState) {
        setMetricsViewState('loading');
        setMetricsError(null);
      }

      try {
        const res = await fetch(metricsUrl);
        const data: ApiResponse | { error?: string } = await res.json();

        if (!res.ok) {
          const msg =
            typeof data === 'object' && data && 'error' in data
              ? String(data.error)
              : `Request failed: ${res.status}`;
          if (options?.skipLoadingState) {
            setSyncPartialSuccess(true);
            return;
          }
          setMetricsError(msg);
          setMetricsViewState('error');
          return;
        }

        setSyncPartialSuccess(false);
        setRawMetrics(data as ApiResponse);
        setMetricsViewState('success');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load metrics';
        if (options?.skipLoadingState) {
          setSyncPartialSuccess(true);
          return;
        }
        setMetricsError(message);
        setMetricsViewState('error');
      }
    },
    [metricsUrl]
  );

  const fetchMilestones = useCallback(async () => {
    setMilestonesLoading(true);
    setMilestonesError(null);

    try {
      const res = await fetch('/api/milestones');
      const data: ApiMilestonesResponse | { error?: string } = await res.json();

      if (!res.ok) {
        const msg =
          typeof data === 'object' && data && 'error' in data
            ? String(data.error)
            : `Request failed: ${res.status}`;
        setMilestonesError(msg);
        setMilestones([]);
        setProgramRollup(null);
        return;
      }

      const response = data as ApiMilestonesResponse;
      setMilestones(response.milestones ?? []);
      setProgramRollup(response.programRollup ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load milestones';
      setMilestonesError(message);
      setMilestones([]);
      setProgramRollup(null);
    } finally {
      setMilestonesLoading(false);
    }
  }, []);

  /** Triggers POST /api/sync/ado (full refresh), then auto-refetches metrics and milestones. */
  const handleSync = useCallback(async () => {
    setSyncError(null);
    setSyncPartialSuccess(false);
    setSyncInProgress(true);

    try {
      const res = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType: 'Full' }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        summary?: { errorMessage?: string | null };
      };

      if (!res.ok || !data.success) {
        const msg =
          data.error ??
          (res.ok && data.summary?.errorMessage?.trim()
            ? data.summary.errorMessage.trim()
            : !res.ok
              ? `Request failed: ${res.status}`
              : 'Sync finished with errors');
        setSyncError(msg);
        return;
      }

      await Promise.all([
        fetchMetrics({ skipLoadingState: true }),
        fetchMilestones(),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync request failed';
      setSyncError(message);
    } finally {
      setSyncInProgress(false);
    }
  }, [fetchMetrics, fetchMilestones]);

  const fetchSprintStories = useCallback(
    async (workstreamIds: string[]) => {
      if (workstreamIds.length === 0) {return;}
      setStoriesLoading(true);
      setStoriesError(null);

      try {
        const results: Record<string, SprintStoryViewModel[]> = {};
        await Promise.all(
          workstreamIds.map(async (wsId) => {
            const res = await fetch(`/api/sprints/stories?workstreamId=${wsId}`);
            if (!res.ok) {return;}
            const data: SprintStoriesApiResponse = await res.json();
            results[wsId] = mapSprintStoriesResponse(data);
          })
        );
        setSprintStoriesMap(results);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load sprint stories';
        setStoriesError(message);
      } finally {
        setStoriesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  useEffect(() => {
    if (metricsViewState === 'success' && rawMetrics?.workstreams) {
      const wsIds = rawMetrics.workstreams.map((ws) => ws.workstreamId);
      fetchSprintStories(wsIds);
    }
  }, [metricsViewState, rawMetrics, fetchSprintStories]);

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <Title order={1}>{title}</Title>
        <SyncControl
          onSync={handleSync}
          syncInProgress={syncInProgress}
          syncError={syncError}
          syncPartialSuccess={syncPartialSuccess}
          onDismissError={() => setSyncError(null)}
        />
      </Group>
      <DashboardShell
        viewModel={viewModel}
        onRetry={() => { fetchMetrics(); fetchMilestones(); }}
        milestoneQuarterGroups={milestoneQuarterGroups}
        milestonesLoading={milestonesLoading}
        milestonesError={milestonesError}
        programRollup={programRollup}
        sprintStoriesMap={sprintStoriesMap}
        storiesLoading={storiesLoading}
        storiesError={storiesError}
      />
    </Stack>
  );
}
