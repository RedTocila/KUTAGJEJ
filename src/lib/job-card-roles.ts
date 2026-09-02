const ROLE_SPLIT_RE = /\s*(?:\/|,|;|\+|\||\band\b|\bdhe\b)\s*/i;

const GENERIC_ROLE_LABELS = new Set(['punë', 'pune', 'vend pune', 'pozicion', 'pozicioni', 'ofertë', 'oferte']);

export type JobCardRolesSource = {
  requiredRoles?: string[] | null;
  title: string;
  description?: string | null;
};

function capitalizeRole(role: string): string {
  const trimmed = role.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function splitRoleCandidates(raw: string): string[] {
  return raw
    .split(ROLE_SPLIT_RE)
    .map((role) => role.replace(/\s+/g, ' ').trim())
    .filter((role) => role.length >= 2 && role.length <= 80);
}

function normalizeRoleList(raw?: string[] | null): string[] {
  if (!raw?.length) return [];
  const seen = new Set<string>();
  const roles: string[] = [];
  for (const entry of raw) {
    for (const role of splitRoleCandidates(String(entry ?? ''))) {
      const key = role.toLowerCase();
      if (seen.has(key) || GENERIC_ROLE_LABELS.has(key)) continue;
      seen.add(key);
      roles.push(capitalizeRole(role));
    }
  }
  return roles.slice(0, 8);
}

function cleanRoleListSegment(segment: string): string {
  return segment.split(/\s+në\s+/i)[0]?.trim() ?? segment.trim();
}

function extractRolesFromBlob(blob: string): string[] {
  const text = String(blob ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return [];

  const patterns = [
    /pozitat e hapura:\s*([^•\n.]+)/i,
    /(?:pozicione|role|roles|pozicionet)\s*[:;]\s*([^•\n.]+)/i,
    /(?:k[eë]rkohen|nevojiten|kerkohet)\s*[:;]?\s*([^•\n.]+)/i,
    /k[eë]rkon\s+(?:t[eë]\s+)?pun[eë]soj[eë]\s+([^•\n.]+)/i,
    /(?:open\s+roles?|positions?)\s*[:;]\s*([^•\n.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const roles = normalizeRoleList(splitRoleCandidates(cleanRoleListSegment(match[1])));
    if (roles.length) return roles;
  }

  return [];
}

function extractRolesFromTitle(title: string): string[] {
  const trimmed = String(title ?? '').trim();
  if (!trimmed) return [];

  const roleSegment = trimmed.split(/\s+në\s+/i)[0]?.trim() ?? trimmed;
  const hasSeparator = /[/|+&]|(?:\s+dhe\s+)/i.test(roleSegment);
  if (!hasSeparator) {
    if (roleSegment.length > 50) return [];
    const single = capitalizeRole(roleSegment);
    if (!single || GENERIC_ROLE_LABELS.has(single.toLowerCase())) return [];
    return [single];
  }

  const roles = normalizeRoleList(splitRoleCandidates(roleSegment));
  return roles.length >= 2 ? roles : [];
}

/** Roles for job cards — uses stored requiredRoles, then title/description heuristics for legacy listings. */
export function resolveJobCardRoles(listing: JobCardRolesSource): string[] {
  const fromField = normalizeRoleList(listing.requiredRoles);
  if (fromField.length) return fromField;

  const fromDescription = extractRolesFromBlob(listing.description ?? '');
  if (fromDescription.length) return fromDescription;

  const fromTitle = extractRolesFromTitle(listing.title ?? '');
  if (fromTitle.length) return fromTitle;

  return [];
}
