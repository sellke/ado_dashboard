import { notifications } from '@mantine/notifications';
import { AdoCredentialsModal } from '@/components/Dashboard/AdoCredentialsModal';
import {
  act,
  fireEvent,
  renderWithNotifications as render,
  screen,
  userEvent,
  waitFor,
} from '@/test-utils';

const VALID_PAT = 'abcdefghijklmnopqrstuvwxyz1234567890';

describe('AdoCredentialsModal', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    act(() => {
      notifications.clean();
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ configured: true, org: 'Operations-Innovation', patHint: '7890' }),
    });
  });

  afterEach(() => {
    act(() => {
      notifications.clean();
    });
    global.fetch = originalFetch;
  });

  it('loads credential status without exposing the full PAT', async () => {
    render(<AdoCredentialsModal opened onClose={jest.fn()} />);

    expect(await screen.findByDisplayValue('Operations-Innovation')).toBeInTheDocument();
    expect(screen.getByText(/Current saved PAT ends in 7890/i)).toBeInTheDocument();
    expect(screen.queryByText(VALID_PAT)).not.toBeInTheDocument();
  });

  it('keeps the modal open and shows inline error when ADO rejects the PAT', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 422,
          json: () => Promise.resolve({ errorCode: 'AUTH_REJECTED' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ configured: true, org: 'Operations-Innovation', patHint: '7890' }),
      });
    });

    render(<AdoCredentialsModal opened onClose={jest.fn()} />);

    await screen.findByDisplayValue('Operations-Innovation');
    fireEvent.change(await screen.findByTestId('ado-pat-input'), {
      target: { value: VALID_PAT },
    });
    await user.click(screen.getByRole('button', { name: /save & validate/i }));

    expect(await screen.findByText(/PAT rejected by Azure DevOps/i)).toBeInTheDocument();
    expect(screen.getByText(/Update ADO credentials/i)).toBeInTheDocument();
  });

  it('closes and shows success feedback when save succeeds', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onSaved = jest.fn();
    global.fetch = jest.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, configured: true, patHint: '7890' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ configured: true, org: 'Operations-Innovation', patHint: '7890' }),
      });
    });

    render(<AdoCredentialsModal opened onClose={onClose} onSaved={onSaved} />);

    await screen.findByDisplayValue('Operations-Innovation');
    fireEvent.change(await screen.findByTestId('ado-pat-input'), {
      target: { value: ` ${VALID_PAT} ` },
    });
    await user.click(screen.getByRole('button', { name: /save & validate/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/ado/credentials',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ pat: VALID_PAT, org: 'Operations-Innovation' }),
        })
      );
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText(/new PAT will be used on the next sync/i)).toBeInTheDocument();
  });
});
