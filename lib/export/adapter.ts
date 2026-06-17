import type {
  CycleTimeTypeViewModel,
  DashboardViewModel,
  MetricTileViewModel,
  WorkstreamCardViewModel,
} from '@/lib/dashboard/types';
import type { ApiProgramMilestoneRollup } from '@/lib/milestones/types';
import type {
  ExportCycleTimeSection,
  ExportCycleTimeTypeRow,
  ExportDataCaveat,
  ExportInput,
  ExportMilestoneContext,
  ExportRagCounts,
  ExportRollingMetricRow,
  ExportRollingMetricSection,
  ExportVisualizationSummary,
  ExportWorkstreamSnapshot,
  ExportWorkstreamSnapshotMetric,
} from './types';

const KEY_METRIC_LABELS = ['Velocity', 'Velocity Rate', 'Overhead %', 'Carry-Over %'] as const;
const MAX_KEY_METRICS = 5;

function countRagFromMetrics(metrics: MetricTileViewModel[] | null | undefined): ExportRagCounts {
  const counts: ExportRagCounts = { green: 0, amber: 0, red: 0, unset: 0 };
  if (!metrics) return counts;

  for (const m of metrics) {
    if (m.rag === 'Green') counts.green += 1;
    else if (m.rag === 'Amber') counts.amber += 1;
    else if (m.rag === 'Red') counts.red += 1;
    else counts.unset += 1;
  }
  return counts;
}

function deriveHealthLabel(ragCounts: ExportRagCounts): string {
  if (ragCounts.red > 0) return 'At Risk';
  if (ragCounts.amber > 0) return 'Needs Attention';
  if (ragCounts.green > 0) return 'Healthy';
  return 'Status Unavailable';
}

function topRiskItemsFromMetrics(metrics: MetricTileViewModel[] | null | undefined): string[] {
  if (!metrics) return [];
  return metrics
    .filter((m) => m.rag === 'Red' || m.rag === 'Amber')
    .slice(0, 3)
    .map((m) => `${m.label}: ${m.value}`);
}

