/**
 * Dashboard data adapter.
 * Maps GET /api/metrics response to UI-friendly view models.
 * No metric math - only formatting and mapping.
 */

import { DONE_STATES } from '../metrics/types';
import type {
  ApiMetric,
  ApiMilestoneMetric,
  ApiResponse,
  ApiTrendSprint,
  DashboardViewModel,
  MetricTileViewModel,
  RagStatus,
  TrendBugViewModel,
  TrendSprintViewModel,
  WorkstreamCardViewModel,
} from './types';

/** Format metric value with unit; null -> "N/A" */
export function formatMetricValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return `${value} ${unit}`;
}

/** Format percentage value; null -> "N/A" */
export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return `${value}%`;
}

/** Safely cast API rag string to RagStatus */
export function toRagStatus(rag: string | null): RagStatus {
  if (rag === null || rag === undefined || rag === '') {
    return null;
  }
  if (rag === 'Green' || rag === 'Amber' || rag === 'Red') {
    return rag;
  }
  return null;
}

/** Map a single API metric to MetricTileViewModel */
function mapApiMetricToTile(
  apiMetric: ApiMetric,
  label: string,
  unit: string,
  isPercent: boolean
): MetricTileViewModel {
  const value = apiMetric?.value ?? null;
  const avg = apiMetric?.avg ?? null;
  const mode = apiMetric?.mode;
  return {
    label,
    value: isPercent ? formatPercent(value) : formatMetricValue(value, unit),
    rawValue: value,
    unit: isPercent ? '%' : unit,
    rag: toRagStatus(apiMetric?.rag ?? null),
    mode,
    avgLabel:
      avg !== null && avg !== undefined && mode !== 'projected'
        ? isPercent
          ? formatPercent(avg)
          : formatMetricValue(avg, unit)
        : null,
  };
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return String(value);
}

function formatVelocityRate(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return `${value.toFixed(2)} pts/hr`;
}

function mapBugToViewModel(bug: { adoId: number; title: string; state: string }): TrendBugViewModel {
  return {
    adoId: String(bug.adoId),
    title: bug.title,
    isClosed: (DONE_STATES as readonly string[]).includes(bug.state),
  };
}

function mapTrendSprint(sprint: ApiTrendSprint): TrendSprintViewModel {
  return {
    sprintId: sprint.sprintId,
    sprintName: sprint.sprintName,
    velocity: formatMetricValue(sprint.velocity, 'pts'),
    velocityRate: formatVelocityRate(sprint.velocityRate),
    activeBugs: formatNumber(sprint.activeBugs),
    bugsClosed: formatNumber(sprint.bugsClosed),
    rawVelocity: sprint.velocity,
    rawVelocityRate: sprint.velocityRate,
    rawActiveBugs: sprint.activeBugs,
    rawBugsClosed: sprint.bugsClosed,
    bugs: (sprint.bugs ?? []).map(mapBugToViewModel),
  };
}

/** Map a milestone API metric to MetricTileViewModel with empty-state handling */
function mapMilestoneTile(
  metric: ApiMilestoneMetric | null | undefined,
  label: string
): MetricTileViewModel {
  if (!metric || metric.value === null || metric.value === undefined) {
    return {
      label,
      value: '\u2014',
      rawValue: null,
      unit: '%',
      rag: null,
      avgLabel: 'No milestone data yet',
    };
  }
  return {
    label,
    value: formatPercent(metric.value),
    rawValue: metric.value,
    unit: '%',
    rag: toRagStatus(metric.rag ?? null),
    avgLabel: null,
  };
}

const METRIC_LABELS: Array<{
  key: keyof ApiResponse['workstreams'][0]['metrics'];
  label: string;
  unit: string;
  isPercent: boolean;
}> = [
  { key: 'velocity', label: 'Velocity', unit: 'pts', isPercent: false },
  { key: 'overheadPercent', label: 'Overhead %', unit: '%', isPercent: true },
  { key: 'carryOverRate', label: 'Carry-Over %', unit: '%', isPercent: true },
];

/** Format nullable number for detail display */
function formatDetailValue(value: number | null): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return String(value);
}

