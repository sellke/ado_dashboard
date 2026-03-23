import { MilestoneQuarterlyPanel } from '@/components/Dashboard/MilestoneQuarterlyPanel';
import type { MilestoneQuarterGroup } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

const q3Group: MilestoneQuarterGroup = {
  quarter: 'Q3',
  features: [
    {
      id: 'ms-1',
      title: 'Streams v2 Launch',
      adoFeatureId: '#12345',
      workstreams: [
        {
          workstreamId: 'ws-1',
          workstreamName: 'Action Tracker',
          totalStories: 12,
          inProgressPercent: 25,
          completedPercent: 50,
        },
        {
          workstreamId: 'ws-2',
          workstreamName: 'Pitch Tracker',
          totalStories: 8,
          inProgressPercent: 12,
          completedPercent: 75,
        },
      ],
    },
  ],
};

const q4Group: MilestoneQuarterGroup = {
  quarter: 'Q4',
  features: [
    {
      id: 'ms-2',
      title: 'KPI Dashboard',
      adoFeatureId: '#12347',
      workstreams: [
        {
          workstreamId: 'ws-3',
          workstreamName: 'KPI Services',
          totalStories: 10,
          inProgressPercent: 0,
          completedPercent: 0,
        },
      ],
    },
  ],
};

describe('MilestoneQuarterlyPanel', () => {
  it('renders quarter badges for each group', () => {
    render(<MilestoneQuarterlyPanel quarterGroups={[q3Group, q4Group]} />);

    expect(screen.getByText('Q3')).toBeInTheDocument();
    expect(screen.getByText('Q4')).toBeInTheDocument();
  });

  it('renders feature titles with ADO feature IDs', () => {
    render(<MilestoneQuarterlyPanel quarterGroups={[q3Group]} />);

    expect(screen.getByText('Streams v2 Launch')).toBeInTheDocument();
    expect(screen.getByText('(#12345)')).toBeInTheDocument();
  });

  it('renders workstream names with story counts', () => {
    render(<MilestoneQuarterlyPanel quarterGroups={[q3Group]} />);

    expect(screen.getByText('Action Tracker: 12 stories')).toBeInTheDocument();
    expect(screen.getByText('Pitch Tracker: 8 stories')).toBeInTheDocument();
  });

  it('renders progress percentages for each workstream', () => {
    render(<MilestoneQuarterlyPanel quarterGroups={[q3Group]} />);

    expect(screen.getByText('25% active')).toBeInTheDocument();
    expect(screen.getByText('50% done')).toBeInTheDocument();
    expect(screen.getByText('12% active')).toBeInTheDocument();
    expect(screen.getByText('75% done')).toBeInTheDocument();
  });

  it('renders empty state when no quarter groups', () => {
    render(<MilestoneQuarterlyPanel quarterGroups={[]} />);

    expect(screen.getByTestId('milestone-quarterly-empty')).toBeInTheDocument();
    expect(screen.getByText('No milestone data available')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(<MilestoneQuarterlyPanel quarterGroups={[]} loading />);

    expect(screen.getByText('Loading milestone data...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<MilestoneQuarterlyPanel quarterGroups={[]} error="Failed to load" />);

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('renders panel test id', () => {
    render(<MilestoneQuarterlyPanel quarterGroups={[q3Group]} />);

    expect(screen.getByTestId('milestone-quarterly-panel')).toBeInTheDocument();
  });

  it('renders 0% progress without crashing', () => {
    render(<MilestoneQuarterlyPanel quarterGroups={[q4Group]} />);

    expect(screen.getByText('KPI Services: 10 stories')).toBeInTheDocument();
    expect(screen.getByText('0% active')).toBeInTheDocument();
    expect(screen.getByText('0% done')).toBeInTheDocument();
  });
});
