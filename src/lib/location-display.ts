export type LocationPreposition = 'në' | 'te';

export interface LocationZoneRef {
  name: string;
  slug?: string;
}

/** Zones treated as reference points (landmarks, institutions) → "te". */
const TE_ZONE_SLUGS = new Set([
  'komuna-e-parisit',
  'stacioni-i-trenit',
  'stacioni-trenit',
  '21-dhjetori',
  'myslym-shyri',
  'liqeni-artificial',
  'liqeni-i-thate',
  'universiteti-politeknik',
  'qendra-kinema',
  'sheshi-skenderbej',
  'sheshi-i-flamurit',
]);

const TE_ZONE_PATTERNS: RegExp[] = [
  /^komuna\b/i,
  /^stacioni\b/i,
  /\bstacion\b/i,
  /^liqeni\b/i,
  /^sheshi\b/i,
  /^universiteti\b/i,
  /^spitali\b/i,
  /^qendra\b/i,
  /^pallati\b/i,
  /^rruga\b/i,
  /^bulevardi\b/i,
  /^ura\b/i,
  /^kisha\b/i,
  /^xhamia\b/i,
  /^teatri\b/i,
  /^stadiumi\b/i,
  /^terminali\b/i,
  /^\d+\s/, // p.sh. 21 Dhjetori
  /^myslym\s+shyri/i,
];

/** Trim stray punctuation from city/zone labels before display. */
export function cleanLocationPart(value: string): string {
  return value.trim().replace(/[,;.\s]+$/g, '').trim();
}

/** Decide whether a zone uses "te" (reference point) or "në" (territory). */
export function getZonePreposition(zoneName: string, zoneSlug?: string): LocationPreposition {
  const slug = zoneSlug?.trim().toLowerCase();
  if (slug && TE_ZONE_SLUGS.has(slug)) return 'te';

  const normalized = cleanLocationPart(zoneName).toLowerCase();
  if (TE_ZONE_PATTERNS.some((pattern) => pattern.test(normalized))) return 'te';

  return 'në';
}

export function formatCityLocationPhrase(cityName: string): string {
  return `në ${cleanLocationPart(cityName)}`;
}

export function formatZoneCityLocationPhrase(zoneName: string, cityName: string, zoneSlug?: string): string {
  const zone = cleanLocationPart(zoneName);
  const city = cleanLocationPart(cityName);
  const prep = getZonePreposition(zone, zoneSlug);
  return `${prep} ${zone}, ${city}`;
}

/**
 * Full browse/SEO location phrase with correct Albanian prepositions.
 * Examples:
 * - në Tiranë
 * - në Lundër, Tiranë
 * - te Komuna e Parisit, Tiranë
 * - në Lundër, te Komuna e Parisit, Tiranë
 */
export function formatBrowseLocationPhrase(zones: LocationZoneRef[], cityName: string): string {
  const city = cleanLocationPart(cityName);
  if (!zones.length) return formatCityLocationPhrase(city);

  if (zones.length === 1) {
    return formatZoneCityLocationPhrase(zones[0].name, city, zones[0].slug);
  }

  const zoneParts = zones.map((zone) => {
    const name = cleanLocationPart(zone.name);
    const prep = getZonePreposition(name, zone.slug);
    return `${prep} ${name}`;
  });

  return `${zoneParts.join(', ')}, ${city}`;
}

/** Toolbar / input: compact zone + city without prepositions. */
export function formatZoneCitySummary(zoneName: string, cityName: string): string {
  return `${cleanLocationPart(zoneName)} · ${cleanLocationPart(cityName)}`;
}

/** 3-letter uppercase label for compact listing cards (e.g. Tiranë → TIR). */
export function formatCityAbbreviation(cityName: string): string {
  const normalized = cleanLocationPart(cityName)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();
  return normalized.slice(0, 3) || '—';
}
