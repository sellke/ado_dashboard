import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

const CREDENTIAL_KEY = 'default';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const ENCRYPTION_KEY_HEX_LENGTH = 64;
const PLACEHOLDER_PAT = 'your_ado_pat_here';

let cachedPat: string | null | undefined;

const adoCredential = (
  prisma as unknown as {
    adoCredential: {
      findUnique: (args: {
        where: { key: string };
        select?: { patHint?: true };
      }) => Promise<{ encryptedPat: string; patHint?: string | null } | null>;
      upsert: (args: {
        where: { key: string };
        create: { key: string; encryptedPat: string; patHint: string };
        update: { encryptedPat: string; patHint: string };
      }) => Promise<unknown>;
    };
  }
).adoCredential;

export class CredentialEncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CredentialEncryptionError';
  }
}

function getEncryptionKey(): Buffer {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY?.trim();
  if (!key || key.length !== ENCRYPTION_KEY_HEX_LENGTH || !/^[0-9a-fA-F]+$/.test(key)) {
    throw new CredentialEncryptionError(
      'Missing or invalid CREDENTIAL_ENCRYPTION_KEY. Expected a 32-byte hex value.'
    );
  }
  return Buffer.from(key, 'hex');
}

export function isPlaceholderPat(pat: string | null | undefined): boolean {
  const normalized = pat?.trim().toLowerCase() ?? '';
  return normalized === PLACEHOLDER_PAT || normalized.includes('your_ado');
}

export function getEnvPat(): string | null {
  const pat = process.env.ADO_PAT?.trim();
  if (!pat || isPlaceholderPat(pat)) {
    return null;
  }
  return pat;
}

export function encryptPat(pat: string): string {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(pat, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, ciphertext].map((part) => part.toString('base64')).join(':');
}

export function decryptPat(encryptedPat: string): string {
  const [ivBase64, authTagBase64, ciphertextBase64] = encryptedPat.split(':');
  if (!ivBase64 || !authTagBase64 || !ciphertextBase64) {
    throw new CredentialEncryptionError('Stored ADO credential is malformed.');
  }

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivBase64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function invalidatePatCache(): void {
  cachedPat = undefined;
}

export async function getResolvedPat(): Promise<string | null> {
  if (cachedPat !== undefined) {
    return cachedPat;
  }

  let canCacheFallback = true;
  try {
    const row = await adoCredential.findUnique({ where: { key: CREDENTIAL_KEY } });
    if (row) {
      const decryptedPat = decryptPat(row.encryptedPat);
      cachedPat = decryptedPat;
      return decryptedPat;
    }
  } catch {
    // If DB/decrypt is unhealthy, allow env bootstrap but do not pin that fallback in cache.
    canCacheFallback = false;
  }

  const envPat = getEnvPat();
  if (canCacheFallback) {
    cachedPat = envPat;
  }
  return envPat;
}

export async function savePat(pat: string): Promise<{ patHint: string }> {
  const trimmedPat = pat.trim();
  const encryptedPat = encryptPat(trimmedPat);
  const patHint = trimmedPat.slice(-4);

  await adoCredential.upsert({
    where: { key: CREDENTIAL_KEY },
    create: { key: CREDENTIAL_KEY, encryptedPat, patHint },
    update: { encryptedPat, patHint },
  });
  invalidatePatCache();

  return { patHint };
}

export async function getStoredCredentialHint(): Promise<string | null> {
  try {
    const row = await adoCredential.findUnique({
      where: { key: CREDENTIAL_KEY },
      select: { patHint: true },
    });
    return row?.patHint ?? null;
  } catch {
    return null;
  }
}

export async function isCredentialConfigured(): Promise<boolean> {
  return Boolean(await getResolvedPat());
}
