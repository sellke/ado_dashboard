/**
 * Dashboard data adapter.
 * Maps GET /api/metrics response to UI-friendly view models.
 * No metric math - only formatting and mapping.
 */

import type {
  ApiMetric,
  ApiResponse,
  ApiTrendSprint,
  DashboardViewModel,
  MetricTileViewModel,
  RagStatus,
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

function mapTrendSprint(sprint: ApiTrendSprint) {
  return {
    sprintId: sprint.sprintId,
    sprintName: sprint.sprintName,
    velocity: formatMetricValue(sprint.velocity, 'pts'),
    velocityRate: formatVelocityRate(sprint.velocityRate),
    activeBugs: formatNumber(sprint.activeBugs),
    bugsClosed: formatNumber(sprint.bugsClosed),
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
  { key: 'predictability', label: 'Predictability', unit: '%', isPercent: true },
  { key: 'carryOverRate', label: 'Carry-over rate', unit: '%', isPercent: true },
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
    programMetrics = METRIC_LABELS.map(({ key, label, unit, isPercent }) =>
      mapApiMetricToTile(m[key], label, unit, isPercent)
    );
  }

  const workstreamCards: WorkstreamCardViewModel[] = (response.workstreams ?? []).map((ws) => {
    const metrics = METRIC_LABELS.map(({ key, label, unit, isPercent }) =>
      mapApiMetricToTile(ws.metrics[key], label, unit, isPercent)
    );
    const d = ws.detail ?? {};
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
    };
  });

  const programTrendSprints = (response.program?.trends?.sprints ?? []).map(mapTrendSprint);
  const sprint5PredictionValue = response.program?.prediction?.sprint5?.velocity ?? null;
  const sprint5Prediction =
    response.program?.prediction?.sprint5 !== undefined
      ? {
          velocity: formatMetricValue(sprint5PredictionValue, 'pts'),
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
