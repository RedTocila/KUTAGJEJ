/** Pure formatting helpers used by the public listing cards. */

import { OKAZION_ACCENT } from '@/lib/home-categories';

/** Price/salary color: OKAZION red, else Premium amber, else primary. */
export function listingPriceAccentColor(flags: {
  isPremium?: boolean | null;
  isOkazion?: boolean | null;
}): string {
  if (flags.isOkazion) return OKAZION_ACCENT;
  if (flags.isPremium) return 'warning.main';
  return 'primary.main';
}

export function formatPrice(value: number | null | undefined, currency: string | null | undefined): string {
  if (value === null || value === undefined) return 'Me marrëveshje';
  const formatted = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value);
  if (currency === 'EUR') return `${formatted} €`;
  if (currency === 'LEK') return `${formatted} L`;
  return formatted;
}

export function formatKilometers(value: number): string {
  return `${new Intl.NumberFormat('en-GB').format(value)} km`;
}

export function relativeAlbanianDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Tani';
  if (minutes < 60) return `${minutes} min më parë`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} orë më parë`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ditë më parë`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} javë më parë`;
  return date.toLocaleDateString('sq-AL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calendarDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Relative posted label for listing detail pages (`Postuar sot` / `2 ditë më parë`). */
export function postedLabelSq(iso: string): string {
  const d = new Date(iso);
  if (calendarDayKey(d) === calendarDayKey(new Date())) return 'Postuar sot';
  return relativeAlbanianDate(iso);
}

export function findOptionLabel<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string | null | undefined,
): string {
  if (!value) return '—';
  return options.find((option) => option.value === value)?.label ?? value;
}

/**
 * Minimal opening hours for business cards — primary schedule only, one short line.
 */
export function formatBusinessOpeningHoursForCard(raw: string): string {
  const normalized = raw.replace(/\s+/g, ' ').trim().replace(/\bDiele\b/gi, 'Dielë');
  const primary = normalized.split('·')[0]?.trim() ?? normalized;
  return primary.replace(/,\s*.*/, '').trim();
}

export function pseudoRandomMetric(seed: string, min: number, span: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return min + (hash % Math.max(1, span));
}
