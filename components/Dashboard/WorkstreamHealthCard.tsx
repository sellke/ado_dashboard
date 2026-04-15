'use client';

import { useMemo } from 'react';
import { Card, Group, Stack, Text } from '@mantine/core';
import type { MetricTileViewModel, SprintStoryViewModel, TrendSprintViewModel, WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { AppBarChart } from '@/lib/charts';
import { OverheadBreakdownPanel } from './OverheadBreakdownPanel';
import { RagBadge } from './RagBadge';
import { SprintBugList } from './SprintBugList';
import { SprintStoryListPanel } from './SprintStoryListPanel';
import { VelocityTrendChart } from './VelocityTrendChart';

export interface WorkstreamHealthCardProps {
  /** Workstream card view model with metrics and detail */
  card: WorkstreamCardViewModel;
  sprintStories?: SprintStoryViewModel[];
  activeSprintId?: string;
  /** The current (in-flight) sprint ID — used to skip trend-sprint overrides for the default view. */
  currentSprintId?: string;
  storiesLoading?: boolean;
  storiesError?: string | null;
}

/**
 * Renders a compact workstream health card with 4 core metrics (Velocity, Velocity Rate,
 * Overhead %, Carry-Over %), RAG status, detail block, velocity trend chart, and bug list.
 * Export-friendly for slide generation; handles null values gracefully.
 */
function formatMetricVal(value: number | null, unit: string): string {
  if (value === null) return 'N/A';
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} ${unit}`;
}

function formatRate(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(2)} pts/hr`;
}

