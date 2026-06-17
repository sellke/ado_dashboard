'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconSettings } from '@tabler/icons-react';
import { Button, Group, Stack, Title } from '@mantine/core';
import {
  createErrorViewModel,
  createLoadingViewModel,
  groupMilestonesByQuarter,
  mapApiResponseToDashboardViewModel,
} from '@/lib/dashboard/adapter';
import { DASHBOARDS, type DashboardId } from '@/lib/dashboard/config';
import { mapSprintStoriesResponse } from '@/lib/dashboard/sprint-stories-adapter';
import type {
  ApiResponse,
  SprintStoriesApiResponse,
  SprintStoryViewModel,
} from '@/lib/dashboard/types';
import {
  appendWorkstreamIdsParam,
  loadDashboardWorkstreamScope,
  resolveDashboardWorkstreamScope,
  saveDashboardWorkstreamScope,
  type WorkstreamScopeOption,
} from '@/lib/dashboard/workstream-scope';
import { buildPresentation, enrichExportInput, type ExportInput } from '@/lib/export';
import type {
  ApiMilestonesResponse,
  ApiMilestoneWithProgress,
  ApiProgramMilestoneRollup,
} from '@/lib/milestones/types';
import { AdoCredentialsModal } from './AdoCredentialsModal';
import { DashboardShell } from './DashboardShell';
import { ExportControl } from './ExportControl';
import { MetricConfigPanel } from './MetricConfigPanel';
import { SyncControl } from './SyncControl';
import { WorkstreamRegistryPanel } from './WorkstreamRegistryPanel';
import { WorkstreamScopeModal } from './WorkstreamScopeModal';

const SYNC_ENDPOINT = '/api/sync/ado';
const ADO_AUTH_FAILURE_CODE = 'ADO_AUTH_FAILURE';
const ADO_AUTH_ERROR_PATTERN =
  /ADO_PAT|ADO_ORG|ADO credentials|Azure DevOps PAT|Azure DevOps.*\b(302|401|403)\b|ADO .*\b(302|401|403)\b/i;

export interface DashboardContainerProps {
  dashboard?: DashboardId;
  title?: string;
}

