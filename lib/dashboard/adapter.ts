/**
 * Dashboard data adapter.
 * Maps GET /api/metrics response to UI-friendly view models.
 * No metric math - only formatting and mapping.
 */

import { buildAdoWorkItemUrl } from '../ado/urls';
import type { MetricId } from '../metrics/definitions';
import { BUG_RESOLVED_STATES, DONE_STATES } from '../metrics/types';
import type { ApiMilestoneWithProgress, ApiProgramMilestoneRollup } from '../milestones/types';
import type {
  ApiCycleTimeBreakdown,
  ApiMetric,
  ApiMilestoneMetric,
  ApiOverheadItem,
  ApiResponse,
  ApiTrendSprint,
  CycleTimeTypeViewModel,
  CycleTimeWorkItemType,
  DashboardViewModel,
  MetricTileViewModel,
  MilestoneFeatureViewModel,
  MilestoneGoalViewModel,
  MilestoneMonthGroup,
  MilestoneQuarterGroup,
  MilestoneWorkstreamProgress,
  OverheadBreakdownItem,
  OverheadCategory,
  OverheadCompositionViewModel,
  OverheadItemViewModel,
  OverheadSprintViewModel,
  RagStatus,
  RollingMetricDetailViewModel,
  RollingMetricId,
  RollingMetricRowViewModel,
  TrendBugViewModel,
  TrendSprintViewModel,
  WorkstreamCardViewModel,
} from './types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatMonthLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function isCurrentMonthFn(isoDate: string, today: Date): boolean {
  const d = new Date(isoDate);
  return d.getUTCFullYear() === today.getUTCFullYear() && d.getUTCMonth() === today.getUTCMonth();
}

/** Map ApiMilestoneWithProgress to MilestoneGoalViewModel with formatted display values */
export function mapMilestoneToGoalViewModel(
  milestone: ApiMilestoneWithProgress,
  today: Date = new Date()
): MilestoneGoalViewModel {
  return {
    id: milestone.id,
    title: milestone.title,
    workstreamId: milestone.workstreamId,
    targetMonth: milestone.targetMonth,
    monthLabel: formatMonthLabel(milestone.targetMonth),
    isCurrentMonth: isCurrentMonthFn(milestone.targetMonth, today),
    adoFeatureId: milestone.adoFeatureId != null ? `#${milestone.adoFeatureId}` : null,
    percentComplete:
      milestone.percentComplete != null ? `${Math.round(milestone.percentComplete)}%` : 'N/A',
    completedPoints: milestone.completedPoints,
    totalPoints: milestone.totalPoints,
    burnupData: milestone.burnupData,
    status: milestone.status,
    quarter: milestone.quarter ?? null,
    adpMonTagLabel: milestone.adpMonTagLabel ?? null,
  };
}

/** Group milestones by month: current first, future ascending, past descending */
export function groupMilestonesByMonth(
  milestones: MilestoneGoalViewModel[],
  today: Date = new Date()
): MilestoneMonthGroup[] {
  const groupMap = new Map<string, MilestoneGoalViewModel[]>();
  for (const m of milestones) {
    const key = m.targetMonth;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(m);
  }

  const groups: (MilestoneMonthGroup & { _date: Date })[] = [];
  for (const msList of Array.from(groupMap.values())) {
    const key = msList[0].targetMonth;
    const d = new Date(key);
    const isCurrentMonth = msList[0].isCurrentMonth;
    const totalPoints = msList.reduce((sum, m) => sum + m.totalPoints, 0);
    const completedPoints = msList.reduce((sum, m) => sum + m.completedPoints, 0);
    const groupCompletionPercent =
      totalPoints > 0 ? `${Math.round((completedPoints / totalPoints) * 100)}%` : 'N/A';

    groups.push({
      monthLabel: msList[0].monthLabel,
      isCurrentMonth,
      milestones: msList,
      groupCompletionPercent,
      _date: d,
    });
  }

  const todayTime = new Date(today.getUTCFullYear(), today.getUTCMonth(), 1).getTime();

  groups.sort((a, b) => {
    const aTime = new Date(a._date.getUTCFullYear(), a._date.getUTCMonth(), 1).getTime();
    const bTime = new Date(b._date.getUTCFullYear(), b._date.getUTCMonth(), 1).getTime();
    const aIsCurrent = aTime === todayTime;
    const bIsCurrent = bTime === todayTime;
    if (aIsCurrent) {
      return -1;
    }
    if (bIsCurrent) {
      return 1;
    }
    const aIsFuture = aTime > todayTime;
    const bIsFuture = bTime > todayTime;
    if (aIsFuture && bIsFuture) {
      return aTime - bTime;
    }
    if (!aIsFuture && !bIsFuture) {
      return bTime - aTime;
    }
    return aIsFuture ? -1 : 1;
  });

  return groups.map(({ _date: _d, ...g }) => g);
}

