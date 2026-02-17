import {
  createDashboardViewModel,
  createMetricTile,
  createWorkstreamCard,
} from '@/__tests__/components/Dashboard/__fixtures__/dashboard-fixtures';
import type { MetricTileViewModel } from '@/lib/dashboard/types';
import { DashboardShell } from './DashboardShell';

export default {
  title: 'Dashboard/DashboardShell',
  component: DashboardShell,
};

const createMetric = (overrides: Partial<MetricTileViewModel> = {}): MetricTileViewModel =>
  createMetricTile(overrides);

const onRetry = () => console.log('Retry clicked');

export const Loading = () => {
  const viewModel = createDashboardViewModel('loading');
  return <DashboardShell viewModel={viewModel} onRetry={onRetry} />;
};

export const SuccessFullData = () => {
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
      createMetric({ label: 'Overhead %', value: '31.2%', rawValue: 31.2, rag: 'Green' }),
      createMetric({ label: 'Predictability', value: '82%', rawValue: 82, rag: 'Green' }),
      createMetric({ label: 'Carry-over rate', value: '12%', rawValue: 12, rag: 'Green' }),
    ],
    workstreamCards: [
      createWorkstreamCard({ workstreamId: 'ws-1', workstreamName: 'Platform' }),
      createWorkstreamCard({ workstreamId: 'ws-2', workstreamName: 'Apps' }),
    ],
  });
  return <DashboardShell viewModel={viewModel} onRetry={onRetry} />;
};

export const SuccessMixedRag = () => {
  const viewModel = createDashboardViewModel('success', {
    sprintLabel: 'Sprint 26.21',
    computedAtLabel: '2/11/2026, 6:30:00 PM',
    programMetrics: [
      createMetric({ label: 'Velocity', value: '128 pts', rag: 'Green' }),
      createMetric({ label: 'Overhead %', value: '35%', rag: 'Amber' }),
      createMetric({ label: 'Predictability', value: '72%', rag: 'Red' }),
      createMetric({ label: 'Carry-over rate', value: '18%', rag: 'Amber' }),
    ],
    workstreamCards: [
      createWorkstreamCard({
        workstreamId: 'ws-1',
        workstreamName: 'Platform',
        metrics: [
          createMetric({ label: 'Velocity', value: '45 pts', rag: 'Green' }),
          createMetric({ label: 'Overhead %', value: '35%', rag: 'Amber' }),
          createMetric({ label: 'Predictability', value: '72%', rag: 'Red' }),
          createMetric({ label: 'Carry-over rate', value: '18%', rag: 'Amber' }),
        ],
      }),
      createWorkstreamCard({
        workstreamId: 'ws-2',
        workstreamName: 'Apps',
        metrics: [
          createMetric({ label: 'Velocity', value: '32 pts', rag: 'Amber' }),
          createMetric({ label: 'Overhead %', value: '42%', rag: 'Red' }),
          createMetric({ label: 'Predictability', value: '88%', rag: 'Green' }),
          createMetric({ label: 'Carry-over rate', value: '5%', rag: 'Green' }),
        ],
      }),
    ],
  });
  return <DashboardShell viewModel={viewModel} onRetry={onRetry} />;
};

export const Empty = () => {
  const viewModel = createDashboardViewModel('empty');
  return <DashboardShell viewModel={viewModel} onRetry={onRetry} />;
};

export const Error = () => {
  const viewModel = createDashboardViewModel('error', {
    errorMessage: 'Failed to load metrics. Please try again.',
  });
  return <DashboardShell viewModel={viewModel} onRetry={onRetry} />;
};

export const SuccessTrendRich = () => {
  const viewModel = createDashboardViewModel('success', {
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
    workstreamCards: [
      createWorkstreamCard({ workstreamId: 'ws-1', workstreamName: 'Platform' }),
      createWorkstreamCard({ workstreamId: 'ws-2', workstreamName: 'Apps' }),
    ],
  });
  return <DashboardShell viewModel={viewModel} onRetry={onRetry} />;
};

export const SuccessTrendPartialData = () => {
  const viewModel = createDashboardViewModel('success', {
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
        velocity: '122 pts',
        velocityRate: '1.30 pts/hr',
        activeBugs: '10',
        bugsClosed: '18',
      },
    ],
    sprint5Prediction: {
      velocity: 'N/A',
      isPredicted: true,
    },
    workstreamCards: [
      createWorkstreamCard({
        workstreamId: 'ws-1',
        workstreamName: 'Platform',
        trendSprints: [
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
            velocity: '42 pts',
            velocityRate: '0.70 pts/hr',
            activeBugs: '3',
            bugsClosed: '4',
          },
        ],
      }),
    ],
  });
  return <DashboardShell viewModel={viewModel} onRetry={onRetry} />;
};
