import { NextResponse } from 'next/server';
import { probeAdoPat } from '@/lib/sync/ado-client';
import {
  CredentialEncryptionError,
  getStoredCredentialHint,
  isCredentialConfigured,
  savePat,
} from '@/lib/sync/credentials';

const MIN_PAT_LENGTH = 20;
const MAX_PAT_LENGTH = 200;
const AUTH_REJECTED_STATUSES = new Set([302, 401, 403]);

function jsonError(status: number, errorCode: string, error: string) {
  return NextResponse.json({ errorCode, error }, { status });
}

export async function GET() {
  const org = process.env.ADO_ORG?.trim() ?? '';
  const [configured, patHint] = await Promise.all([
    isCredentialConfigured(),
    getStoredCredentialHint(),
  ]);

  return NextResponse.json({
    configured,
    org,
    ...(patHint ? { patHint } : {}),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const pat = typeof body?.pat === 'string' ? body.pat.trim() : '';

  if (pat.length < MIN_PAT_LENGTH || pat.length > MAX_PAT_LENGTH) {
    return jsonError(422, 'VALIDATION_ERROR', 'PAT must be between 20 and 200 characters.');
  }

  const org = process.env.ADO_ORG?.trim();
  if (!org) {
    return jsonError(503, 'MISSING_ORG', 'ADO_ORG is not configured.');
  }

  const probe = await probeAdoPat(pat, org).catch(() => null);
  if (!probe) {
    return jsonError(503, 'ADO_UNAVAILABLE', 'Could not validate PAT with Azure DevOps.');
  }

  if (!probe.ok) {
    if (AUTH_REJECTED_STATUSES.has(probe.status)) {
      return jsonError(
        422,
        'AUTH_REJECTED',
        'PAT rejected by Azure DevOps. Check scope and expiration.'
      );
    }

    return jsonError(503, 'ADO_UNAVAILABLE', 'Could not validate PAT with Azure DevOps.');
  }

  try {
    const { patHint } = await savePat(pat);
    return NextResponse.json({ success: true, configured: true, patHint });
  } catch (err) {
    if (err instanceof CredentialEncryptionError) {
      return jsonError(
        503,
        'ENCRYPTION_UNAVAILABLE',
        'CREDENTIAL_ENCRYPTION_KEY is missing or invalid.'
      );
    }

    return jsonError(500, 'SAVE_FAILED', 'Could not save ADO credentials.');
  }
}