/** Map milestones with workstream breakdowns into quarterly-grouped view models. */
export function groupMilestonesByQuarter(
  milestones: ApiMilestoneWithProgress[]
): MilestoneQuarterGroup[] {
  const quarterMap = new Map<string, MilestoneFeatureViewModel[]>();

  for (const m of milestones) {
    if (!m.quarter) {
      continue;
    }
    const quarter = m.quarter;
    const breakdowns = m.workstreamBreakdown ?? [];

    const feature: MilestoneFeatureViewModel = {
      id: m.id,
      title: m.title,
      adoFeatureId: m.adoFeatureId != null ? `#${m.adoFeatureId}` : null,
      adpMonTagLabel: m.adpMonTagLabel ?? null,
      workstreams: breakdowns.map(
        (ws): MilestoneWorkstreamProgress => ({
          workstreamId: ws.workstreamId,
          workstreamName: ws.workstreamName,
          totalStories: ws.totalStories,
          inProgressPercent: ws.inProgressPercent,
          completedPercent: ws.completedPercent,
        })
      ),
    };

    const list = quarterMap.get(quarter) ?? [];
    list.push(feature);
    quarterMap.set(quarter, list);
  }

  const groups: MilestoneQuarterGroup[] = [];
  Array.from(quarterMap.entries()).forEach(([quarter, features]) => {
    groups.push({ quarter, features });
  });

  groups.sort((a, b) => a.quarter.localeCompare(b.quarter));

  return groups;
}

export interface ProgramMilestoneRollupViewModel {
  currentMonth: string;
  currentMonthCompletionPercent: string;
  currentMonthTotalSP: number;
  currentMonthCompletedSP: number;
  quarterlyTotal: number;
  quarterlyComplete: number;
  quarterlyInProgress: number;
  quarterlyNotStarted: number;
}

/** Map ApiProgramMilestoneRollup to ProgramMilestoneRollupViewModel */
export function mapProgramMilestoneRollup(
  rollup: ApiProgramMilestoneRollup
): ProgramMilestoneRollupViewModel {
  return {
    currentMonth: rollup.currentMonth,
    currentMonthCompletionPercent:
      rollup.currentMonthCompletionPercent != null
        ? `${Math.round(rollup.currentMonthCompletionPercent)}%`
        : 'N/A',
    currentMonthTotalSP: rollup.currentMonthTotalSP,
    currentMonthCompletedSP: rollup.currentMonthCompletedSP,
    quarterlyTotal: rollup.quarterlyMilestones.total,
    quarterlyComplete: rollup.quarterlyMilestones.complete,
    quarterlyInProgress: rollup.quarterlyMilestones.inProgress,
    quarterlyNotStarted: rollup.quarterlyMilestones.notStarted,
  };
}

