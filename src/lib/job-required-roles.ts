/** Sanitize job required-role labels — drop venues, addresses, and title fragments. */

const VENUE_RE =
  /\b(restaurant|restorant|kafe|cafe|sweet|hotel|piceri|bakeri|pasticeri|lounge|bistro|grill|pizzeria|piceria|gostia)\b/i;
const LOCATION_PREFIX_RE = /^\s*(e\s+)?(n[eë]|ne|in|at|p[eë]r)\s+/i;
const ADDRESS_RE = /\b(rruga|rr\.|sheshi|bulevard|adresa|tel|telefon|whatsapp|viber)\b/i;

export function cleanJobRoleSegment(segment: string): string {
  let t = String(segment ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  t = t.replace(/^e\s+/i, '').trim();
  t = t.replace(/\s+(n[eë]|ne|in|at)\s+.+$/i, '').trim();
  t = t.replace(/\s*[-–—]\s*.+$/, '').trim();
  return t;
}

export function isPlausibleJobRole(role: string): boolean {
  const t = cleanJobRoleSegment(role);
  if (!t || t.length < 2 || t.length > 48) return false;
  if (LOCATION_PREFIX_RE.test(t)) return false;
  if (VENUE_RE.test(t)) return false;
  if (ADDRESS_RE.test(t)) return false;
  if (/^[-–—.,;:]+$/.test(t)) return false;
  return true;
}

export function sanitizeRequiredRoles(raw?: string[] | null): string[] {
  const items = raw ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const cleaned = cleanJobRoleSegment(item);
    if (!isPlausibleJobRole(cleaned)) continue;
    const key = cleaned.toLocaleLowerCase('sq-AL');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= 8) break;
  }
  return out;
}

export function inferRequiredRolesFromTitle(title?: string | null): string[] {
  const raw = String(title ?? '').trim();
  if (!raw) return [];

  let t = raw
    .replace(
      /^[\s\S]*?\b(pozita(?:t)?|pozicion(?:et)?|role|konkurset|kerkohen|kërkohen)\s*(?:të|te|e)?\s*/i,
      '',
    )
    .trim();
  if (t.length > 80) {
    const dash = t.match(/\s[-–—]\s*(.+)$/);
    if (dash?.[1] && dash[1].length < t.length) t = dash[1].trim();
  }

  const strongSplit = sanitizeRequiredRoles(
    t.split(/\s*(?:\/|\+|\||(?:\s+dhe\s+))\s*/i).filter(Boolean),
  );
  if (strongSplit.length >= 2) return strongSplit;

  const commaSplit = sanitizeRequiredRoles(t.split(/\s*,\s*/).filter(Boolean));
  if (commaSplit.length >= 2) return commaSplit;

  return [];
}
