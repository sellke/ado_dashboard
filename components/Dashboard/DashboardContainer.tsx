'use client';

import { useCallback, useEffect, useState } from 'react';
import { Group, Stack, Title } from '@mantine/core';
import {
  createErrorViewModel,
  createLoadingViewModel,
  mapApiResponseToDashboardViewModel,
} from '@/lib/dashboard/adapter';
import type { ApiResponse, DashboardViewModel } from '@/lib/dashboard/types';
import type { ApiMilestone } from '@/lib/milestones/types';
import { DashboardShell } from './DashboardShell';
import { MilestonePanel } from './MilestonePanel';
import { SyncControl } from './SyncControl';

const SYNC_ENDPOINT = '/api/sync/ado';

export function DashboardContainer() {
  const [viewModel, setViewModel] = useState<DashboardViewModel>(createLoadingViewModel());
  const [milestones, setMilestones] = useState<ApiMilestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(true);
  const [milestonesError, setMilestonesError] = useState<string | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncPartialSuccess, setSyncPartialSuccess] = useState(false);

  const fetchMetrics = useCallback(
    async (options?: { skipLoadingState?: boolean }) => {
      if (!options?.skipLoadingState) {
        setViewModel(createLoadingViewModel());
      }

      try {
        const res = await fetch('/api/metrics');
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
          setViewModel(createErrorViewModel(msg));
          return;
        }

        setSyncPartialSuccess(false);
        const vm = mapApiResponseToDashboardViewModel(data as ApiResponse);
        setViewModel(vm);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load metrics';
        if (options?.skipLoadingState) {
          setSyncPartialSuccess(true);
          return;
        }
        setViewModel(createErrorViewModel(message));
      }
    },
    []
  );

  /** Triggers POST /api/sync/ado (full refresh), then auto-refetches metrics. Handles in-flight state, sync failure, and partial success (sync OK, metrics refetch failed). */
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
      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        const msg = data?.error ?? `Request failed: ${res.status}`;
        setSyncError(msg);
        return;
      }

      await fetchMetrics({ skipLoadingState: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync request failed';
      setSyncError(message);
    } finally {
      setSyncInProgress(false);
    }
  }, [fetchMetrics]);

  const fetchMilestones = useCallback(async () => {
    setMilestonesLoading(true);
    setMilestonesError(null);

    try {
      const res = await fetch('/api/milestones');
      const data: ApiMilestone[] | { error?: string } = await res.json();

      if (!res.ok) {
        const msg =
          typeof data === 'object' && data && 'error' in data
            ? String(data.error)
            : `Request failed: ${res.status}`;
        setMilestonesError(msg);
        setMilestones([]);
        return;
      }

      setMilestones(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load milestones';
      setMilestonesError(message);
      setMilestones([]);
    } finally {
      setMilestonesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const workstreams =
    viewModel.state === 'success' && viewModel.workstreamCards
      ? viewModel.workstreamCards.map((c) => ({
          id: c.workstreamId,
          name: c.workstreamName,
        }))
      : [];

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <Title order={1}>Dashboard</Title>
        <SyncControl
          onSync={handleSync}
          syncInProgress={syncInProgress}
          syncError={syncError}
          syncPartialSuccess={syncPartialSuccess}
          onDismissError={() => setSyncError(null)}
        />
      </Group>
      <DashboardShell viewModel={viewModel} onRetry={() => fetchMetrics()} />
      <MilestonePanel
        milestones={milestones}
        workstreams={workstreams}
        loading={milestonesLoading}
        error={milestonesError}
        onRefresh={fetchMilestones}
      />
    </Stack>
  );
}
