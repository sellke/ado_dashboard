import { prisma } from '@/lib/prisma';
import { AdoRequestError, isAdoAuthError, resolveAdoEnv } from '@/lib/sync/ado-client';
import { invalidatePatCache } from '@/lib/sync/credentials';

/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    adoCredential: {
      findUnique: jest.fn(),
    },
  },
}));

const prismaMock = prisma as unknown as {
  adoCredential: {
    findUnique: jest.Mock;
  };
};

const ORIGINAL_ENV = process.env;

describe('ADO auth error classification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidatePatCache();
    process.env = { ...ORIGINAL_ENV, ADO_ORG: 'Operations-Innovation' };
    delete process.env.ADO_PAT;
    prismaMock.adoCredential.findUnique.mockResolvedValue(null);
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it.each([302, 401, 403])('classifies status %i as an ADO auth error', (status) => {
    expect(isAdoAuthError(new AdoRequestError('ADO request failed', status))).toBe(true);
  });

  it('does not classify non-auth ADO statuses as auth errors', () => {
    expect(isAdoAuthError(new AdoRequestError('ADO service unavailable', 503))).toBe(false);
  });

  it('classifies embedded ADO auth statuses in sync summary messages', () => {
    expect(
      isAdoAuthError(
        new Error('Iterations: ADO team iterations request failed (401 Unauthorized).')
      )
    ).toBe(true);
  });

  it('classifies missing credential resolution as an auth error', async () => {
    await expect(resolveAdoEnv()).rejects.toThrow(/Missing ADO_PAT credential/);

    await resolveAdoEnv().catch((err) => {
      expect(isAdoAuthError(err)).toBe(true);
    });
  });

  it('treats placeholder env PAT as missing credentials', async () => {
    process.env.ADO_PAT = 'your_ado_pat_here';

    await expect(resolveAdoEnv()).rejects.toThrow(/Missing ADO_PAT credential/);
  });
});
