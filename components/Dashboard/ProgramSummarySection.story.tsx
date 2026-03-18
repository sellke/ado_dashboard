import {
  createDashboardViewModel,
  createMetricTile,
} from '@/__tests__/components/Dashboard/__fixtures__/dashboard-fixtures';
import type { MetricTileViewModel } from '@/lib/dashboard/types';
import { ProgramSummarySection } from './ProgramSummarySection';

export default {
  title: 'Dashboard/ProgramSummarySection',
  component: ProgramSummarySection,
};

const enrichedDefaults = {
  velocityAvg: null as number | null,
  overheadPercentAvg: null as number | null,
  carryOverRateAvg: null as number | null,
  plannedPoints: null as number | null,
  completedPoints: null as number | null,
  carryOverPoints: null as number | null,
  grossHours: null as number | null,
};

const createMetric = (overrides: Partial<MetricTileViewModel> = {}): MetricTileViewModel =>
  createMetricTile(overrides);

export const AllMetricsPopulated = () => {
  const viewModel = createDashboardViewModel('success', {
    sprintLabel: 'Sprint 26.21',
    computedAtLabel: '2/11/2026, 6:30:00 PM',
    programMetrics: [
      createMetric({
        label: 'Velocity',
        value: '128 pts',
        rawValue: 128,
        avgLabel: '120.5 pts',
        rag: 'Green',
      }),
      createMetric({ label: 'Overhead %', value: '31.2%', rawValue: 31.2, rag: 'Amber' }),
      createMetric({ label: 'Carry-Over %', value: '12%', rawValue: 12, rag: 'Amber' }),
      createMetric({
        label: 'Monthly Milestone %',
        value: '\u2014',
        rawValue: null,
        unit: '%',
        rag: null,
        avgLabel: 'No milestone data yet',
      }),
      createMetric({
        label: 'Quarterly Milestone Progress',
        value: '\u2014',
        rawValue: null,
        unit: '%',
        rag: null,
        avgLabel: 'No milestone data yet',
      }),
    ],
    workstreamCards: [],
  });
  return <ProgramSummarySection viewModel={viewModel} />;
};

export const MixedRag = () => {
  const viewModel = createDashboardViewModel('success', {
    sprintLabel: 'Sprint 26.21',
    computedAtLabel: '2/11/2026, 6:30:00 PM',
    programMetrics: [
      createMetric({ label: 'Velocity', value: '128 pts', rag: 'Green' }),
      createMetric({ label: 'Overhead %', value: '35%', rag: 'Amber' }),
      createMetric({ label: 'Carry-Over %', value: '18%', rag: 'Red' }),
      createMetric({
        label: 'Monthly Milestone %',
        value: '\u2014',
        rawValue: null,
        unit: '%',
        rag: null,
        avgLabel: 'No milestone data yet',
      }),
      createMetric({
        label: 'Quarterly Milestone Progress',
        value: '\u2014',
        rawValue: null,
        unit: '%',
        rag: null,
        avgLabel: 'No milestone data yet',
      }),
    ],
    workstreamCards: [],
  });
  return <ProgramSummarySection viewModel={viewModel} />;
};

export const NullValues = () => {
  const viewModel = createDashboardViewModel('success', {
    sprintLabel: 'Sprint 26.21',
    computedAtLabel: null,
    programMetrics: [
      createMetric({ label: 'Velocity', value: 'N/A', rawValue: null, rag: null, avgLabel: null }),
      createMetric({
        label: 'Overhead %',
        value: 'N/A',
        rawValue: null,
        rag: 'Amber',
        avgLabel: null,
      }),
      createMetric({
        label: 'Carry-Over %',
        value: 'N/A',
        rawValue: null,
        rag: null,
        avgLabel: null,
      }),
    ],
    workstreamCards: [],
  });
  return <ProgramSummarySection viewModel={viewModel} />;
};

export const NoMetrics = () => {
  const viewModel = createDashboardViewModel('success', {
    sprintLabel: 'Sprint 26.21',
    computedAtLabel: '2/11/2026, 6:30:00 PM',
    programMetrics: null,
    workstreamCards: [],
  });
  return <ProgramSummarySection viewModel={viewModel} />;
};

