import type { ApiMilestone } from '@/lib/milestones/types';
import { MilestonePanel } from './MilestonePanel';

export default {
  title: 'Dashboard/MilestonePanel',
  component: MilestonePanel,
};

const createMilestone = (overrides: Partial<ApiMilestone> = {}): ApiMilestone => ({
  id: 'm1',
  title: 'Launch Phase 1',
  workstreamId: 'ws-1',
  targetMonth: '2026-03-01T00:00:00.000Z',
  status: 'InProgress',
  adoFeatureId: 12345,
  notes: 'Key deliverable',
  createdAt: '2026-02-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
  workstream: { id: 'ws-1', name: 'Platform' },
  ...overrides,
});

const workstreams = [
  { id: 'ws-1', name: 'Platform' },
  { id: 'ws-2', name: 'Apps' },
];

const onRefresh = () => console.log('Refresh clicked');

export const PopulatedMixedStatus = () => {
  const milestones: ApiMilestone[] = [
    createMilestone({ id: 'm1', title: 'Phase 1', status: 'InProgress' }),
    createMilestone({ id: 'm2', title: 'Phase 2', status: 'NotStarted' }),
    createMilestone({
      id: 'm3',
      title: 'App Release',
      workstreamId: 'ws-2',
      workstream: { id: 'ws-2', name: 'Apps' },
      status: 'Done',
    }),
  ];
  return <MilestonePanel milestones={milestones} workstreams={workstreams} onRefresh={onRefresh} />;
};

export const PopulatedAllDone = () => {
  const milestones: ApiMilestone[] = [
    createMilestone({ id: 'm1', title: 'Phase 1', status: 'Done' }),
    createMilestone({ id: 'm2', title: 'Phase 2', status: 'Done' }),
    createMilestone({
      id: 'm3',
      title: 'App Release',
      workstreamId: 'ws-2',
      workstream: { id: 'ws-2', name: 'Apps' },
      status: 'Done',
    }),
  ];
  return <MilestonePanel milestones={milestones} workstreams={workstreams} onRefresh={onRefresh} />;
};

export const Empty = () => (
  <MilestonePanel milestones={[]} workstreams={workstreams} onRefresh={onRefresh} />
);

export const Loading = () => (
  <MilestonePanel milestones={[]} workstreams={workstreams} loading onRefresh={onRefresh} />
);

export const Error = () => (
  <MilestonePanel
    milestones={[]}
    workstreams={workstreams}
    error="Failed to load milestones. Please try again."
    onRefresh={onRefresh}
  />
);
