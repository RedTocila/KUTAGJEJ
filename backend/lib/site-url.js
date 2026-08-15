const CANONICAL_FRONTEND_URL = 'https://kutagjej.al';

function isLocalHostname(hostname) {
  const host = String(hostname || '').toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    host.endsWith('.local')
  );
}

function normalizeBaseUrl(raw) {
  if (!raw) return null;
  const url = String(raw).trim().replace(/\/$/, '');
  if (!url) return null;
  return url.includes('http') ? url : `https://${url}`;
}

function toCanonicalPublicUrl(url) {
  try {
    const parsed = new URL(url);
    if (isLocalHostname(parsed.hostname)) return null;
    const host = parsed.hostname.toLowerCase();
    if (host === 'kutagjej.al' || host === 'www.kutagjej.al' || host.endsWith('.vercel.app')) {
      return CANONICAL_FRONTEND_URL;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function getFrontendBaseUrl() {
  const candidates = [process.env.FRONTEND_URL, process.env.NEXT_PUBLIC_SITE_URL, process.env.PUBLIC_SITE_URL];
  for (const raw of candidates) {
    const url = normalizeBaseUrl(raw);
    if (!url) continue;
    const canonical = toCanonicalPublicUrl(url);
    if (canonical) return canonical;
  }
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    return CANONICAL_FRONTEND_URL;
  }
  return 'http://localhost:3000';
}

module.exports = {
  CANONICAL_FRONTEND_URL,
  isLocalHostname,
  getFrontendBaseUrl,
};
