import { cookies } from 'next/headers';
import {
  buildClientCookieString,
  DASHBOARD_SETTINGS_COOKIE_MAX_AGE_SECONDS,
  parseCookieHeader,
  readServerCookie,
  serializeCookieValue,
  setClientCookie,
} from '@/lib/dashboard/settings-cookies';

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('dashboard settings cookies', () => {
  beforeEach(() => {
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0]?.trim();
      if (name) {
        document.cookie = `${name}=; Max-Age=0; Path=/`;
      }
    });
    jest.mocked(cookies).mockReset();
  });

  it('serializes JSON values and parses them back from a cookie header', () => {
    const raw = JSON.stringify({
      includedWorkstreamIds: ['ws-1', 'ws/special'],
      updatedAt: '2026-06-17T00:00:00.000Z',
    });
    const header = `other=value; scope=${serializeCookieValue(raw)}`;

    expect(parseCookieHeader(header, 'scope')).toBe(raw);
  });

  it('builds client cookie strings with dashboard defaults', () => {
    expect(buildClientCookieString('scope', 'value', { secure: false })).toBe(
      `scope=value; Path=/; SameSite=Lax; Max-Age=${DASHBOARD_SETTINGS_COOKIE_MAX_AGE_SECONDS}`
    );
    expect(buildClientCookieString('scope', 'value', { secure: true })).toContain('; Secure');
  });

  it('returns null for missing or malformed cookie values', () => {
    expect(parseCookieHeader('other=value', 'scope')).toBeNull();
    expect(parseCookieHeader('scope=%E0%A4%A', 'scope')).toBeNull();
  });

  it('writes browser cookies using encoded values and default attributes', () => {
    setClientCookie('scope', JSON.stringify({ includedWorkstreamIds: ['ws-1'] }), {
      secure: false,
    });

    expect(parseCookieHeader(document.cookie, 'scope')).toBe(
      JSON.stringify({ includedWorkstreamIds: ['ws-1'] })
    );
  });

  it('reads cookies through the Next server cookie store', async () => {
    jest.mocked(cookies).mockResolvedValue({
      get: jest.fn(() => ({ value: 'stored-value' })),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await expect(readServerCookie('scope')).resolves.toBe('stored-value');
  });
});
