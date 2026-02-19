import type { MetricTileViewModel, WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { WorkstreamCardsGrid } from './WorkstreamCardsGrid';
import { WorkstreamHealthCard } from './WorkstreamHealthCard';

export default {
  title: 'Dashboard/WorkstreamHealthCard',
  component: WorkstreamHealthCard,
};

const createMetric = (overrides: Partial<MetricTileViewModel> = {}): MetricTileViewModel => ({
  label: 'Velocity',
  value: '45 pts',
  rawValue: 45,
  unit: 'pts',
  rag: 'Green',
  avgLabel: null,
  ...overrides,
});

const fullDataCard: WorkstreamCardViewModel = {
  workstreamId: 'ws-1',
  workstreamName: 'Platform',
  metrics: [
    createMetric({ label: 'Velocity', value: '45 pts', rawValue: 45, rag: 'Green' }),
    createMetric({ label: 'Overhead %', value: '28%', rawValue: 28, rag: 'Green' }),
    createMetric({ label: 'Carry-Over %', value: '12%', rawValue: 12, rag: 'Green' }),
  ],
  detail: {
    plannedPoints: '50',
    completedPoints: '45',
    carryOverItems: '3',
    carryOverPoints: '6',
  },
  trendSprints: [
    {
      sprintId: 's1',
      sprintName: 'Sprint 1',
      velocity: '40 pts',
      velocityRate: '0.67 pts/hr',
      activeBugs: '2',
      bugsClosed: '5',
      rawVelocity: 40,
      rawVelocityRate: 0.67,
      rawActiveBugs: 2,
      rawBugsClosed: 5,
    },
    {
      sprintId: 's2',
      sprintName: 'Sprint 2',
      velocity: '42 pts',
      velocityRate: '0.70 pts/hr',
      activeBugs: '3',
      bugsClosed: '4',
      rawVelocity: 42,
      rawVelocityRate: 0.7,
      rawActiveBugs: 3,
      rawBugsClosed: 4,
    },
  ],
};

export const SingleWorkstream = () => <WorkstreamHealthCard card={fullDataCard} />;

export const FourWorkstreamsAllGreen = () => {
  const cards: WorkstreamCardViewModel[] = [
    { ...fullDataCard, workstreamId: 'ws-1', workstreamName: 'Platform' },
    {
      ...fullDataCard,
      workstreamId: 'ws-2',
      workstreamName: 'Apps',
      detail: {
        plannedPoints: '38',
        completedPoints: '35',
        carryOverItems: '2',
        carryOverPoints: '4',
      },
    },
    {
      ...fullDataCard,
      workstreamId: 'ws-3',
      workstreamName: 'Infrastructure',
      detail: {
        plannedPoints: '42',
        completedPoints: '40',
        carryOverItems: '1',
        carryOverPoints: '2',
      },
    },
    {
      ...fullDataCard,
      workstreamId: 'ws-4',
      workstreamName: 'Security',
      detail: {
        plannedPoints: '30',
        completedPoints: '28',
        carryOverItems: '0',
        carryOverPoints: '0',
      },
    },
  ];
  return <WorkstreamCardsGrid cards={cards} />;
};

export const MixedRag = () => {
  const cards: WorkstreamCardViewModel[] = [
    {
      ...fullDataCard,
      workstreamId: 'ws-1',
      workstreamName: 'Platform',
      metrics: [
        createMetric({ label: 'Velocity', value: '45 pts', rag: 'Green' }),
        createMetric({ label: 'Overhead %', value: '35%', rag: 'Amber' }),
        createMetric({ label: 'Carry-Over %', value: '18%', rag: 'Red' }),
      ],
    },
    {
      ...fullDataCard,
      workstreamId: 'ws-2',
      workstreamName: 'Apps',
      metrics: [
        createMetric({ label: 'Velocity', value: '32 pts', rag: 'Amber' }),
        createMetric({ label: 'Overhead %', value: '42%', rag: 'Red' }),
        createMetric({ label: 'Carry-Over %', value: '5%', rag: 'Green' }),
      ],
    },
  ];
  return <WorkstreamCardsGrid cards={cards} />;
};

export const NullData = () => {
  const nullCard: WorkstreamCardViewModel = {
    ...fullDataCard,
    workstreamId: 'ws-1',
    workstreamName: 'Platform (No Data)',
    metrics: [
      createMetric({ label: 'Velocity', value: 'N/A', rawValue: null, rag: null }),
      createMetric({ label: 'Overhead %', value: 'N/A', rawValue: null, rag: null }),
      createMetric({ label: 'Carry-Over %', value: 'N/A', rawValue: null, rag: null }),
    ],
    detail: {
      plannedPoints: 'N/A',
      completedPoints: 'N/A',
      carryOverItems: 'N/A',
      carryOverPoints: 'N/A',
    },
  };
  return <WorkstreamHealthCard card={nullCard} />;
};

export const PartialData = () => {
  const partialCard: WorkstreamCardViewModel = {
    ...fullDataCard,
    workstreamId: 'ws-1',
    workstreamName: 'Platform (Partial)',
    metrics: [
      createMetric({ label: 'Velocity', value: 'N/A', rawValue: null, rag: null }),
      createMetric({ label: 'Overhead %', value: '28%', rawValue: 28, rag: 'Green' }),
      createMetric({ label: 'Carry-Over %', value: '12%', rawValue: 12, rag: 'Amber' }),
    ],
    detail: {
      plannedPoints: '50',
      completedPoints: 'N/A',
      carryOverItems: '3',
      carryOverPoints: '6',
    },
  };
  return <WorkstreamHealthCard card={partialCard} />;
};

export const GridWithAllVariants = () => {
  const cards: WorkstreamCardViewModel[] = [
    fullDataCard,
    {
      ...fullDataCard,
      workstreamId: 'ws-2',
      workstreamName: 'Apps',
      metrics: [
        createMetric({ label: 'Velocity', value: '32 pts', rag: 'Amber' }),
        createMetric({ label: 'Overhead %', value: '42%', rag: 'Red' }),
        createMetric({ label: 'Carry-Over %', value: '5%', rag: 'Green' }),
      ],
    },
    {
      ...fullDataCard,
      workstreamId: 'ws-3',
      workstreamName: 'Infrastructure',
      metrics: [
        createMetric({ label: 'Velocity', value: 'N/A', rawValue: null, rag: null }),
        createMetric({ label: 'Overhead %', value: 'N/A', rawValue: null, rag: null }),
        createMetric({ label: 'Carry-Over %', value: 'N/A', rawValue: null, rag: null }),
      ],
      detail: {
        plannedPoints: 'N/A',
        completedPoints: 'N/A',
        carryOverItems: 'N/A',
        carryOverPoints: 'N/A',
      },
    },
  ];
  return <WorkstreamCardsGrid cards={cards} />;
};
