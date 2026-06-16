/**
 * @jest-environment node
 */

import { GET, POST } from '@/app/api/ado/credentials/route';
import { probeAdoPat } from '@/lib/sync/ado-client';
import {
  CredentialEncryptionError,
  getStoredCredentialHint,
  isCredentialConfigured,
  savePat,
} from '@/lib/sync/credentials';

jest.mock('@/lib/sync/credentials', () => ({
  CredentialEncryptionError: class CredentialEncryptionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'CredentialEncryptionError';
    }
  },
  getStoredCredentialHint: jest.fn(),
  isCredentialConfigured: jest.fn(),
  savePat: jest.fn(),
}));

jest.mock('@/lib/sync/ado-client', () => ({
  probeAdoPat: jest.fn(),
}));

const configuredMock = jest.mocked(isCredentialConfigured);
const hintMock = jest.mocked(getStoredCredentialHint);
const savePatMock = jest.mocked(savePat);
const probeMock = jest.mocked(probeAdoPat);
const ORIGINAL_ENV = process.env;
const VALID_PAT = 'abcdefghijklmnopqrstuvwxyz1234567890';

function postRequest(body: unknown) {
  return new Request('http://localhost/api/ado/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/ado/credentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, ADO_ORG: 'Operations-Innovation' };
    configuredMock.mockResolvedValue(true);
    hintMock.mockResolvedValue('7890');
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('GET returns configured status, org, and optional hint without PAT value', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ configured: true, org: 'Operations-Innovation', patHint: '7890' });
    expect(JSON.stringify(data)).not.toContain(VALID_PAT);
  });

  it('POST rejects missing or short PAT without probing or saving', async () => {
    const res = await POST(postRequest({ pat: 'short' }));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.errorCode).toBe('VALIDATION_ERROR');
    expect(probeMock).not.toHaveBeenCalled();
    expect(savePatMock).not.toHaveBeenCalled();
  });

  it('POST returns MISSING_ORG when org is unset', async () => {
    process.env.ADO_ORG = '';

    const res = await POST(postRequest({ pat: VALID_PAT }));
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.errorCode).toBe('MISSING_ORG');
    expect(probeMock).not.toHaveBeenCalled();
  });

  it('POST rejects expired or invalid PAT without saving', async () => {
    probeMock.mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });

    const res = await POST(postRequest({ pat: VALID_PAT }));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.errorCode).toBe('AUTH_REJECTED');
    expect(probeMock).toHaveBeenCalledWith(VALID_PAT, 'Operations-Innovation');
    expect(savePatMock).not.toHaveBeenCalled();
    expect(JSON.stringify(data)).not.toContain(VALID_PAT);
  });

  it('POST maps encryption errors to ENCRYPTION_UNAVAILABLE', async () => {
    probeMock.mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    savePatMock.mockRejectedValue(new CredentialEncryptionError('missing key'));

    const res = await POST(postRequest({ pat: VALID_PAT }));
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.errorCode).toBe('ENCRYPTION_UNAVAILABLE');
    expect(JSON.stringify(data)).not.toContain(VALID_PAT);
  });

  it('POST maps non-encryption save failures to SAVE_FAILED', async () => {
    probeMock.mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    savePatMock.mockRejectedValue(new Error('database write failed'));

    const res = await POST(postRequest({ pat: VALID_PAT }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.errorCode).toBe('SAVE_FAILED');
    expect(JSON.stringify(data)).not.toContain(VALID_PAT);
  });

  it('POST validates and saves a valid PAT without echoing it', async () => {
    probeMock.mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    savePatMock.mockResolvedValue({ patHint: '7890' });

    const res = await POST(postRequest({ pat: `  ${VALID_PAT}  ` }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(probeMock).toHaveBeenCalledWith(VALID_PAT, 'Operations-Innovation');
    expect(savePatMock).toHaveBeenCalledWith(VALID_PAT);
    expect(data).toEqual({ success: true, configured: true, patHint: '7890' });
    expect(JSON.stringify(data)).not.toContain(VALID_PAT);
  });
});
