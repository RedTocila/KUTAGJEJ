/**
 * Map app currency codes to ISO 4217 for JSON-LD / rich results.
 * App storage uses `LEK`; Google requires `ALL` for Albanian lek.
 */
export function schemaPriceCurrency(currency: string | null | undefined, fallback = 'EUR'): string {
  const raw = String(currency || '')
    .trim()
    .toUpperCase();
  if (raw === 'LEK' || raw === 'ALL') return 'ALL';
  if (raw === 'EUR') return 'EUR';
  if (raw === 'USD') return 'USD';
  return fallback;
}
