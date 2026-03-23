'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Center, Loader, Stack, Title } from '@mantine/core';
import { mapApiResponseToDashboardViewModel } from '@/lib/dashboard/adapter';
import type { ApiResponse, DashboardViewModel } from '@/lib/dashboard/types';
import { BugReportTable } from './BugReportTable';

export function BugReportContainer() {
  const [rawMetrics, setRawMetrics] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/metrics?dashboard=main');
      const data: ApiResponse | { error?: string } = await res.json();

      if (!res.ok) {
        const msg =
          typeof data === 'object' && data && 'error' in data
            ? String(data.error)
            : `Request failed: ${res.status}`;
        setError(msg);
        return;
      }

      setRawMetrics(data as ApiResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const viewModel: DashboardViewModel | null = useMemo(() => {
    if (!rawMetrics) return null;
    return mapApiResponseToDashboardViewModel(rawMetrics);
  }, [rawMetrics]);

  return (
    <Stack gap="xl">
      <Title order={1}>Bug Report</Title>

      {loading && (
        <Center py="xl">
          <Loader />
        </Center>
      )}

      {error && (
        <Alert color="red" title="Error loading bug data">
          {error}
        </Alert>
      )}

      {!loading && !error && viewModel && (
        <BugReportTable workstreamCards={viewModel.workstreamCards} />
      )}
    </Stack>
  );
}