export function DashboardContainer({ dashboard, title = 'Dashboard' }: DashboardContainerProps) {
  const dashboardId = dashboard ?? 'main';
  const [rawMetrics, setRawMetrics] = useState<ApiResponse | null>(null);
  const [metricsViewState, setMetricsViewState] = useState<'loading' | 'error' | 'success'>(
    'loading'
  );
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<ApiMilestoneWithProgress[]>([]);
  const [programRollup, setProgramRollup] = useState<ApiProgramMilestoneRollup | null>(null);
  const [milestonesLoading, setMilestonesLoading] = useState(true);
  const [milestonesError, setMilestonesError] = useState<string | null>(null);
  const [sprintStoriesMap, setSprintStoriesMap] = useState<Record<string, SprintStoryViewModel[]>>(
    {}
  );
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncAuthError, setSyncAuthError] = useState(false);
  const [syncPartialSuccess, setSyncPartialSuccess] = useState(false);
  const [exportInProgress, setExportInProgress] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [scopeModalOpened, setScopeModalOpened] = useState(false);
  const [registryOpened, setRegistryOpened] = useState(false);
  const [metricConfigOpened, setMetricConfigOpened] = useState(false);
  const [adoCredentialsOpened, setAdoCredentialsOpened] = useState(false);
  const [allWorkstreams, setAllWorkstreams] = useState<WorkstreamScopeOption[]>([]);
  const [workstreamsLoading, setWorkstreamsLoading] = useState(true);
  const [workstreamsError, setWorkstreamsError] = useState<string | null>(null);
  const [storedScopeIds, setStoredScopeIds] = useState<string[] | null>(null);
  const [activeScopedIds, setActiveScopedIds] = useState<string[] | null>(null);
  const [activeSprintId, setActiveSprintId] = useState('');
  const [currentSprintId, setCurrentSprintId] = useState<string | null | undefined>(undefined);
  const [scopeRefreshToken, setScopeRefreshToken] = useState(0);
  const metricsRequestIdRef = useRef(0);
  const milestonesRequestIdRef = useRef(0);
  const storiesRequestIdRef = useRef(0);

  const metricsUrl = useMemo(() => {
    let base = `/api/metrics?dashboard=${dashboardId}`;
    if (activeSprintId && currentSprintId !== undefined && activeSprintId !== currentSprintId) {
      base += `&sprintId=${activeSprintId}`;
    }
    return activeScopedIds ? appendWorkstreamIdsParam(base, activeScopedIds) : base;
  }, [dashboardId, activeScopedIds, activeSprintId, currentSprintId]);

  const milestonesUrl = useMemo(
    () =>
      activeScopedIds
        ? appendWorkstreamIdsParam('/api/milestones', activeScopedIds)
        : '/api/milestones',
    [activeScopedIds]
  );

  const selectedScopeIds = useMemo(() => {
    if (activeScopedIds) {
      return activeScopedIds;
    }
    const defaultNames = new Set(DASHBOARDS[dashboardId].workstreamNames);
    return allWorkstreams
      .filter((workstream) => defaultNames.has(workstream.name))
      .map((workstream) => workstream.id);
  }, [activeScopedIds, allWorkstreams, dashboardId]);

  const fetchAllWorkstreams = useCallback(async () => {
    setWorkstreamsLoading(true);
    setWorkstreamsError(null);

    try {
      const res = await fetch('/api/workstreams');
      const data: { workstreams?: WorkstreamScopeOption[]; error?: string } = await res.json();

      if (!res.ok) {
        setWorkstreamsError(data.error ?? `Request failed: ${res.status}`);
        setAllWorkstreams([]);
        return;
      }

      const loaded = data.workstreams ?? [];
      setAllWorkstreams(loaded);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workstreams';
      setWorkstreamsError(message);
      setAllWorkstreams([]);
    } finally {
      setWorkstreamsLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedIds = loadDashboardWorkstreamScope(window.localStorage, dashboardId);
    setStoredScopeIds(savedIds);
    setActiveScopedIds(null);
  }, [dashboardId]);

  useEffect(() => {
    fetchAllWorkstreams();
  }, [fetchAllWorkstreams, dashboardId]);

  useEffect(() => {
    if (allWorkstreams.length === 0) {
      return;
    }

    const resolved = resolveDashboardWorkstreamScope({
      storedIds: storedScopeIds,
      workstreams: allWorkstreams,
      defaultWorkstreamNames: DASHBOARDS[dashboardId].workstreamNames,
    });
    setActiveScopedIds(resolved.source === 'saved' ? resolved.includedWorkstreamIds : null);
  }, [allWorkstreams, dashboardId, storedScopeIds]);

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

  const cycleTimeDrilldownContext = useMemo(
    () => ({
      dashboard: dashboardId,
      sprintId: rawMetrics?.sprint?.id ?? null,
      workstreamIds: activeScopedIds,
    }),
    [activeScopedIds, dashboardId, rawMetrics?.sprint?.id]
  );

  const milestoneQuarterGroups = useMemo(() => groupMilestonesByQuarter(milestones), [milestones]);

  const fetchMetrics = useCallback(
    async (options?: { skipLoadingState?: boolean }) => {
      const requestId = ++metricsRequestIdRef.current;
      if (!options?.skipLoadingState) {
        setMetricsViewState('loading');
        setMetricsError(null);
      }

      try {
        const res = await fetch(metricsUrl);
        const data: ApiResponse | { error?: string } = await res.json();
        if (requestId !== metricsRequestIdRef.current) {
          return;
        }

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
        if (requestId !== metricsRequestIdRef.current) {
          return;
        }
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
    const requestId = ++milestonesRequestIdRef.current;
    setMilestonesLoading(true);
    setMilestonesError(null);

    try {
      const res = await fetch(milestonesUrl);
      const data: ApiMilestonesResponse | { error?: string } = await res.json();
      if (requestId !== milestonesRequestIdRef.current) {
        return;
      }

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
      if (requestId !== milestonesRequestIdRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to load milestones';
      setMilestonesError(message);
      setMilestones([]);
      setProgramRollup(null);
    } finally {
      if (requestId === milestonesRequestIdRef.current) {
        setMilestonesLoading(false);
      }
    }
  }, [milestonesUrl]);

  /** Triggers POST /api/sync/ado (full refresh), then auto-refetches metrics and milestones. */
  const handleSync = useCallback(async () => {
    setSyncError(null);
    setSyncAuthError(false);
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
        errorCode?: string;
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
        setSyncAuthError(
          data.errorCode === ADO_AUTH_FAILURE_CODE || ADO_AUTH_ERROR_PATTERN.test(msg)
        );
        return;
      }

      await Promise.all([fetchMetrics({ skipLoadingState: true }), fetchMilestones()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync request failed';
      setSyncError(message);
      setSyncAuthError(false);
    } finally {
      setSyncInProgress(false);
    }
  }, [fetchMetrics, fetchMilestones]);

  const handleSaveScope = useCallback(
    (includedWorkstreamIds: string[]) => {
      saveDashboardWorkstreamScope(window.localStorage, dashboardId, includedWorkstreamIds);
      setStoredScopeIds(includedWorkstreamIds);
      setActiveScopedIds(includedWorkstreamIds);
      setActiveSprintId('');
      setCurrentSprintId(undefined);
      setScopeModalOpened(false);
      setSprintStoriesMap({});
      setScopeRefreshToken((token) => token + 1);
    },
    [dashboardId]
  );

  const handleCurrentSprintChange = useCallback((sprintId: string | null) => {
    setCurrentSprintId(sprintId);
  }, []);

  const handleExport = useCallback(async () => {
    setExportError(null);
    setExportInProgress(true);
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;
      const input: ExportInput = enrichExportInput(
        {
          sprintName: rawMetrics?.sprint?.name ?? 'Unknown Sprint',
          computedAt: rawMetrics?.computedAt ?? null,
          programMetrics: viewModel.programMetrics,
          programRollup,
          programTrendSprints: viewModel.programTrendSprints,
          sprint5Prediction: viewModel.sprint5Prediction,
          workstreams: viewModel.workstreamCards,
          rawWorkstreams: rawMetrics?.workstreams ?? [],
          milestones,
        },
        viewModel,
        programRollup
      );
      const prs = await buildPresentation(PptxGenJS, input);
      const date = new Date().toISOString().slice(0, 10);
      await prs.writeFile({ fileName: `LiveLink-Health-Report-${date}.pptx` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setExportError(msg);
    } finally {
      setExportInProgress(false);
    }
  }, [rawMetrics, viewModel, programRollup, milestones]);

  const fetchSprintStories = useCallback(async (workstreamIds: string[]) => {
    const requestId = ++storiesRequestIdRef.current;
    if (workstreamIds.length === 0) {
      setSprintStoriesMap({});
      return;
    }
    setStoriesLoading(true);
    setStoriesError(null);

    try {
      const results: Record<string, SprintStoryViewModel[]> = {};
      await Promise.all(
        workstreamIds.map(async (wsId) => {
          const res = await fetch(`/api/sprints/stories?workstreamId=${wsId}`);
          if (!res.ok) {
            return;
          }
          const data: SprintStoriesApiResponse = await res.json();
          results[wsId] = mapSprintStoriesResponse(data);
        })
      );
      if (requestId !== storiesRequestIdRef.current) {
        return;
      }
      setSprintStoriesMap(results);
    } catch (err) {
      if (requestId !== storiesRequestIdRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to load sprint stories';
      setStoriesError(message);
    } finally {
      if (requestId === storiesRequestIdRef.current) {
        setStoriesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics, scopeRefreshToken]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones, scopeRefreshToken]);

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
        <Group gap="sm" align="flex-start">
          <Button
            variant="light"
            leftSection={<IconSettings size={16} />}
            onClick={() => setScopeModalOpened(true)}
          >
            Workstream scope
          </Button>
          <Button
            variant="light"
            leftSection={<IconSettings size={16} />}
            onClick={() => setRegistryOpened(true)}
          >
            Workstream Registry
          </Button>
          <Button
            variant="light"
            leftSection={<IconSettings size={16} />}
            onClick={() => setMetricConfigOpened(true)}
          >
            Metric configuration
          </Button>
          <ExportControl
            onExport={handleExport}
            isExporting={exportInProgress}
            exportError={exportError}
            onDismissError={() => setExportError(null)}
          />
          <SyncControl
            onSync={handleSync}
            syncInProgress={syncInProgress}
            syncError={syncError}
            syncPartialSuccess={syncPartialSuccess}
            isAuthError={syncAuthError}
            onUpdateCredentials={() => setAdoCredentialsOpened(true)}
            onDismissError={() => {
              setSyncError(null);
              setSyncAuthError(false);
            }}
          />
        </Group>
      </Group>
      <AdoCredentialsModal
        opened={adoCredentialsOpened}
        onClose={() => setAdoCredentialsOpened(false)}
        onSaved={() => {
          setSyncError(null);
          setSyncAuthError(false);
        }}
      />
      <WorkstreamScopeModal
        opened={scopeModalOpened}
        workstreams={allWorkstreams}
        selectedIds={selectedScopeIds}
        loading={workstreamsLoading}
        error={workstreamsError}
        onSave={handleSaveScope}
        onCancel={() => setScopeModalOpened(false)}
        onRetry={fetchAllWorkstreams}
      />
      <MetricConfigPanel
        opened={metricConfigOpened}
        onClose={() => setMetricConfigOpened(false)}
        onRecomputed={() => fetchMetrics()}
        recalculateSprintId={rawMetrics?.sprint?.id ?? null}
      />
      <WorkstreamRegistryPanel
        opened={registryOpened}
        onClose={() => setRegistryOpened(false)}
        onChanged={fetchAllWorkstreams}
      />
      <DashboardShell
        viewModel={viewModel}
        onRetry={() => {
          fetchMetrics();
          fetchMilestones();
        }}
        milestoneQuarterGroups={milestoneQuarterGroups}
        milestonesLoading={milestonesLoading}
        milestonesError={milestonesError}
        programRollup={programRollup}
        sprintStoriesMap={sprintStoriesMap}
        storiesLoading={storiesLoading}
        storiesError={storiesError}
        activeSprintId={activeSprintId}
        onActiveSprintChange={setActiveSprintId}
        onCurrentSprintChange={handleCurrentSprintChange}
        cycleTimeDrilldownContext={cycleTimeDrilldownContext}
        workstreamCount={allWorkstreams.length}
        workstreamsLoading={workstreamsLoading}
      />
    </Stack>
  );
}