/** Format metric value with unit, rounded to the nearest hundredth; null -> "N/A" */
export function formatMetricValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} ${unit}`;
}

/** Format percentage value, rounded to the nearest hundredth; null -> "N/A" */
export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  const rounded = Math.round(value * 100) / 100;
  return `${rounded}%`;
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
  isPercent: boolean,
  metricId?: MetricId
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
    metricId,
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

function formatDeliveryToBugRatio(
  value: number | null | undefined,
  rag: RagStatus | null | undefined
): string {
  if (value === null || value === undefined) {
    return rag === 'Green' ? '\u2014' : 'N/A';
  }
  return value.toFixed(2);
}

function formatFixedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return `${value.toFixed(2)}%`;
}

function isZeroBugDeliverySprint(sprint: TrendSprintViewModel): boolean {
  return (
    sprint.rawDeliveryToBugRatio === null &&
    sprint.deliveryToBugHours === 0 &&
    (sprint.deliveryToBugCompletedPoints ?? null) !== null &&
    (sprint.deliveryToBugCompletedPoints ?? 0) > 0
  );
}

function buildRollingMetricRow(
  sprint: TrendSprintViewModel,
  metricId: RollingMetricId
): RollingMetricRowViewModel {
  if (metricId === 'velocityRate') {
    return {
      sprintId: sprint.sprintId,
      sprintName: sprint.sprintName,
      value: formatVelocityRate(sprint.rawVelocityRate),
      rawValue: sprint.rawVelocityRate,
      rollingAverageValue: null,
      rawRollingAverageValue: null,
    };
  }

  if (metricId === 'overheadPercent') {
    return {
      sprintId: sprint.sprintId,
      sprintName: sprint.sprintName,
      value: formatFixedPercent(sprint.rawOverheadPercent),
      rawValue: sprint.rawOverheadPercent,
      rollingAverageValue: formatFixedPercent(sprint.overheadPercentAvg),
      rawRollingAverageValue: sprint.overheadPercentAvg,
    };
  }

  if (metricId === 'carryOverRate') {
    return {
      sprintId: sprint.sprintId,
      sprintName: sprint.sprintName,
      value: formatFixedPercent(sprint.rawCarryOverRate),
      rawValue: sprint.rawCarryOverRate,
      rollingAverageValue: formatFixedPercent(sprint.carryOverRateAvg),
      rawRollingAverageValue: sprint.carryOverRateAvg,
    };
  }

  return {
    sprintId: sprint.sprintId,
    sprintName: sprint.sprintName,
    value: formatDeliveryToBugRatio(
      sprint.rawDeliveryToBugRatio,
      isZeroBugDeliverySprint(sprint) ? 'Green' : null
    ),
    rawValue: sprint.rawDeliveryToBugRatio ?? null,
    rollingAverageValue: null,
    rawRollingAverageValue: null,
  };
}

function buildRollingMetricDetail(params: {
  metric: MetricTileViewModel;
  metricId: RollingMetricId;
  title: string;
  scope: 'program' | 'workstream';
  scopeLabel: string;
  rollingWindowLabel: string | null;
  trendSprints: TrendSprintViewModel[];
}): RollingMetricDetailViewModel {
  const { metric, metricId, title, scope, scopeLabel, rollingWindowLabel, trendSprints } = params;
  const rows = trendSprints.map((sprint) => buildRollingMetricRow(sprint, metricId));
  return {
    metricId,
    definitionMetricId: metric.metricId ?? metricId,
    title,
    scope,
    scopeLabel,
    summaryValue: metric.value,
    rawSummaryValue: metric.rawValue,
    unit: metric.unit,
    rag: metric.rag,
    rollingWindowLabel,
    rows,
    emptyMessage: `No sprint history is available for ${title}.`,
  };
}

const CYCLE_TIME_TYPES: Array<{ type: CycleTimeWorkItemType; label: string }> = [
  { type: 'UserStory', label: 'User Stories' },
  { type: 'Spike', label: 'Spikes' },
  { type: 'Bug', label: 'Bugs' },
];

function formatBusinessDays(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} ${rounded === 1 ? 'day' : 'days'}`;
}

export function mapCycleTimeBreakdown(
  breakdown: ApiCycleTimeBreakdown | null | undefined
): CycleTimeTypeViewModel[] {
  return CYCLE_TIME_TYPES.map(({ type, label }) => {
    const item = breakdown?.[type];
    const totalBusinessDays = item?.totalBusinessDays ?? 0;
    const averageBusinessDays = item?.averageBusinessDays ?? null;
    const completedItemCount = item?.completedItemCount ?? 0;
    const unavailableItemCount = item?.unavailableItemCount ?? 0;

    return {
      type,
      label,
      totalBusinessDays,
      averageBusinessDays,
      completedItemCount,
      unavailableItemCount,
      totalLabel: formatBusinessDays(totalBusinessDays),
      averageLabel: formatBusinessDays(averageBusinessDays),
      unavailableLabel: unavailableItemCount > 0 ? `${unavailableItemCount} unavailable` : null,
    };
  });
}

/** Format a sprint's name + date range into a compact label, e.g. "Sprint 14 · Jan 6 – Jan 17" */
function formatSprintLabel(sprint: { name: string; startDate: string; endDate: string }): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${sprint.name} · ${fmt(sprint.startDate)} – ${fmt(sprint.endDate)}`;
}

/** Format hours value; null -> "N/A", number -> "X hrs" */
export function formatHours(value: number | null): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return `${value} hrs`;
}

/** Map an ApiOverheadItem to OverheadItemViewModel */
export function mapOverheadItem(item: ApiOverheadItem): OverheadItemViewModel {
  return {
    adoId: `#${item.adoId}`,
    title: item.title,
    state: item.state,
    hours: formatHours(item.hours),
    isClosed: (DONE_STATES as readonly string[]).includes(item.state),
    adoUrl: buildAdoWorkItemUrl(item.adoId),
  };
}

