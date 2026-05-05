/** Pure formatting helpers used by the public listing cards. */

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

export function findOptionLabel<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string | null | undefined,
): string {
  if (!value) return '—';
  return options.find((option) => option.value === value)?.label ?? value;
}
