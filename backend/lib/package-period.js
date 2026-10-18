'use strict';

/** Add calendar months in UTC, clamping the day (31 Jan + 1 month = 28 Feb). */
function addMonthsUtc(date, months) {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

/**
 * Start of the package period that contains `now`, measured from `anchor`.
 * Periods are one month apart from the anchor instant, not the 1st of the month.
 */
function packagePeriodStart(anchor, now = new Date()) {
  const start = anchor instanceof Date ? new Date(anchor.getTime()) : new Date(anchor);
  const current = now instanceof Date ? new Date(now.getTime()) : new Date(now);
  if (Number.isNaN(start.getTime()) || Number.isNaN(current.getTime())) {
    return new Date().toISOString();
  }
  if (start.getTime() >= current.getTime()) return start.toISOString();

  let lo = 0;
  let hi = 1;
  while (addMonthsUtc(start, hi).getTime() <= current.getTime()) {
    hi *= 2;
    if (hi > 2400) break;
  }
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (addMonthsUtc(start, mid).getTime() <= current.getTime()) lo = mid;
    else hi = mid;
  }
  return addMonthsUtc(start, lo).toISOString();
}

module.exports = {
  addMonthsUtc,
  packagePeriodStart,
};
