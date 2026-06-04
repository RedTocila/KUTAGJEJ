const DAY_LABELS_SQ = ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die'];

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function parseMinutes(hhmm) {
  const m = String(hhmm || '').trim().match(TIME_RE);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function formatMinutes(total) {
  const h = Math.floor(total / 60) % 24;
  const min = total % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Monday = 0 … Sunday = 6 (matches form editor). */
function currentDayOfWeek(date = new Date()) {
  const js = date.getDay();
  return js === 0 ? 6 : js - 1;
}

function minutesNow(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatWeeklyHoursLine(weeklyHours) {
  if (!Array.isArray(weeklyHours) || weeklyHours.length === 0) return null;
  const openDays = weeklyHours.filter((d) => !d.closed && d.open && d.close);
  if (openDays.length === 0) return 'Mbyllur';
  const same = openDays.every(
    (d) => d.open === openDays[0].open && d.close === openDays[0].close,
  );
  if (same && openDays.length >= 5) {
    return `Hën–Die ${openDays[0].open}–${openDays[0].close}`;
  }
  return openDays
    .slice()
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((d) => `${DAY_LABELS_SQ[d.dayOfWeek] ?? ''} ${d.open}–${d.close}`)
    .join(' · ');
}

/**
 * @returns {{ isOpen: boolean, label: string | null }}
 */
function computeOpenStatus(weeklyHours, legacyOpeningHours, date = new Date()) {
  if (Array.isArray(weeklyHours) && weeklyHours.length > 0) {
    const today = weeklyHours.find((d) => d.dayOfWeek === currentDayOfWeek(date));
    if (!today || today.closed) {
      return { isOpen: false, label: 'Mbyllur' };
    }
    const openM = parseMinutes(today.open);
    const closeM = parseMinutes(today.close);
    if (openM == null || closeM == null) {
      return { isOpen: false, label: null };
    }
    const now = minutesNow(date);
    let isOpen = false;
    if (closeM > openM) {
      isOpen = now >= openM && now < closeM;
    } else {
      isOpen = now >= openM || now < closeM;
    }
    if (isOpen) {
      return { isOpen: true, label: `Hapur • Mbyllet ${today.close}` };
    }
    return { isOpen: false, label: `Mbyllur • Hapet ${today.open}` };
  }

  if (legacyOpeningHours?.trim()) {
    const ranges = [...legacyOpeningHours.matchAll(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/g)];
    const last = ranges.at(-1);
    if (last?.[2]) return { isOpen: true, label: `Hapur • Mbyllet ${last[2]}` };
    return { isOpen: true, label: 'Hapur' };
  }

  return { isOpen: false, label: null };
}

function normalizeWeeklyHours(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const row of input) {
    const dayOfWeek = Number(row?.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) continue;
    const closed = Boolean(row.closed);
    const open = closed ? null : String(row.open || '').trim();
    const close = closed ? null : String(row.close || '').trim();
    if (!closed) {
      if (!TIME_RE.test(open) || !TIME_RE.test(close)) continue;
      if (parseMinutes(open) == null || parseMinutes(close) == null) continue;
    }
    out.push({ dayOfWeek, closed, open: closed ? null : open, close: closed ? null : close });
  }
  return out;
}

module.exports = {
  DAY_LABELS_SQ,
  TIME_RE,
  formatWeeklyHoursLine,
  computeOpenStatus,
  normalizeWeeklyHours,
  parseMinutes,
  formatMinutes,
};
