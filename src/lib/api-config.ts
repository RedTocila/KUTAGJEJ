/**
 * Shared API origin resolution for server and browser.
 *
 * Browser always uses the Next app (port 3000 in dev) — never the internal Express port.
 * Next / Vercel rewrites `/api` → Express. Server Components talk to Express directly (API_URL or default).
 */
const PUBLIC_DEV_ORIGIN = 'http://localhost:3000';
const INTERNAL_API_ORIGIN = 'http://localhost:5001';

function normalizeOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/$/, '');
}

export function getApiOrigin(): string {
  const fromServer = typeof process !== 'undefined' ? process.env.API_URL : undefined;
  const fromPublic = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined;

  // Browser: prefer same-origin so Vercel `/api` → Express routing always works.
  // Only honor NEXT_PUBLIC_API_URL when it matches the page origin (e.g. local :3000).
  // A stale/cross-origin value (old preview host) causes CORS/network failures in production.
  if (typeof window !== 'undefined') {
    const publicOrigin = normalizeOrigin(fromPublic);
    if (publicOrigin && publicOrigin === window.location.origin) {
      return publicOrigin;
    }
    return '';
  }

  // Server: Express only — do not use NEXT_PUBLIC (:3000) or rewrites loop.
  const origin = (normalizeOrigin(fromServer) || INTERNAL_API_ORIGIN).replace(/\/$/, '');
  return origin || PUBLIC_DEV_ORIGIN;
}

/** Full API URL including `/api` prefix. Path should start with `/` (e.g. `/auth/login`). */
export function getApiUrl(path = ''): string {
  const suffix = path.startsWith('/') ? path : path ? `/${path}` : '';
  const origin = getApiOrigin();
  return `${origin}/api${suffix}`;
}