function formatComputedDateLabel(computedAt: string | null, computedAtLabel: string | null): string | null {
  if (computedAtLabel?.trim()) return computedAtLabel;
  if (!computedAt) return null;
  const d = new Date(computedAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function mapVisualizationSummary(
  viewModel: DashboardViewModel,
  sprintName: string,
  computedAt: string | null
): ExportVisualizationSummary {
  const ragCounts = countRagFromMetrics(viewModel.programMetrics);
  const caveats: string[] = [];

  if (!viewModel.programMetrics) {
    caveats.push('Program metrics are not yet available.');
  }
  if (viewModel.rollingWindowLabel) {
    caveats.push(`Rolling window: ${viewModel.rollingWindowLabel}`);
  }

  return {
    healthLabel: deriveHealthLabel(ragCounts),
    ragCounts,
    sprintWindowLabel: viewModel.sprintLabel ?? sprintName,
    computedDateLabel: formatComputedDateLabel(computedAt, viewModel.computedAtLabel),
    topRiskItems: topRiskItemsFromMetrics(viewModel.programMetrics),
    caveats,
  };
}

function pickKeyMetrics(metrics: MetricTileViewModel[]): ExportWorkstreamSnapshotMetric[] {
  const picked: ExportWorkstreamSnapshotMetric[] = [];
  for (const label of KEY_METRIC_LABELS) {
    const m = metrics.find((tile) => tile.label === label);
    if (m) {
      picked.push({ label: m.label, value: m.value, rag: m.rag });
    }
  }
  for (const m of metrics) {
    if (picked.length >= MAX_KEY_METRICS) break;
    if (!picked.some((p) => p.label === m.label)) {
      picked.push({ label: m.label, value: m.value, rag: m.rag });
    }
  }
  return picked;
}

function worstRag(metrics: MetricTileViewModel[]): string | null {
  if (metrics.some((m) => m.rag === 'Red')) return 'Red';
  if (metrics.some((m) => m.rag === 'Amber')) return 'Amber';
  if (metrics.some((m) => m.rag === 'Green')) return 'Green';
  return null;
}

function cycleTimeCaveat(cycleTime: CycleTimeTypeViewModel[] | undefined): string | null {
  if (!cycleTime?.length) return null;
  const unavailable = cycleTime.reduce((sum, row) => sum + row.unavailableItemCount, 0);
  if (unavailable <= 0) return null;
  return `${unavailable} item(s) excluded from cycle-time averages`;
}

export function mapWorkstreamSnapshots(cards: WorkstreamCardViewModel[]): ExportWorkstreamSnapshot[] {
  return cards.map((ws) => {
    const projected = ws.metrics.find((m) => m.mode === 'projected');
    const primaryCaveat =
      cycleTimeCaveat(ws.cycleTime) ??
      (projected ? `${projected.label} uses projected values` : null);

    return {
      workstreamId: ws.workstreamId,
      workstreamName: ws.workstreamName,
      keyMetrics: pickKeyMetrics(ws.metrics),
      statusCue: worstRag(ws.metrics),
      primaryCaveat,
      milestoneSummary: null,
    };
  });
}

function mapRollingRows(
  rows: NonNullable<MetricTileViewModel['rollingMetric']>['rows']
): ExportRollingMetricRow[] {
  return rows.map((row) => ({
    sprintName: row.sprintName,
    value: row.value,
    rollingAverageValue: row.rollingAverageValue,
  }));
}

export function mapRollingMetricAppendix(
  programMetrics: MetricTileViewModel[] | null,
  workstreamCards: WorkstreamCardViewModel[]
): ExportRollingMetricSection[] {
  const sections: ExportRollingMetricSection[] = [];

  if (programMetrics) {
    for (const m of programMetrics) {
      if (!m.rollingMetric || m.rollingMetric.rows.length === 0) continue;
      sections.push({
        scope: 'program',
        scopeLabel: m.rollingMetric.scopeLabel,
        metricLabel: m.label,
        summaryValue: m.value,
        rollingWindowLabel: m.rollingMetric.rollingWindowLabel,
        rows: mapRollingRows(m.rollingMetric.rows),
        emptyMessage: m.rollingMetric.emptyMessage || null,
      });
    }
  }

  for (const ws of workstreamCards) {
    for (const m of ws.metrics) {
      if (!m.rollingMetric || m.rollingMetric.rows.length === 0) continue;
      sections.push({
        scope: 'workstream',
        scopeLabel: ws.workstreamName,
        metricLabel: m.label,
        summaryValue: m.value,
        rollingWindowLabel: m.rollingMetric.rollingWindowLabel,
        rows: mapRollingRows(m.rollingMetric.rows),
        emptyMessage: m.rollingMetric.emptyMessage || null,
      });
    }
  }

  return sections;
}

function mapCycleTimeTypeRows(types: CycleTimeTypeViewModel[]): ExportCycleTimeTypeRow[] {
  return types.map((row) => ({
    typeLabel: row.label,
    averageLabel: row.averageLabel,
    completedItemCount: row.completedItemCount,
    unavailableItemCount: row.unavailableItemCount,
    unavailableLabel: row.unavailableLabel,
  }));
}

function buildCycleTimeSection(
  scopeLabel: string,
  types: CycleTimeTypeViewModel[] | null | undefined
): ExportCycleTimeSection | null {
  if (!types?.length) return null;
  const unavailableTotal = types.reduce((sum, row) => sum + row.unavailableItemCount, 0);
  return {
    scopeLabel,
    typeRows: mapCycleTimeTypeRows(types),
    caveat:
      unavailableTotal > 0
        ? `${unavailableTotal} item(s) lack cycle-time data and are excluded from averages`
        : null,
  };
}

export function mapCycleTimeAppendix(
  programCycleTime: CycleTimeTypeViewModel[] | null,
  workstreamCards: WorkstreamCardViewModel[]
): ExportCycleTimeSection[] {
  const sections: ExportCycleTimeSection[] = [];
  const program = buildCycleTimeSection('Program', programCycleTime);
  if (program) sections.push(program);

  for (const ws of workstreamCards) {
    const section = buildCycleTimeSection(ws.workstreamName, ws.cycleTime);
    if (section) sections.push(section);
  }
  return sections;
}

export function mapMilestoneContext(
  programRollup: ApiProgramMilestoneRollup | null
): ExportMilestoneContext | null {
  if (!programRollup) return null;

  const monthlyRollupLabel =
    programRollup.currentMonthCompletionPercent != null
      ? `Current month: ${Math.round(programRollup.currentMonthCompletionPercent)}% complete`
      : null;
  const { quarterlyMilestones, quarter } = programRollup;
  const quarterlyRollupLabel =
    quarterlyMilestones.total > 0
      ? `${quarter ?? 'Quarter'}: ${quarterlyMilestones.complete}/${quarterlyMilestones.total} milestones complete`
      : null;

  if (!monthlyRollupLabel && !quarterlyRollupLabel) return null;

  return {
    monthlyRollupLabel,
    quarterlyRollupLabel,
    sparseDataCaveat:
      programRollup.quarterlyMilestones.total === 0
        ? 'No milestone goals are configured.'
        : null,
  };
}

export function deriveDataCaveats(
  viewModel: DashboardViewModel,
  programRollup: ApiProgramMilestoneRollup | null
): ExportDataCaveat[] {
  const caveats: ExportDataCaveat[] = [];

  if (!viewModel.programMetrics) {
    caveats.push({
      severity: 'warning',
      scopeLabel: 'Program',
      message: 'Program metrics are not yet available.',
      sectionId: 'program-summary',
    });
  }

  if (viewModel.programCycleTime) {
    const unavailable = viewModel.programCycleTime.reduce(
      (sum, row) => sum + row.unavailableItemCount,
      0
    );
    if (unavailable > 0) {
      caveats.push({
        severity: 'info',
        scopeLabel: 'Program',
        message: `${unavailable} work item(s) excluded from program cycle-time averages.`,
        sectionId: 'cycle-time-appendix',
      });
    }
  }

  if (!programRollup) {
    caveats.push({
      severity: 'info',
      scopeLabel: 'Program',
      message: 'Milestone rollup data is unavailable.',
      sectionId: 'milestone-context-appendix',
    });
  }

  return caveats;
}

/** Merges display-ready visualization fields into a base ExportInput without recalculating metric rules. */
export function enrichExportInput(
  base: ExportInput,
  viewModel: DashboardViewModel,
  programRollup: ApiProgramMilestoneRollup | null
): ExportInput {
  return {
    ...base,
    visualizationSummary: mapVisualizationSummary(viewModel, base.sprintName, base.computedAt),
    workstreamSnapshots: mapWorkstreamSnapshots(base.workstreams),
    rollingMetricAppendix: mapRollingMetricAppendix(viewModel.programMetrics, base.workstreams),
    cycleTimeAppendix: mapCycleTimeAppendix(viewModel.programCycleTime, base.workstreams),
    milestoneContext: mapMilestoneContext(programRollup),
    dataCaveats: deriveDataCaveats(viewModel, programRollup),
  };
}