/** Map trend sprints with overheadComposition to OverheadCompositionViewModel[] */
export function mapOverheadComposition(sprints: ApiTrendSprint[]): OverheadCompositionViewModel[] {
  return sprints
    .filter((s) => s.overheadComposition !== undefined)
    .map((s) => {
      const c = s.overheadComposition!;
      return {
        sprintName: s.sprintName,
        ceremonyHours: c.ceremonyHours ?? 0,
        bugHours: c.bugHours ?? 0,
        spikeHours: c.spikeHours ?? 0,
        supportHours: c.supportHours ?? 0,
        overheadPercent: formatPercent(c.overheadPercent),
      };
    });
}

/**
 * Maps a bug item to view model. Prefers the server's as-of `isClosed` (the classification
 * behind the burndown bar for that sprint); falls back to current state when absent.
 */
function mapBugToViewModel(bug: {
  adoId: number;
  title: string;
  state: string;
  isClosed?: boolean;
}): TrendBugViewModel {
  return {
    adoId: String(bug.adoId),
    title: bug.title,
    isClosed: bug.isClosed ?? (BUG_RESOLVED_STATES as readonly string[]).includes(bug.state),
    adoUrl: buildAdoWorkItemUrl(bug.adoId),
  };
}

/** All 4 overhead categories in display order. */
const OVERHEAD_CATEGORIES: OverheadCategory[] = ['Meetings', 'Spikes', 'Bugs', 'Support'];

function mapTrendSprint(sprint: ApiTrendSprint): TrendSprintViewModel {
  const apiBreakdown = sprint.overheadBreakdown ?? [];
  const overheadBreakdown: OverheadBreakdownItem[] = OVERHEAD_CATEGORIES.map((category) => {
    const found = apiBreakdown.find((item) => item.category === category);
    return { category, hours: found?.hours ?? 0 };
  });

  return {
    sprintId: sprint.sprintId,
    sprintName: sprint.sprintName,
    isCurrent: sprint.mode === 'current',
    velocity: formatMetricValue(sprint.velocity, 'pts'),
    velocityRate: formatVelocityRate(sprint.velocityRate),
    activeBugs: formatNumber(sprint.activeBugs),
    bugsClosed: formatNumber(sprint.bugsClosed),
    rawVelocity: sprint.velocity,
    rawVelocityRate: sprint.velocityRate,
    rawActiveBugs: sprint.activeBugs,
    rawBugsClosed: sprint.bugsClosed,
    bugs: (sprint.bugs ?? []).map(mapBugToViewModel),
    overheadBreakdown,
    velocityAvg: sprint.velocityAvg ?? null,
    overheadPercentAvg: sprint.overheadPercentAvg ?? null,
    carryOverRateAvg: sprint.carryOverRateAvg ?? null,
    plannedPoints: sprint.plannedPoints ?? null,
    completedPoints: sprint.completedPoints ?? null,
    carryOverPoints: sprint.carryOverPoints ?? null,
    grossHours: sprint.grossHours ?? null,
    rawDeliveryToBugRatio: sprint.deliveryToBugRatio ?? null,
    deliveryToBugCompletedPoints: sprint.deliveryToBugCompletedPoints ?? null,
    deliveryToBugHours: sprint.deliveryToBugHours ?? null,
    rawOverheadPercent:
      sprint.overheadComposition?.overheadPercent != null
        ? Math.round(sprint.overheadComposition.overheadPercent * 100) / 100
        : null,
    rawCarryOverRate:
      sprint.carryOverPoints != null && sprint.plannedPoints != null && sprint.plannedPoints > 0
        ? Math.round((sprint.carryOverPoints / sprint.plannedPoints) * 100 * 100) / 100
        : null,
  };
}

/** Map a milestone API metric to MetricTileViewModel with empty-state handling */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

/** Format carry-over rate with 2 decimal places (e.g. "12.34%"); null → "N/A". */
function formatCarryOverRate(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return `${value.toFixed(2)}%`;
}

