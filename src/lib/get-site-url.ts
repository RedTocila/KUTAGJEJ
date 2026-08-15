/** Canonical public origin for shareable links (never localhost / vercel.app). */
export const CANONICAL_SITE_HOST = 'kutagjej.al';
export const CANONICAL_SITE_ORIGIN = `https://${CANONICAL_SITE_HOST}`;

export function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    host.endsWith('.local')
  );
}

function isVercelAppHostname(hostname: string): boolean {
  return hostname.toLowerCase().endsWith('.vercel.app');
}

function withTrailingSlash(origin: string): string {
  return origin.endsWith('/') ? origin : `${origin}/`;
}

/** Map www / Vercel aliases onto the custom domain. */
function toCanonicalOrigin(hostname: string): string | null {
  const host = hostname.toLowerCase();
  if (isLocalHostname(host)) return null;
  if (host === CANONICAL_SITE_HOST || host === `www.${CANONICAL_SITE_HOST}` || isVercelAppHostname(host)) {
    return CANONICAL_SITE_ORIGIN;
  }
  return `https://${host}`;
}

function originFromRaw(raw: string | undefined | null): string | null {
  const trimmed = String(raw || '').trim().replace(/\/$/, '');
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.includes('http') ? trimmed : `https://${trimmed}`);
    return toCanonicalOrigin(url.hostname);
  } catch {
    return null;
  }
}

/**
 * Origin friends should open. Uses the current public host when available;
 * falls back to the canonical domain — never localhost.
 */
export function getPublicSiteOrigin(): string {
  if (typeof window !== 'undefined') {
    const fromWindow = toCanonicalOrigin(window.location.hostname);
    if (fromWindow) return fromWindow;
  }
  return originFromRaw(process.env.NEXT_PUBLIC_SITE_URL) || CANONICAL_SITE_ORIGIN;
}

export function getSiteURL(): string {
  const fromEnv = originFromRaw(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromEnv) return withTrailingSlash(fromEnv);

  const isLocalDev = !process.env.VERCEL && process.env.NODE_ENV !== 'production';
  if (isLocalDev) return 'http://localhost:3000/';

  return withTrailingSlash(CANONICAL_SITE_ORIGIN);
}
