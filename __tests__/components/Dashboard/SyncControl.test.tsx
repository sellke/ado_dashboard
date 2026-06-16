/**
 * Unit tests for SyncControl – sync button states and messaging.
 */

import { SyncControl } from '@/components/Dashboard/SyncControl';
import { render, screen, userEvent, within } from '@/test-utils';

describe('SyncControl', () => {
  it('renders Sync Now button when idle', () => {
    render(
      <SyncControl
        onSync={() => {}}
        syncInProgress={false}
        syncError={null}
        syncPartialSuccess={false}
      />
    );

    expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('shows Syncing… and disables button when in progress', () => {
    render(
      <SyncControl onSync={() => {}} syncInProgress syncError={null} syncPartialSuccess={false} />
    );

    const button = screen.getByRole('button', { name: /syncing/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/syncing/i)).toBeInTheDocument();
  });

  it('shows error alert when sync fails', () => {
    render(
      <SyncControl
        onSync={() => {}}
        syncInProgress={false}
        syncError="ADO connection failed"
        syncPartialSuccess={false}
        onDismissError={() => {}}
      />
    );

    expect(screen.getByTestId('sync-error-alert')).toBeInTheDocument();
    expect(screen.getByText(/ADO connection failed/)).toBeInTheDocument();
    expect(screen.getByText(/sync failed/i)).toBeInTheDocument();
  });

  it('shows auth-specific CTA when sync fails because ADO credentials are invalid', async () => {
    const onUpdateCredentials = jest.fn();
    render(
      <SyncControl
        onSync={() => {}}
        syncInProgress={false}
        syncError="ADO credentials expired or invalid"
        syncPartialSuccess={false}
        isAuthError
        onUpdateCredentials={onUpdateCredentials}
      />
    );

    expect(
      within(screen.getByTestId('sync-error-alert')).getAllByText(
        /ADO credentials expired or invalid/i
      ).length
    ).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /update ado credentials/i }));

    expect(onUpdateCredentials).toHaveBeenCalledTimes(1);
  });

  it('does not show credentials CTA for generic sync failures', () => {
    render(
      <SyncControl
        onSync={() => {}}
        syncInProgress={false}
        syncError="Database unavailable"
        syncPartialSuccess={false}
        isAuthError={false}
      />
    );

    expect(screen.getByText(/sync failed/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /update ado credentials/i })
    ).not.toBeInTheDocument();
  });

  it('shows partial-success alert when sync succeeds but metrics refetch fails', () => {
    render(
      <SyncControl onSync={() => {}} syncInProgress={false} syncError={null} syncPartialSuccess />
    );

    expect(screen.getByTestId('sync-partial-success-alert')).toBeInTheDocument();
    expect(screen.getByText(/sync completed but metrics refresh failed/i)).toBeInTheDocument();
  });

  it('calls onSync when Sync Now is clicked', async () => {
    const onSync = jest.fn();
    render(
      <SyncControl
        onSync={onSync}
        syncInProgress={false}
        syncError={null}
        syncPartialSuccess={false}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /sync now/i }));

    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('does not call onSync when disabled (in progress)', async () => {
    const onSync = jest.fn();
    render(
      <SyncControl onSync={onSync} syncInProgress syncError={null} syncPartialSuccess={false} />
    );

    const button = screen.getByRole('button', { name: /syncing/i });
    await userEvent.click(button);

    expect(onSync).not.toHaveBeenCalled();
  });

  it('calls onDismissError when Dismiss is clicked', async () => {
    const onDismissError = jest.fn();
    render(
      <SyncControl
        onSync={() => {}}
        syncInProgress={false}
        syncError="Some error"
        syncPartialSuccess={false}
        onDismissError={onDismissError}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(onDismissError).toHaveBeenCalledTimes(1);
  });
});