export const TrendRich = () => {
  const viewModel = createDashboardViewModel('success', {
    sprintLabel: 'Sprint 26.21',
    computedAtLabel: '2/11/2026, 6:30:00 PM',
    programTrendSprints: [
      {
        sprintId: 's1',
        sprintName: 'Sprint 1',
        velocity: '118 pts',
        velocityRate: '1.25 pts/hr',
        activeBugs: '13',
        bugsClosed: '17',
        rawVelocity: 118,
        rawVelocityRate: 1.25,
        rawActiveBugs: 13,
        rawBugsClosed: 17,
        bugs: [],
        ...enrichedDefaults,
      },
      {
        sprintId: 's2',
        sprintName: 'Sprint 2',
        velocity: '122 pts',
        velocityRate: '1.30 pts/hr',
        activeBugs: '10',
        bugsClosed: '18',
        rawVelocity: 122,
        rawVelocityRate: 1.3,
        rawActiveBugs: 10,
        rawBugsClosed: 18,
        bugs: [],
        ...enrichedDefaults,
      },
      {
        sprintId: 's3',
        sprintName: 'Sprint 3',
        velocity: '127 pts',
        velocityRate: '1.36 pts/hr',
        activeBugs: '9',
        bugsClosed: '19',
        rawVelocity: 127,
        rawVelocityRate: 1.36,
        rawActiveBugs: 9,
        rawBugsClosed: 19,
        bugs: [],
        ...enrichedDefaults,
      },
      {
        sprintId: 's4',
        sprintName: 'Sprint 4',
        velocity: '131 pts',
        velocityRate: '1.41 pts/hr',
        activeBugs: '8',
        bugsClosed: '20',
        rawVelocity: 131,
        rawVelocityRate: 1.41,
        rawActiveBugs: 8,
        rawBugsClosed: 20,
        bugs: [],
        ...enrichedDefaults,
      },
    ],
    sprint5Prediction: {
      velocity: '136 pts',
      rawVelocity: 136,
      sprintLabel: 'Sprint 26.21',
      isPredicted: true,
    },
  });
  return <ProgramSummarySection viewModel={viewModel} />;
};

export const MilestoneEmptyState = () => {
  const viewModel = createDashboardViewModel('success', {
    sprintLabel: 'Sprint 26.21',
    computedAtLabel: '2/11/2026, 6:30:00 PM',
    programMetrics: [
      createMetric({
        label: 'Velocity',
        value: '128 pts',
        rawValue: 128,
        avgLabel: '120.5 pts',
        rag: 'Green',
      }),
      createMetric({ label: 'Overhead %', value: '31.2%', rawValue: 31.2, rag: 'Amber' }),
      createMetric({ label: 'Carry-Over %', value: '12%', rawValue: 12, rag: 'Amber' }),
      createMetric({
        label: 'Monthly Milestone %',
        value: '\u2014',
        rawValue: null,
        unit: '%',
        rag: null,
        avgLabel: 'No milestone data yet',
      }),
      createMetric({
        label: 'Quarterly Milestone Progress',
        value: '\u2014',
        rawValue: null,
        unit: '%',
        rag: null,
        avgLabel: 'No milestone data yet',
      }),
    ],
    workstreamCards: [],
  });
  return <ProgramSummarySection viewModel={viewModel} />;
};

export const MilestonePopulatedGreen = () => {
  const viewModel = createDashboardViewModel('success', {
    sprintLabel: 'Sprint 26.21',
    computedAtLabel: '2/11/2026, 6:30:00 PM',
    programMetrics: [
      createMetric({
        label: 'Velocity',
        value: '128 pts',
        rawValue: 128,
        avgLabel: '120.5 pts',
        rag: 'Green',
      }),
      createMetric({ label: 'Overhead %', value: '31.2%', rawValue: 31.2, rag: 'Amber' }),
      createMetric({ label: 'Carry-Over %', value: '12%', rawValue: 12, rag: 'Green' }),
      createMetric({
        label: 'Monthly Milestone %',
        value: '90%',
        rawValue: 90,
        unit: '%',
        rag: 'Green',
        avgLabel: null,
      }),
      createMetric({
        label: 'Quarterly Milestone Progress',
        value: '88%',
        rawValue: 88,
        unit: '%',
        rag: 'Green',
        avgLabel: null,
      }),
    ],
    workstreamCards: [],
  });
  return <ProgramSummarySection viewModel={viewModel} />;
};

