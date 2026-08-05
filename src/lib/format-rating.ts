/** Formats a 0–5 rating: whole numbers without ".0" (4 not 4.0), one decimal when needed (4.5). */
export function formatRatingDisplay(
  value: number | null | undefined,
  emptyFallback = '0',
): string {
  if (value == null || !Number.isFinite(value)) return emptyFallback;
  const normalized = Math.round(value * 10) / 10;
  if (Number.isInteger(normalized)) return String(normalized);
  return normalized.toFixed(1);
}
