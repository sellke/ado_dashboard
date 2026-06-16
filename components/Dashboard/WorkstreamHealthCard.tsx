'use client';

import { useId, useMemo, useState } from 'react';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { ActionIcon, Card, Group, Stack, Text } from '@mantine/core';
import type {
  MetricTileViewModel,
  SprintStoryViewModel,
  WorkstreamCardViewModel,
} from '@/lib/dashboard/types';
import { getRagTooltip } from '@/lib/metrics/definitions';
import { BugBurndownChart } from './BugBurndownChart';
import { CycleTimeBreakdown, type CycleTimeDrilldownContext } from './CycleTimeBreakdown';
import { MetricDefinitionHint } from './MetricDefinitionHint';
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
  cycleTimeDrilldownContext?: CycleTimeDrilldownContext;
  storiesLoading?: boolean;
  storiesError?: string | null;
}

/**
 * Renders a compact workstream health card with 4 core metrics (Velocity, Velocity Rate,
 * Overhead %, Carry-Over %), RAG status, detail block, velocity trend chart, and bug list.
 * Export-friendly for slide generation; handles null values gracefully.
 */
function formatMetricVal(value: number | null, unit: string): string {
  if (value === null) {
    return 'N/A';
  }
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} ${unit}`;
}

function formatRate(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return `${value.toFixed(2)} pts/hr`;
}

function formatPct(value: number | null): string {
  if (value === null) {
    return 'N/A';
  }
  return `${value.toFixed(2)}%`;
}

export function WorkstreamHealthCard({
  card,
  sprintStories,
  activeSprintId,
  currentSprintId,
  cycleTimeDrilldownContext,
  storiesLoading,
  storiesError,
}: WorkstreamHealthCardProps) {
  const {
    workstreamName,
    metrics,
    detail,
    cycleTime = [],
    detailSprintLabel,
    trendSprints = [],
    prediction,
  } = card;
  const [isExpanded, setIsExpanded] = useState(true);
  const detailRegionId = useId();

  const isNonCurrentSprint =
    !!activeSprintId && !!currentSprintId && activeSprintId !== currentSprintId;

  const matchedTrendSprint = useMemo(() => {
    if (!isNonCurrentSprint) {
      return null;
    }
    return trendSprints.find((s) => s.sprintId === activeSprintId) ?? null;
  }, [isNonCurrentSprint, trendSprints, activeSprintId]);

  const displayMetrics: MetricTileViewModel[] = useMemo(() => {
    if (!matchedTrendSprint) {
      return metrics;
    }
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
    if (!matchedTrendSprint) {
      return detail;
    }
    return {
      plannedPoints:
        matchedTrendSprint.plannedPoints != null ? String(matchedTrendSprint.plannedPoints) : 'N/A',
      completedPoints:
        matchedTrendSprint.completedPoints != null
          ? String(matchedTrendSprint.completedPoints)
          : 'N/A',
      carryOverPoints:
        matchedTrendSprint.carryOverPoints != null
          ? String(matchedTrendSprint.carryOverPoints)
          : 'N/A',
    };
  }, [detail, matchedTrendSprint]);

  const displayDetailLabel = useMemo(() => {
    if (!matchedTrendSprint) {
      return detailSprintLabel;
    }
    return matchedTrendSprint.sprintName;
  }, [detailSprintLabel, matchedTrendSprint]);

  const hasOverheadData = trendSprints.some((s) =>
    (s.overheadBreakdown ?? []).some((item) => item.hours > 0)
  );

  return (
    <Card
      withBorder
      padding="md"
      shadow="sm"
      className="workstream-card"
      style={{ overflow: 'visible' }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
          <Text fw={600} size="md">
            {workstreamName}
          </Text>
          <ActionIcon
            variant="subtle"
            size="sm"
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for ${workstreamName}`}
            aria-expanded={isExpanded}
            aria-controls={detailRegionId}
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </ActionIcon>
        </Group>

        {displayMetrics.map((m) => (
          <Group key={m.label} justify="space-between" align="center" wrap="nowrap" gap="xs">
            <Group gap={4} align="center" wrap="nowrap" style={{ flexShrink: 0 }}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                {m.label}
              </Text>
              {m.metricId && <MetricDefinitionHint metricId={m.metricId} label={m.label} />}
            </Group>
            <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
              <Text size="sm" fw={500}>
                {m.value}
                {m.mode === 'projected' ? ' (Projected)' : ''}
              </Text>
              <RagBadge rag={m.rag} ragTooltip={m.metricId ? getRagTooltip(m.metricId) : null} />
            </Group>
          </Group>
        ))}

        {isExpanded && (
          <Stack id={detailRegionId} gap="sm">
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

            {cycleTime.length > 0 ? (
              <CycleTimeBreakdown
                title="Cycle Time"
                items={cycleTime}
                drilldownContext={
                  cycleTimeDrilldownContext
                    ? {
                        ...cycleTimeDrilldownContext,
                        workstreamId: card.workstreamId,
                        scopeLabel: card.workstreamName,
                      }
                    : undefined
                }
              />
            ) : null}

            <Stack
              gap="xs"
              mt="xs"
              pt="xs"
              style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
            >
              <Group gap={4} align="center" wrap="nowrap">
                <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                  Velocity (Points)
                </Text>
                <MetricDefinitionHint metricId="chartVelocity" label="Velocity (Points)" />
              </Group>
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
                style={{
                  borderTop: '1px solid var(--mantine-color-default-border)',
                  overflow: 'visible',
                }}
              >
                <Group gap={4} align="center" wrap="nowrap">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
                    Bug Burndown
                  </Text>
                  <MetricDefinitionHint metricId="chartBugBurndown" label="Bug Burndown" />
                </Group>
                <BugBurndownChart trendSprints={trendSprints} height={180} />
                <SprintBugList trendSprints={trendSprints} activeSprintId={activeSprintId} />
              </Stack>
            )}

            {hasOverheadData && <OverheadBreakdownPanel trendSprints={trendSprints} />}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
