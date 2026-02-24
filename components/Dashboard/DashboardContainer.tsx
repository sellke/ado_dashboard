'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Group, Stack, Title } from '@mantine/core';
import {
  createErrorViewModel,
  createLoadingViewModel,
  mapApiResponseToDashboardViewModel,
} from '@/lib/dashboard/adapter';
import type { DashboardId } from '@/lib/dashboard/config';
import type { ApiResponse } from '@/lib/dashboard/types';
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
    return mapApiResponseToDashboardViewModel(rawMetrics, milestones);
  }, [metricsViewState, metricsError, rawMetrics, milestones]);

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

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

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
        onRetry={() => fetchMetrics()}
        milestonesLoading={milestonesLoading}
        milestonesError={milestonesError}
        programRollup={programRollup}
      />
    </Stack>
  );
}