function formatPct(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(2)}%`;
}

function buildBugChartData(sprints: TrendSprintViewModel[]) {
  return sprints.map((s) => ({
    sprint: s.sprintName,
    'Open (New/Active)': s.rawActiveBugs,
    'Closed (Resolved/Testing/Closed)': s.rawBugsClosed,
  }));
}

export function WorkstreamHealthCard({
  card,
  sprintStories,
  activeSprintId,
  currentSprintId,
  storiesLoading,
  storiesError,
}: WorkstreamHealthCardProps) {
  const {
    workstreamName,
    metrics,
    detail,
    detailSprintLabel,
    trendSprints = [],
    prediction,
  } = card;

  const isNonCurrentSprint =
    !!activeSprintId && !!currentSprintId && activeSprintId !== currentSprintId;

  const matchedTrendSprint = useMemo(() => {
    if (!isNonCurrentSprint) return null;
    return trendSprints.find((s) => s.sprintId === activeSprintId) ?? null;
  }, [isNonCurrentSprint, trendSprints, activeSprintId]);

  const displayMetrics: MetricTileViewModel[] = useMemo(() => {
    if (!matchedTrendSprint) return metrics;
    return metrics.map((m) => {
      if (m.label === 'Avg Velocity') {
        return {
          ...m,
          value: formatMetricVal(matchedTrendSprint.velocityAvg, 'pts'),
          rawValue: matchedTrendSprint.velocityAvg,
          avgLabel: null,
        };
      }
      if (m.label === 'Velocity Rate') {
        return {
          ...m,
          value: formatRate(matchedTrendSprint.rawVelocityRate),
          rawValue: matchedTrendSprint.rawVelocityRate,
          avgLabel: null,
        };
      }
      if (m.label === 'Overhead %') {
        return {
          ...m,
          value: formatPct(matchedTrendSprint.rawOverheadPercent),
          rawValue: matchedTrendSprint.rawOverheadPercent,
          avgLabel: null,
        };
      }
      if (m.label === 'Carry-Over %') {
        return {
          ...m,
          value: formatPct(matchedTrendSprint.rawCarryOverRate),
          rawValue: matchedTrendSprint.rawCarryOverRate,
          avgLabel: null,
        };
      }
      return m;
    });
  }, [metrics, matchedTrendSprint]);

  const displayDetail = useMemo(() => {
    if (!matchedTrendSprint) return detail;
    return {
      plannedPoints: matchedTrendSprint.plannedPoints != null
        ? String(matchedTrendSprint.plannedPoints)
        : 'N/A',
      completedPoints: matchedTrendSprint.completedPoints != null
        ? String(matchedTrendSprint.completedPoints)
        : 'N/A',
      carryOverPoints: matchedTrendSprint.carryOverPoints != null
        ? String(matchedTrendSprint.carryOverPoints)
        : 'N/A',
    };
  }, [detail, matchedTrendSprint]);

  const displayDetailLabel = useMemo(() => {
    if (!matchedTrendSprint) return detailSprintLabel;
    return matchedTrendSprint.sprintName;
  }, [detailSprintLabel, matchedTrendSprint]);

  const hasOverheadData = trendSprints.some((s) =>
    (s.overheadBreakdown ?? []).some((item) => item.hours > 0)
  );

  return (
    <Card withBorder padding="md" shadow="sm" className="workstream-card" style={{ overflow: 'visible' }}>
      <Stack gap="sm">
        <Text fw={600} size="md">
          {workstreamName}
        </Text>

        {displayMetrics.map((m) => (
          <Group key={m.label} justify="space-between" align="center" wrap="nowrap" gap="xs">
            <Text size="xs" c="dimmed" tt="uppercase" fw={500} style={{ flexShrink: 0 }}>
              {m.label}
            </Text>
            <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
              <Text size="sm" fw={500}>
                {m.value}
                {m.mode === 'projected' ? ' (Projected)' : ''}
              </Text>
              <RagBadge rag={m.rag} />
            </Group>
          </Group>
        ))}

        <Stack
          gap="xs"
          mt="xs"
          pt="xs"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
            {displayDetailLabel ?? 'Last Sprint'}
          </Text>
          <Text size="xs" c="dimmed">
            Planned: {displayDetail.plannedPoints} • Completed: {displayDetail.completedPoints}
          </Text>
          <Text size="xs" c="dimmed">
            Carry-over: {displayDetail.carryOverPoints} pts
          </Text>
        </Stack>

        <Stack
          gap="xs"
          mt="xs"
          pt="xs"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
            Velocity (Points)
          </Text>
          <VelocityTrendChart
            trendSprints={trendSprints}
            prediction={prediction ?? null}
            activeSprintId={activeSprintId}
            currentSprintId={currentSprintId}
          />
        </Stack>

        {(sprintStories || storiesLoading || storiesError) && (
          <Stack
            gap="xs"
            mt="xs"
            pt="xs"
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
              Sprint Stories
            </Text>
            <SprintStoryListPanel
              sprints={sprintStories ?? []}
              activeSprintId={activeSprintId ?? ''}
              loading={storiesLoading}
              error={storiesError}
            />
          </Stack>
        )}

        {trendSprints.length > 0 && (
          <Stack
            gap="xs"
            mt="xs"
            pt="xs"
            style={{ borderTop: '1px solid var(--mantine-color-default-border)', overflow: 'visible' }}
          >
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
              Bug Burndown
            </Text>
            <AppBarChart
              height={180}
              data={buildBugChartData(trendSprints)}
              dataKey="sprint"
              type="stacked"
              withLegend
              legendProps={{ verticalAlign: 'bottom', height: 30 }}
              series={[
                { name: 'Open (New/Active)', color: 'red.6' },
                { name: 'Closed (Resolved/Testing/Closed)', color: 'green.6' },
              ]}
              xAxisProps={{
                interval: 0,
                tickFormatter: (v: string) => {
                  const label = v.replace(/^Sprint\s*/i, '');
                  const isCurrent = trendSprints.find((s) => s.sprintName === v)?.isCurrent;
                  return isCurrent ? `${label} (Cur)` : label;
                },
              }}
              yAxisProps={{ domain: [0, 'auto'] }}
            />
            <SprintBugList trendSprints={trendSprints} activeSprintId={activeSprintId} />
          </Stack>
        )}

        {hasOverheadData && (
          <OverheadBreakdownPanel trendSprints={trendSprints} />
        )}
      </Stack>
    </Card>
  );
}
