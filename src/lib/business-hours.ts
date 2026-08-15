import { BUSINESS_DAY_LABELS } from '@/lib/business-constants';

const ALBANIA_TZ = 'Europe/Tirane';
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const WEEKDAY_TO_MONDAY0: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export type BusinessHourRow = {
  dayOfWeek: number;
  closed?: boolean;
  open?: string | null;
  close?: string | null;
};

export function parseMinutes(hhmm: string | null | undefined): number | null {
  const m = String(hhmm || '').trim().match(TIME_RE);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Monday = 0 … Sunday = 6, clock minutes, in Europe/Tirane. */
export function albaniaClock(date = new Date()): { dayOfWeek: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ALBANIA_TZ,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const dayOfWeek = WEEKDAY_TO_MONDAY0[get('weekday')] ?? 0;
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute')) || 0;
  return { dayOfWeek, minutes: hour * 60 + minute };
}

function rowForDay(weeklyHours: BusinessHourRow[], dayOfWeek: number): BusinessHourRow | null {
  return weeklyHours.find((d) => d.dayOfWeek === dayOfWeek) ?? null;
}

function isOvernight(openM: number, closeM: number): boolean {
  return closeM <= openM;
}

function weeklyFromLegacyOpeningHours(legacyOpeningHours: string): BusinessHourRow[] {
  const ranges = [...legacyOpeningHours.matchAll(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/g)];
  const last = ranges.at(-1);
  if (!last) return [];
  const open = last[1];
  const close = last[2];
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    closed: false,
    open,
    close,
  }));
}

function nextOpenLabel(
  weeklyHours: BusinessHourRow[],
  dayOfWeek: number,
  nowM: number,
): string | null {
  const today = rowForDay(weeklyHours, dayOfWeek);
  if (today && !today.closed) {
    const openM = parseMinutes(today.open);
    const closeM = parseMinutes(today.close);
    if (openM != null && closeM != null && nowM < openM && today.open) {
      return `Hapet ${today.open}`;
    }
  }
  for (let i = 1; i <= 7; i += 1) {
    const d = (dayOfWeek + i) % 7;
    const row = rowForDay(weeklyHours, d);
    if (!row || row.closed || !row.open) continue;
    if (parseMinutes(row.open) == null) continue;
    if (i === 1) return `Hapet Nesër ${row.open}`;
    return `Hapet ${BUSINESS_DAY_LABELS[d] ?? ''} ${row.open}`.trim();
  }
  return null;
}

/**
 * Live open/closed line in Albania time.
 * Overnight closes (e.g. 10:00–01:00) stay open past midnight until close, then show next open.
 */
export function computeOpenStatus(
  weeklyHours: BusinessHourRow[] | null | undefined,
  legacyOpeningHours?: string | null,
  date = new Date(),
): { isOpen: boolean; label: string | null } {
  const weekly = Array.isArray(weeklyHours) && weeklyHours.length > 0
    ? weeklyHours
    : weeklyFromLegacyOpeningHours(String(legacyOpeningHours || '').trim());
  if (weekly.length === 0) return { isOpen: false, label: null };

  const { dayOfWeek, minutes: nowM } = albaniaClock(date);
  const yesterday = rowForDay(weekly, (dayOfWeek + 6) % 7);
  if (yesterday && !yesterday.closed) {
    const openM = parseMinutes(yesterday.open);
    const closeM = parseMinutes(yesterday.close);
    if (openM != null && closeM != null && isOvernight(openM, closeM) && nowM < closeM) {
      return { isOpen: true, label: `Hapur • Mbyllet ${yesterday.close}` };
    }
  }

  const today = rowForDay(weekly, dayOfWeek);
  if (today && !today.closed) {
    const openM = parseMinutes(today.open);
    const closeM = parseMinutes(today.close);
    if (openM != null && closeM != null) {
      const openNow = isOvernight(openM, closeM) ? nowM >= openM : nowM >= openM && nowM < closeM;
      if (openNow) {
        return { isOpen: true, label: `Hapur • Mbyllet ${today.close}` };
      }
    }
  }

  const next = nextOpenLabel(weekly, dayOfWeek, nowM);
  return { isOpen: false, label: next ? `Mbyllur • ${next}` : 'Mbyllur' };
}
