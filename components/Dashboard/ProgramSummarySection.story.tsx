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
