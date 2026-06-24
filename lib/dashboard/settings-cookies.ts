export const DASHBOARD_SETTINGS_COOKIE_PATH = '/';
export const DASHBOARD_SETTINGS_COOKIE_SAME_SITE = 'Lax';
export const DASHBOARD_SETTINGS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export interface DashboardSettingsCookieOptions {
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  maxAgeSeconds?: number;
  secure?: boolean;
}

export function shouldUseSecureCookies(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function serializeCookieValue(value: string): string {
  return encodeURIComponent(value);
}

function decodeCookieValue(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function parseCookieHeader(header: string | null | undefined, name: string): string | null {
  if (!header) {
    return null;
  }

  const prefix = `${name}=`;
  const cookie = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  return decodeCookieValue(cookie.slice(prefix.length));
}

export function buildClientCookieString(
  name: string,
  value: string,
  options: DashboardSettingsCookieOptions = {}
): string {
  const path = options.path ?? DASHBOARD_SETTINGS_COOKIE_PATH;
  const sameSite = options.sameSite ?? DASHBOARD_SETTINGS_COOKIE_SAME_SITE;
  const maxAgeSeconds = options.maxAgeSeconds ?? DASHBOARD_SETTINGS_COOKIE_MAX_AGE_SECONDS;
  const secure = options.secure ?? shouldUseSecureCookies();

  return [
    `${name}=${serializeCookieValue(value)}`,
    `Path=${path}`,
    `SameSite=${sameSite}`,
    `Max-Age=${maxAgeSeconds}`,
    secure ? 'Secure' : null,
  ]
    .filter(Boolean)
    .join('; ');
}

export function setClientCookie(
  name: string,
  value: string,
  options?: DashboardSettingsCookieOptions
): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = buildClientCookieString(name, value, options);
}

export async function readServerCookie(name: string): Promise<string | null> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value ?? null;
}
