/** Canonical public origin for shareable links (never localhost). */
export const CANONICAL_SITE_ORIGIN = 'https://kutagjej.al';

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

function originFromRaw(raw: string | undefined | null): string | null {
  const trimmed = String(raw || '').trim().replace(/\/$/, '');
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.includes('http') ? trimmed : `https://${trimmed}`);
    if (isLocalHostname(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Origin friends should open. Uses the current public host when available;
 * falls back to the canonical domain — never localhost.
 */
export function getPublicSiteOrigin(): string {
  if (typeof window !== 'undefined' && !isLocalHostname(window.location.hostname)) {
    return window.location.origin;
  }
  return originFromRaw(process.env.NEXT_PUBLIC_SITE_URL) || CANONICAL_SITE_ORIGIN;
}

export function getSiteURL(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/';
  // Make sure to include `https://` when not localhost.
  url = url.includes('http') ? url : `https://${url}`;
  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`;
  return url;
}
