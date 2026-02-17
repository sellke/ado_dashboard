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
      createMetric({ label: 'Predictability', value: '82%', rawValue: 82, rag: 'Green' }),
      createMetric({ label: 'Carry-over rate', value: '12%', rawValue: 12, rag: 'Amber' }),
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
      createMetric({ label: 'Predictability', value: '72%', rag: 'Red' }),
      createMetric({ label: 'Carry-over rate', value: '18%', rag: 'Amber' }),
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
        label: 'Predictability',
        value: '50%',
        rawValue: 50,
        rag: 'Red',
        avgLabel: null,
      }),
      createMetric({
        label: 'Carry-over rate',
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
      },
      {
        sprintId: 's2',
        sprintName: 'Sprint 2',
        velocity: '122 pts',
        velocityRate: '1.30 pts/hr',
        activeBugs: '10',
        bugsClosed: '18',
      },
      {
        sprintId: 's3',
        sprintName: 'Sprint 3',
        velocity: '127 pts',
        velocityRate: '1.36 pts/hr',
        activeBugs: '9',
        bugsClosed: '19',
      },
      {
        sprintId: 's4',
        sprintName: 'Sprint 4',
        velocity: '131 pts',
        velocityRate: '1.41 pts/hr',
        activeBugs: '8',
        bugsClosed: '20',
      },
    ],
    sprint5Prediction: {
      velocity: '136 pts',
      isPredicted: true,
    },
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
      },
      {
        sprintId: 's2',
        sprintName: 'Sprint 2',
        velocity: '121 pts',
        velocityRate: '1.32 pts/hr',
        activeBugs: '10',
        bugsClosed: '18',
      },
    ],
    sprint5Prediction: {
      velocity: 'N/A',
      isPredicted: true,
    },
  });
  return <ProgramSummarySection viewModel={viewModel} />;
};
