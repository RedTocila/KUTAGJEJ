/**
 * Shared API origin resolution for server and browser.
 *
 * Browser / public clients always talk to the Next app (port 3000 in dev),
 * which rewrites `/api` → the Express backend. Never call :5001 from the browser.
 * Server Components may use API_URL to reach Express directly.
 */
const PUBLIC_DEV_ORIGIN = 'http://localhost:3000';
const INTERNAL_API_ORIGIN = 'http://localhost:5001';

export function getApiOrigin(): string {
  const fromServer = typeof process !== 'undefined' ? process.env.API_URL : undefined;
  const fromPublic = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined;

  // Browser: always same-origin or the public Next URL (never the internal backend port).
  if (typeof window !== 'undefined') {
    const publicOrigin = fromPublic?.trim();
    if (publicOrigin) return publicOrigin.replace(/\/$/, '');
    return '';
  }

  // Server: prefer internal backend, then public Next proxy, then defaults.
  const origin = (fromServer?.trim() || fromPublic?.trim() || INTERNAL_API_ORIGIN).replace(/\/$/, '');
  return origin || PUBLIC_DEV_ORIGIN;
}

/** Full API URL including `/api` prefix. Path should start with `/` (e.g. `/auth/login`). */
export function getApiUrl(path = ''): string {
  const suffix = path.startsWith('/') ? path : path ? `/${path}` : '';
  const origin = getApiOrigin();
  return `${origin}/api${suffix}`;
}
