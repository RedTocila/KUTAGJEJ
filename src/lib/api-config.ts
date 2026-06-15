/**
 * Shared API origin resolution for server and browser.
 * Prefers internal API_URL on the server, falls back to NEXT_PUBLIC_API_URL.
 */
export function getApiOrigin(): string {
  const fromServer = typeof process !== 'undefined' ? process.env.API_URL : undefined;
  const fromPublic = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined;
  const origin = (fromServer?.trim() || fromPublic?.trim() || 'http://localhost:5000').replace(/\/$/, '');
  return origin;
}

/** Full API URL including `/api` prefix. Path should start with `/` (e.g. `/auth/login`). */
export function getApiUrl(path = ''): string {
  const suffix = path.startsWith('/') ? path : path ? `/${path}` : '';
  return `${getApiOrigin()}/api${suffix}`;
}
