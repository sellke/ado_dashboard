/**
 * @jest-environment node
 */

import { POST } from '@/app/api/sync/ado/route';
import { runSync } from '@/lib/sync/orchestrator';

jest.mock('@/lib/sync/orchestrator', () => ({
  runSync: jest.fn(),
}));

const runSyncMock = jest.mocked(runSync);

describe('POST /api/sync/ado auth errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds ADO_AUTH_FAILURE when sync summary contains an ADO auth status', async () => {
    runSyncMock.mockResolvedValue({
      syncLogId: 'sync-1',
      summary: {
        status: 'Failed',
        errorMessage: 'Iterations: ADO team iterations request failed (401 Unauthorized).',
        workstreams: [],
        totals: { itemsFetched: 0, itemsCreated: 0, itemsUpdated: 0 },
        currentSprintId: null,
        currentSprintPath: null,
        sprintsSynced: 0,
      },
    });

    const res = await POST(
      new Request('http://localhost/api/sync/ado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType: 'Full' }),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(false);
    expect(data.errorCode).toBe('ADO_AUTH_FAILURE');
  });
});