const METRIC_LABELS: Array<{
  key: keyof ApiResponse['workstreams'][0]['metrics'];
  label: string;
  unit: string;
  isPercent: boolean;
  metricId: MetricId;
}> = [
  { key: 'velocity', label: 'Velocity', unit: 'pts', isPercent: false, metricId: 'velocity' },
  {
    key: 'overheadPercent',
    label: 'Overhead %',
    unit: '%',
    isPercent: true,
    metricId: 'overheadPercent',
  },
  {
    key: 'carryOverRate',
    label: 'Carry-Over %',
    unit: '%',
    isPercent: true,
    metricId: 'carryOverRate',
  },
];

/** Format nullable number for detail display */
function formatDetailValue(value: number | null): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return String(value);
}

/** Map API response to full DashboardViewModel (success or empty) */
export function mapApiResponseToDashboardViewModel(
  response: ApiResponse,
  _today: Date = new Date()
): DashboardViewModel {
  const isEmpty =
    response.sprint === null &&
    response.workstreams.length === 0 &&
    response.program === null &&
    response.computedAt === null;

  if (isEmpty) {
    return {
      state: 'empty',
      sprintId: null,
      sprintLabel: null,
      rollingWindowLabel: null,
      computedAtLabel: null,
      programMetrics: null,
      programCycleTime: null,
      programTrendSprints: [],
      sprint5Prediction: null,
      workstreamCards: [],
    };
  }

  const sprintLabel = response.sprint?.name ?? null;
  const sprintId = response.sprint?.id ?? null;
  const rollingWindowLabel = response.rollingWindow
    ? `Rolling ${response.rollingWindow.count} sprints (current + ${Math.max(
        response.rollingWindow.count - 1,
        0
      )} prior)`
    : null;
  const computedAtLabel = response.computedAt
    ? new Date(response.computedAt).toLocaleString()
    : null;

  const programTrendSprints = (response.program?.trends?.sprints ?? []).map(mapTrendSprint);
  let programMetrics: MetricTileViewModel[] | null = null;
  if (response.program?.metrics) {
    const m = response.program.metrics;
    const avgVelocityRate = m.averageVelocityRate ?? null;
    const deliveryToBugRatio = m.deliveryToBugRatio ?? null;
    const deliveryToBugRag = toRagStatus(m.deliveryToBugRag ?? null);
    const rawCarryOver = m.carryOverRate?.avg ?? null;
    const roundedCarryOver = rawCarryOver !== null ? Math.round(rawCarryOver * 100) / 100 : null;
    const rawOverhead = m.overheadPercent?.avg ?? null;
    const roundedOverhead = rawOverhead !== null ? Math.round(rawOverhead * 100) / 100 : null;
    const baseProgramMetrics: MetricTileViewModel[] = [
      {
        label: 'Avg Total Velocity',
        value: formatMetricValue(m.velocity?.avg ?? null, 'pts'),
        rawValue: m.velocity?.avg ?? null,
        unit: 'pts',
        rag: toRagStatus(m.velocity?.rag ?? null),
        avgLabel: null,
        metricId: 'velocity',
      },
      {
        label: 'Avg Total Velocity Rate',
        value: avgVelocityRate !== null ? `${avgVelocityRate.toFixed(2)} pts/hr` : 'N/A',
        rawValue: avgVelocityRate,
        unit: 'pts/hr',
        rag: null,
        avgLabel: null,
        metricId: 'velocityRate',
      },
      {
        label: 'Avg Total Delivery/Bug',
        value: formatDeliveryToBugRatio(deliveryToBugRatio, deliveryToBugRag),
        rawValue: deliveryToBugRatio,
        unit: '',
        rag: deliveryToBugRag,
        avgLabel: null,
        metricId: 'deliveryToBugRatio',
      },
      {
        label: 'Avg Total Overhead %',
        value: roundedOverhead !== null ? `${roundedOverhead.toFixed(2)}%` : 'N/A',
        rawValue: roundedOverhead,
        unit: '%',
        rag: toRagStatus(m.overheadPercent?.rag ?? null),
        avgLabel: null,
        metricId: 'overheadPercent',
      },
      {
        label: 'Avg Total Carry-Over %',
        value: roundedCarryOver !== null ? `${roundedCarryOver.toFixed(2)}%` : 'N/A',
        rawValue: roundedCarryOver,
        unit: '%',
        rag: toRagStatus(m.carryOverRate?.rag ?? null),
        avgLabel: null,
        metricId: 'carryOverRate',
      },
    ];
    programMetrics = baseProgramMetrics.map((metric) => {
      if (metric.label === 'Avg Total Velocity Rate') {
        return {
          ...metric,
          rollingMetric: buildRollingMetricDetail({
            metric,
            metricId: 'velocityRate',
            title: metric.label,
            scope: 'program',
            scopeLabel: 'Program',
            rollingWindowLabel,
            trendSprints: programTrendSprints,
          }),
        };
      }
      if (metric.label === 'Avg Total Delivery/Bug') {
        return {
          ...metric,
          rollingMetric: buildRollingMetricDetail({
            metric,
            metricId: 'deliveryToBugRatio',
            title: metric.label,
            scope: 'program',
            scopeLabel: 'Program',
            rollingWindowLabel,
            trendSprints: programTrendSprints,
          }),
        };
      }
      if (metric.label === 'Avg Total Overhead %') {
        return {
          ...metric,
          rollingMetric: buildRollingMetricDetail({
            metric,
            metricId: 'overheadPercent',
            title: metric.label,
            scope: 'program',
            scopeLabel: 'Program',
            rollingWindowLabel,
            trendSprints: programTrendSprints,
          }),
        };
      }
      if (metric.label === 'Avg Total Carry-Over %') {
        return {
          ...metric,
          rollingMetric: buildRollingMetricDetail({
            metric,
            metricId: 'carryOverRate',
            title: metric.label,
            scope: 'program',
            scopeLabel: 'Program',
            rollingWindowLabel,
            trendSprints: programTrendSprints,
          }),
        };
      }
      return metric;
    });
  }
  const programCycleTime = response.program
    ? mapCycleTimeBreakdown(response.program.cycleTime)
    : null;

  const currentSprintName = response.sprint?.name ?? 'Current Sprint';
  const detailSprintLabel = response.detailSprint ? formatSprintLabel(response.detailSprint) : null;

  const workstreamCards: WorkstreamCardViewModel[] = (response.workstreams ?? []).map((ws) => {
    let metrics = METRIC_LABELS.map(({ key, label, unit, isPercent, metricId }) =>
      mapApiMetricToTile(ws.metrics[key], label, unit, isPercent, metricId)
    );
    const mappedTrendSprints = (ws.trends?.sprints ?? []).map(mapTrendSprint);

    // Override velocity tile to display the rolling average instead of the current/projected value.
    const velocityIdx = metrics.findIndex((m) => m.label === 'Velocity');
    if (velocityIdx >= 0) {
      const avgRaw = ws.metrics.velocity?.avg ?? null;
      metrics[velocityIdx] = {
        ...metrics[velocityIdx]!,
        label: 'Avg Velocity',
        value: formatMetricValue(avgRaw, 'pts'),
        rawValue: avgRaw,
        mode: undefined,
        avgLabel: null,
      };
    }

    const velocityRateValue = ws.prediction?.velocityRate ?? null;
    metrics.splice(1, 0, {
      label: 'Velocity Rate',
      value: formatVelocityRate(velocityRateValue),
      rawValue: velocityRateValue,
      unit: 'pts/hr',
      rag: null,
      avgLabel: null,
      metricId: 'velocityRate',
    });

    const deliveryToBugRatio = ws.prediction?.deliveryToBugRatio ?? null;
    const deliveryToBugRag = toRagStatus(ws.prediction?.deliveryToBugRag ?? null);
    metrics.splice(2, 0, {
      label: 'Delivery/Bug',
      value: formatDeliveryToBugRatio(deliveryToBugRatio, deliveryToBugRag),
      rawValue: deliveryToBugRatio,
      unit: '',
      rag: deliveryToBugRag,
      avgLabel: null,
      metricId: 'deliveryToBugRatio',
    });

    // Workstream tiles show sprint-actual values; rolling averages appear as avgLabel.
    const overheadIdx = metrics.findIndex((m) => m.label === 'Overhead %');
    if (overheadIdx >= 0) {
      const rawVal = metrics[overheadIdx]!.rawValue;
      const avgRaw = ws.metrics.overheadPercent?.avg ?? null;
      metrics[overheadIdx] = {
        ...metrics[overheadIdx]!,
        value: formatCarryOverRate(rawVal),
        avgLabel:
          avgRaw !== null && ws.metrics.overheadPercent?.mode !== 'projected'
            ? formatCarryOverRate(avgRaw)
            : null,
      };
    }

    const carryOverIdx = metrics.findIndex((m) => m.label === 'Carry-Over %');
    if (carryOverIdx >= 0) {
      const rawVal = metrics[carryOverIdx]!.rawValue;
      const avgRaw = ws.metrics.carryOverRate?.avg ?? null;
      metrics[carryOverIdx] = {
        ...metrics[carryOverIdx]!,
        value: formatCarryOverRate(rawVal),
        avgLabel:
          avgRaw !== null && ws.metrics.carryOverRate?.mode !== 'projected'
            ? formatCarryOverRate(avgRaw)
            : null,
      };
    }

    metrics = metrics.map((metric) => {
      if (metric.label === 'Velocity Rate') {
        return {
          ...metric,
          rollingMetric: buildRollingMetricDetail({
            metric,
            metricId: 'velocityRate',
            title: metric.label,
            scope: 'workstream',
            scopeLabel: ws.workstreamName ?? 'Unknown',
            rollingWindowLabel,
            trendSprints: mappedTrendSprints,
          }),
        };
      }
      if (metric.label === 'Delivery/Bug') {
        return {
          ...metric,
          rollingMetric: buildRollingMetricDetail({
            metric,
            metricId: 'deliveryToBugRatio',
            title: metric.label,
            scope: 'workstream',
            scopeLabel: ws.workstreamName ?? 'Unknown',
            rollingWindowLabel,
            trendSprints: mappedTrendSprints,
          }),
        };
      }
      if (metric.label === 'Overhead %') {
        return {
          ...metric,
          rollingMetric: buildRollingMetricDetail({
            metric,
            metricId: 'overheadPercent',
            title: metric.label,
            scope: 'workstream',
            scopeLabel: ws.workstreamName ?? 'Unknown',
            rollingWindowLabel,
            trendSprints: mappedTrendSprints,
          }),
        };
      }
      if (metric.label === 'Carry-Over %') {
        return {
          ...metric,
          rollingMetric: buildRollingMetricDetail({
            metric,
            metricId: 'carryOverRate',
            title: metric.label,
            scope: 'workstream',
            scopeLabel: ws.workstreamName ?? 'Unknown',
            rollingWindowLabel,
            trendSprints: mappedTrendSprints,
          }),
        };
      }
      return metric;
    });

    const d = ws.detail ?? {};
    const wsPrediction = ws.prediction;

    return {
      workstreamId: ws.workstreamId,
      workstreamName: ws.workstreamName ?? 'Unknown',
      metrics,
      detailSprintLabel,
      detail: {
        plannedPoints: formatDetailValue(d.plannedPoints),
        completedPoints: formatDetailValue(d.completedPoints),
        carryOverPoints: formatDetailValue(d.carryOverPoints),
      },
      cycleTime: mapCycleTimeBreakdown(ws.cycleTime),
      trendSprints: mappedTrendSprints,
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
      overheadComposition: mapOverheadComposition(ws.trends?.sprints ?? []),
      overheadItemsBySprint: (ws.overheadItemsBySprint ?? []).map(
        (sprintItems): OverheadSprintViewModel => ({
          sprintId: sprintItems.sprintId,
          bugs: sprintItems.bugs.map(mapOverheadItem),
          spikes: sprintItems.spikes.map(mapOverheadItem),
          support: sprintItems.support.map(mapOverheadItem),
        })
      ),
    };
  });

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
    sprintId,
    sprintLabel,
    rollingWindowLabel,
    computedAtLabel,
    programMetrics,
    programCycleTime,
    programTrendSprints,
    sprint5Prediction,
    workstreamCards,
  };
}

/** Create loading state view model */
export function createLoadingViewModel(): DashboardViewModel {
  return {
    state: 'loading',
    sprintId: null,
    sprintLabel: null,
    rollingWindowLabel: null,
    computedAtLabel: null,
    programMetrics: null,
    programCycleTime: null,
    programTrendSprints: [],
    sprint5Prediction: null,
    workstreamCards: [],
  };
}

/** Create error state view model */
export function createErrorViewModel(message: string): DashboardViewModel {
  return {
    state: 'error',
    sprintId: null,
    sprintLabel: null,
    rollingWindowLabel: null,
    computedAtLabel: null,
    programMetrics: null,
    programCycleTime: null,
    programTrendSprints: [],
    sprint5Prediction: null,
    workstreamCards: [],
    errorMessage: message,
  };
}
