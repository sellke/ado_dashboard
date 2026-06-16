import { prisma } from '@/lib/prisma';
import {
  CredentialEncryptionError,
  decryptPat,
  encryptPat,
  getResolvedPat,
  invalidatePatCache,
  isPlaceholderPat,
  savePat,
} from '@/lib/sync/credentials';

/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    adoCredential: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const prismaMock = prisma as unknown as {
  adoCredential: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
  };
};

const VALID_KEY = 'a'.repeat(64);
const ORIGINAL_ENV = process.env;

describe('ADO credential store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidatePatCache();
    process.env = { ...ORIGINAL_ENV, CREDENTIAL_ENCRYPTION_KEY: VALID_KEY };
    delete process.env.ADO_PAT;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('round-trips PAT encryption without storing the raw value', () => {
    const encrypted = encryptPat('valid-secret-pat-value');

    expect(encrypted).not.toContain('valid-secret-pat-value');
    expect(encrypted.split(':')).toHaveLength(3);
    expect(decryptPat(encrypted)).toBe('valid-secret-pat-value');
  });

  it('rejects missing or malformed encryption keys', () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'short';

    expect(() => encryptPat('valid-secret-pat-value')).toThrow(CredentialEncryptionError);
  });

  it('resolves DB PAT before env PAT', async () => {
    const encryptedPat = encryptPat('db-pat-value');
    process.env.ADO_PAT = 'env-pat-value';
    prismaMock.adoCredential.findUnique.mockResolvedValue({ encryptedPat });

    await expect(getResolvedPat()).resolves.toBe('db-pat-value');
  });

  it('uses env PAT as bootstrap when no DB credential exists', async () => {
    process.env.ADO_PAT = 'env-pat-value';
    prismaMock.adoCredential.findUnique.mockResolvedValue(null);

    await expect(getResolvedPat()).resolves.toBe('env-pat-value');
  });

  it('treats placeholder env PAT as unconfigured', async () => {
    process.env.ADO_PAT = 'your_ado_pat_here';
    prismaMock.adoCredential.findUnique.mockResolvedValue(null);

    await expect(getResolvedPat()).resolves.toBeNull();
    expect(isPlaceholderPat(process.env.ADO_PAT)).toBe(true);
  });

  it('invalidates cached env fallback after saving a PAT', async () => {
    process.env.ADO_PAT = 'env-pat-value';
    prismaMock.adoCredential.findUnique.mockResolvedValueOnce(null);

    await expect(getResolvedPat()).resolves.toBe('env-pat-value');

    let persistedEncryptedPat = '';
    prismaMock.adoCredential.upsert.mockImplementation(async ({ create }) => {
      persistedEncryptedPat = create.encryptedPat;
      return create;
    });

    await expect(savePat('saved-pat-value')).resolves.toEqual({ patHint: 'alue' });
    prismaMock.adoCredential.findUnique.mockResolvedValueOnce({
      encryptedPat: persistedEncryptedPat,
    });

    await expect(getResolvedPat()).resolves.toBe('saved-pat-value');
  });

  it('does not pin env fallback in cache when DB resolution fails', async () => {
    process.env.ADO_PAT = 'env-pat-value';
    prismaMock.adoCredential.findUnique
      .mockRejectedValueOnce(new Error('db unavailable'))
      .mockResolvedValueOnce({ encryptedPat: encryptPat('recovered-db-pat') });

    await expect(getResolvedPat()).resolves.toBe('env-pat-value');
    await expect(getResolvedPat()).resolves.toBe('recovered-db-pat');
  });
});
