import { BugReportTable, extractBugGroups } from '@/components/Dashboard/BugReportTable';
import type { WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';
import { createWorkstreamCard } from './__fixtures__/dashboard-fixtures';

/**
 * Tests for BugReportTable component.
 * Verifies: grouping by workstream, open/closed display, empty state, extraction logic.
 */

const defaultEnrichedFields = {
  velocityAvg: null as number | null,
  overheadPercentAvg: null as number | null,
  carryOverRateAvg: null as number | null,
  plannedPoints: null as number | null,
  completedPoints: null as number | null,
  carryOverPoints: null as number | null,
  grossHours: null as number | null,
  rawOverheadPercent: null as number | null,
  rawCarryOverRate: null as number | null,
};

const platformCard = createWorkstreamCard({
  workstreamId: 'ws-1',
  workstreamName: 'Platform',
  trendSprints: [
    {
      sprintId: 's1',
      sprintName: 'Sprint 1',
      velocity: '40 pts',
      velocityRate: '0.67 pts/hr',
      activeBugs: '2',
      bugsClosed: '3',
      rawVelocity: 40,
      rawVelocityRate: 0.67,
      rawActiveBugs: 2,
      rawBugsClosed: 3,
      bugs: [
        { adoId: '100', title: 'Login crash', isClosed: true },
        { adoId: '101', title: 'Memory leak', isClosed: false },
      ],
      overheadBreakdown: [],
      ...defaultEnrichedFields,
    },
    {
      sprintId: 's2',
      sprintName: 'Sprint 2',
      velocity: '42 pts',
      velocityRate: '0.70 pts/hr',
      activeBugs: '1',
      bugsClosed: '2',
      rawVelocity: 42,
      rawVelocityRate: 0.7,
      rawActiveBugs: 1,
      rawBugsClosed: 2,
      bugs: [{ adoId: '102', title: 'Slow query', isClosed: false }],
      overheadBreakdown: [],
      ...defaultEnrichedFields,
    },
  ],
});

const appsCard = createWorkstreamCard({
  workstreamId: 'ws-2',
  workstreamName: 'Apps',
  trendSprints: [
    {
      sprintId: 's1',
      sprintName: 'Sprint 1',
      velocity: '30 pts',
      velocityRate: '0.50 pts/hr',
      activeBugs: '1',
      bugsClosed: '1',
      rawVelocity: 30,
      rawVelocityRate: 0.5,
      rawActiveBugs: 1,
      rawBugsClosed: 1,
      bugs: [{ adoId: '200', title: 'UI glitch', isClosed: true }],
      overheadBreakdown: [],
      ...defaultEnrichedFields,
    },
  ],
});

const noBugsCard = createWorkstreamCard({
  workstreamId: 'ws-3',
  workstreamName: 'KPI Services',
  trendSprints: [
    {
      sprintId: 's1',
      sprintName: 'Sprint 1',
      velocity: '20 pts',
      velocityRate: '0.40 pts/hr',
      activeBugs: '0',
      bugsClosed: '0',
      rawVelocity: 20,
      rawVelocityRate: 0.4,
      rawActiveBugs: 0,
      rawBugsClosed: 0,
      bugs: [],
      overheadBreakdown: [],
      ...defaultEnrichedFields,
    },
  ],
});

describe('extractBugGroups', () => {
  it('groups bugs by workstream', () => {
    const groups = extractBugGroups([platformCard, appsCard]);

    expect(groups).toHaveLength(2);
    expect(groups[0]!.workstreamName).toBe('Platform');
    expect(groups[0]!.bugs).toHaveLength(3);
    expect(groups[1]!.workstreamName).toBe('Apps');
    expect(groups[1]!.bugs).toHaveLength(1);
  });

  it('flattens bugs across sprints within a workstream', () => {
    const groups = extractBugGroups([platformCard]);

    const bugs = groups[0]!.bugs;
    expect(bugs).toHaveLength(3);
    expect(bugs[0]).toMatchObject({ adoId: '100', sprintName: 'Sprint 1' });
    expect(bugs[1]).toMatchObject({ adoId: '101', sprintName: 'Sprint 1' });
    expect(bugs[2]).toMatchObject({ adoId: '102', sprintName: 'Sprint 2' });
  });

  it('excludes workstreams with no bugs', () => {
    const groups = extractBugGroups([platformCard, noBugsCard]);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.workstreamName).toBe('Platform');
  });

  it('returns empty array when no workstreams have bugs', () => {
    const groups = extractBugGroups([noBugsCard]);
    expect(groups).toHaveLength(0);
  });
});

describe('BugReportTable', () => {
  it('renders empty state when no bugs exist', () => {
    render(<BugReportTable workstreamCards={[noBugsCard]} />);

    expect(screen.getByTestId('bug-report-empty')).toBeInTheDocument();
    expect(screen.getByText('No bugs found across workstreams.')).toBeInTheDocument();
  });

  it('renders workstream group headings', () => {
    render(<BugReportTable workstreamCards={[platformCard, appsCard]} />);

    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();
  });

  it('renders bug rows with ADO ID, title, sprint, and status', () => {
    render(<BugReportTable workstreamCards={[platformCard]} />);

    expect(screen.getByText('#100')).toBeInTheDocument();
    expect(screen.getByText('Login crash')).toBeInTheDocument();
    expect(screen.getByText('#101')).toBeInTheDocument();
    expect(screen.getByText('Memory leak')).toBeInTheDocument();
    expect(screen.getByText('#102')).toBeInTheDocument();
    expect(screen.getByText('Slow query')).toBeInTheDocument();
  });

  it('shows sprint name for each bug', () => {
    render(<BugReportTable workstreamCards={[platformCard]} />);

    const sprint1Cells = screen.getAllByText('Sprint 1');
    expect(sprint1Cells.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
  });

  it('displays Open/Closed status for each bug', () => {
    render(<BugReportTable workstreamCards={[platformCard]} />);

    const openLabels = screen.getAllByText('Open');
    const closedLabels = screen.getAllByText('Closed');
    expect(openLabels).toHaveLength(2);
    expect(closedLabels).toHaveLength(1);
  });

  it('renders data-testid="bug-report-table" when bugs exist', () => {
    render(<BugReportTable workstreamCards={[platformCard]} />);

    expect(screen.getByTestId('bug-report-table')).toBeInTheDocument();
  });

  it('does not render workstreams with zero bugs', () => {
    render(<BugReportTable workstreamCards={[platformCard, noBugsCard, appsCard]} />);

    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();
    expect(screen.queryByText('KPI Services')).not.toBeInTheDocument();
  });
});
