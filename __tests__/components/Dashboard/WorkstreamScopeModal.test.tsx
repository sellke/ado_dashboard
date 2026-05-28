import { WorkstreamScopeModal } from '@/components/Dashboard/WorkstreamScopeModal';
import { render, screen, userEvent } from '@/test-utils';

const workstreams = [
  { id: 'ws-1', name: 'Action Tracker', adoAreaPath: 'Area\\Action Tracker' },
  { id: 'ws-2', name: 'Pitch Tracker', adoAreaPath: 'Area\\Pitch Tracker' },
];

describe('WorkstreamScopeModal', () => {
  it('saves a non-empty draft selection', async () => {
    const onSave = jest.fn();

    render(
      <WorkstreamScopeModal
        opened
        workstreams={workstreams}
        selectedIds={['ws-1']}
        loading={false}
        error={null}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('checkbox', { name: /pitch tracker/i }));
    await userEvent.click(screen.getByRole('button', { name: /save scope/i }));

    expect(onSave).toHaveBeenCalledWith(['ws-1', 'ws-2']);
  });

  it('discards draft changes on cancel', async () => {
    const onCancel = jest.fn();
    const onSave = jest.fn();

    render(
      <WorkstreamScopeModal
        opened
        workstreams={workstreams}
        selectedIds={['ws-1']}
        loading={false}
        error={null}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    await userEvent.click(screen.getByRole('checkbox', { name: /action tracker/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('blocks empty selections and shows validation', async () => {
    const onSave = jest.fn();

    render(
      <WorkstreamScopeModal
        opened
        workstreams={workstreams}
        selectedIds={['ws-1']}
        loading={false}
        error={null}
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('checkbox', { name: /action tracker/i }));

    expect(screen.getByRole('button', { name: /save scope/i })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows recoverable list-load errors', async () => {
    const onRetry = jest.fn();

    render(
      <WorkstreamScopeModal
        opened
        workstreams={[]}
        selectedIds={[]}
        loading={false}
        error="Workstreams unavailable"
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onRetry={onRetry}
      />
    );

    expect(screen.getByText(/workstreams unavailable/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