/** Map API response to full DashboardViewModel (success or empty) */
export function mapApiResponseToDashboardViewModel(response: ApiResponse): DashboardViewModel {
  const isEmpty =
    response.sprint === null &&
    response.workstreams.length === 0 &&
    response.program === null &&
    response.computedAt === null;

  if (isEmpty) {
    return {
      state: 'empty',
      sprintLabel: null,
      rollingWindowLabel: null,
      computedAtLabel: null,
      programMetrics: null,
      programTrendSprints: [],
      sprint5Prediction: null,
      workstreamCards: [],
    };
  }

  const sprintLabel = response.sprint?.name ?? null;
  const rollingWindowLabel = response.rollingWindow
    ? `Rolling ${response.rollingWindow.count} sprints (current + ${Math.max(
        response.rollingWindow.count - 1,
        0
      )} prior)`
    : null;
  const computedAtLabel = response.computedAt
    ? new Date(response.computedAt).toLocaleString()
    : null;

  let programMetrics: MetricTileViewModel[] | null = null;
  if (response.program?.metrics) {
    const m = response.program.metrics;
    const avgVelocityRate = m.averageVelocityRate ?? null;
    const rawCarryOver = m.carryOverRate?.avg ?? null;
    const roundedCarryOver = rawCarryOver !== null
      ? Math.round(rawCarryOver * 100) / 100
      : null;
    programMetrics = [
      {
        label: 'Avg Total Velocity',
        value: formatMetricValue(m.velocity?.avg ?? null, 'pts'),
        rawValue: m.velocity?.avg ?? null,
        unit: 'pts',
        rag: toRagStatus(m.velocity?.rag ?? null),
        avgLabel: null,
      },
      {
        label: 'Avg Total Velocity Rate',
        value: avgVelocityRate !== null
          ? `${avgVelocityRate.toFixed(2)} pts/hr`
          : 'N/A',
        rawValue: avgVelocityRate,
        unit: 'pts/hr',
        rag: null,
        avgLabel: null,
      },
      {
        label: 'Avg Total Overhead %',
        value: formatPercent(m.overheadPercent?.avg ?? null),
        rawValue: m.overheadPercent?.avg ?? null,
        unit: '%',
        rag: toRagStatus(m.overheadPercent?.rag ?? null),
        avgLabel: null,
      },
      {
        label: 'Avg Total Carry-Over %',
        value: roundedCarryOver !== null ? `${roundedCarryOver.toFixed(2)}%` : 'N/A',
        rawValue: roundedCarryOver,
        unit: '%',
        rag: toRagStatus(m.carryOverRate?.rag ?? null),
        avgLabel: null,
      },
    ];
  }

  const currentSprintName = response.sprint?.name ?? 'Current Sprint';

  const workstreamCards: WorkstreamCardViewModel[] = (response.workstreams ?? []).map((ws) => {
    const metrics = METRIC_LABELS.map(({ key, label, unit, isPercent }) =>
      mapApiMetricToTile(ws.metrics[key], label, unit, isPercent)
    );

    const velocityRateValue = ws.prediction?.velocityRate ?? null;
    metrics.splice(1, 0, {
      label: 'Velocity Rate',
      value: formatVelocityRate(velocityRateValue),
      rawValue: velocityRateValue,
      unit: 'pts/hr',
      rag: null,
      avgLabel: null,
    });

    const d = ws.detail ?? {};
    const wsPrediction = ws.prediction;
    return {
      workstreamId: ws.workstreamId,
      workstreamName: ws.workstreamName ?? 'Unknown',
      metrics,
      detail: {
        plannedPoints: formatDetailValue(d.plannedPoints),
        completedPoints: formatDetailValue(d.completedPoints),
        carryOverItems: formatDetailValue(d.carryOverItems),
        carryOverPoints: formatDetailValue(d.carryOverPoints),
      },
      trendSprints: (ws.trends?.sprints ?? []).map(mapTrendSprint),
      prediction: wsPrediction
        ? {
            velocity: formatMetricValue(wsPrediction.velocity, 'pts'),
            rawVelocity: wsPrediction.velocity,
            velocityRate: formatVelocityRate(wsPrediction.velocityRate),
            rawVelocityRate: wsPrediction.velocityRate,
            sprintLabel: currentSprintName,
            isPredicted: true,
          }
        : null,
    };
  });

  const programTrendSprints = (response.program?.trends?.sprints ?? []).map(mapTrendSprint);
  const sprint5PredictionValue = response.program?.prediction?.sprint5?.velocity ?? null;
  const sprint5Prediction =
    response.program?.prediction?.sprint5 !== undefined
      ? {
          velocity: formatMetricValue(sprint5PredictionValue, 'pts'),
          rawVelocity: sprint5PredictionValue,
          sprintLabel: currentSprintName,
          isPredicted: true,
        }
      : null;

  return {
    state: 'success',
    sprintLabel,
    rollingWindowLabel,
    computedAtLabel,
    programMetrics,
    programTrendSprints,
    sprint5Prediction,
    workstreamCards,
  };
}

/** Create loading state view model */
export function createLoadingViewModel(): DashboardViewModel {
  return {
    state: 'loading',
    sprintLabel: null,
    rollingWindowLabel: null,
    computedAtLabel: null,
    programMetrics: null,
    programTrendSprints: [],
    sprint5Prediction: null,
    workstreamCards: [],
  };
}

/** Create error state view model */
export function createErrorViewModel(message: string): DashboardViewModel {
  return {
    state: 'error',
    sprintLabel: null,
    rollingWindowLabel: null,
    computedAtLabel: null,
    programMetrics: null,
    programTrendSprints: [],
    sprint5Prediction: null,
    workstreamCards: [],
    errorMessage: message,
  };
}