export const MilestonePopulatedAmber = () => {
  const viewModel = createDashboardViewModel('success', {
    sprintLabel: 'Sprint 26.21',
    computedAtLabel: '2/11/2026, 6:30:00 PM',
    programMetrics: [
      createMetric({
        label: 'Velocity',
        value: '128 pts',
        rawValue: 128,
        avgLabel: '120.5 pts',
        rag: 'Green',
      }),
      createMetric({ label: 'Overhead %', value: '31.2%', rawValue: 31.2, rag: 'Amber' }),
      createMetric({ label: 'Carry-Over %', value: '12%', rawValue: 12, rag: 'Green' }),
      createMetric({
        label: 'Monthly Milestone %',
        value: '75%',
        rawValue: 75,
        unit: '%',
        rag: 'Amber',
        avgLabel: null,
      }),
      createMetric({
        label: 'Quarterly Milestone Progress',
        value: '68%',
        rawValue: 68,
        unit: '%',
        rag: 'Amber',
        avgLabel: null,
      }),
    ],
    workstreamCards: [],
  });
  return <ProgramSummarySection viewModel={viewModel} />;
};

export const MilestonePopulatedRed = () => {
  const viewModel = createDashboardViewModel('success', {
    sprintLabel: 'Sprint 26.21',
    computedAtLabel: '2/11/2026, 6:30:00 PM',
    programMetrics: [
      createMetric({
        label: 'Velocity',
        value: '128 pts',
        rawValue: 128,
        avgLabel: '120.5 pts',
        rag: 'Green',
      }),
      createMetric({ label: 'Overhead %', value: '31.2%', rawValue: 31.2, rag: 'Amber' }),
      createMetric({ label: 'Carry-Over %', value: '12%', rawValue: 12, rag: 'Green' }),
      createMetric({
        label: 'Monthly Milestone %',
        value: '45%',
        rawValue: 45,
        unit: '%',
        rag: 'Red',
        avgLabel: null,
      }),
      createMetric({
        label: 'Quarterly Milestone Progress',
        value: '52%',
        rawValue: 52,
        unit: '%',
        rag: 'Red',
        avgLabel: null,
      }),
    ],
    workstreamCards: [],
  });
  return <ProgramSummarySection viewModel={viewModel} />;
};

export const TrendPartialData = () => {
  const viewModel = createDashboardViewModel('success', {
    sprintLabel: 'Sprint 26.21',
    computedAtLabel: '2/11/2026, 6:30:00 PM',
    programTrendSprints: [
      {
        sprintId: 's1',
        sprintName: 'Sprint 1',
        velocity: 'N/A',
        velocityRate: 'N/A',
        activeBugs: 'N/A',
        bugsClosed: 'N/A',
        rawVelocity: null,
        rawVelocityRate: null,
        rawActiveBugs: 0,
        rawBugsClosed: 0,
        bugs: [],
        ...enrichedDefaults,
      },
      {
        sprintId: 's2',
        sprintName: 'Sprint 2',
        velocity: '121 pts',
        velocityRate: '1.32 pts/hr',
        activeBugs: '10',
        bugsClosed: '18',
        rawVelocity: 121,
        rawVelocityRate: 1.32,
        rawActiveBugs: 10,
        rawBugsClosed: 18,
        bugs: [],
        ...enrichedDefaults,
      },
    ],
    sprint5Prediction: {
      velocity: 'N/A',
      rawVelocity: null,
      sprintLabel: 'Sprint 26.21',
      isPredicted: true,
    },
  });
  return <ProgramSummarySection viewModel={viewModel} />;
};
