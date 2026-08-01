/**
 * Shared API origin resolution for server and browser.
 *
 * Browser always uses the Next app (port 3000 in dev) — never the internal Express port.
 * Next rewrites `/api` → Express. Server Components talk to Express directly (API_URL or default).
 */
const PUBLIC_DEV_ORIGIN = 'http://localhost:3000';
const INTERNAL_API_ORIGIN = 'http://localhost:5001';

export function getApiOrigin(): string {
  const fromServer = typeof process !== 'undefined' ? process.env.API_URL : undefined;
  const fromPublic = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined;

  // Browser: same-origin or NEXT_PUBLIC_API_URL (always :3000 in local env).
  if (typeof window !== 'undefined') {
    const publicOrigin = fromPublic?.trim();
    if (publicOrigin) return publicOrigin.replace(/\/$/, '');
    return '';
  }

  // Server: Express only — do not use NEXT_PUBLIC (:3000) or rewrites loop.
  const origin = (fromServer?.trim() || INTERNAL_API_ORIGIN).replace(/\/$/, '');
  return origin || PUBLIC_DEV_ORIGIN;
}

/** Full API URL including `/api` prefix. Path should start with `/` (e.g. `/auth/login`). */
export function getApiUrl(path = ''): string {
  const suffix = path.startsWith('/') ? path : path ? `/${path}` : '';
  const origin = getApiOrigin();
  return `${origin}/api${suffix}`;
}
