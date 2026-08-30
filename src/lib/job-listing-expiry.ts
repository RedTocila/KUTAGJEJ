/** Public job listings stay visible for this many days after `createdAt`. */
export const JOB_LISTING_VISIBLE_DAYS = 15;

/** Chip turns orange when this many days or fewer remain. */
export const JOB_COUNTDOWN_WARNING_DAYS = 5;
/** Chip turns red when this many days or fewer remain. */
export const JOB_COUNTDOWN_CRITICAL_DAYS = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_SECOND = 1000;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function getJobListingExpiresAt(createdAt: string | Date, bumpedAt?: string | Date | null): Date {
  const posted = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const bumped = bumpedAt ? (bumpedAt instanceof Date ? bumpedAt : new Date(bumpedAt)) : null;
  const postedMs = posted.getTime();
  const bumpedMs = bumped?.getTime() ?? Number.NaN;
  const startsAt = Number.isFinite(bumpedMs) ? Math.max(postedMs, bumpedMs) : postedMs;
  return new Date(startsAt + JOB_LISTING_VISIBLE_DAYS * MS_PER_DAY);
}

export function isJobListingActive(
  createdAt: string | Date,
  now: Date = new Date(),
  bumpedAt?: string | Date | null
): boolean {
  return now.getTime() < getJobListingExpiresAt(createdAt, bumpedAt).getTime();
}

/** Whether a public job remains visible in its current 15-day post/bump window. */
export function isJobListingVisible(
  createdAt: string | Date,
  fields: {
    expiresAt?: string | null;
    bumpedAt?: string | null;
    premiumUntil?: string | null;
    okazionUntil?: string | null;
  },
  now: Date = new Date()
): boolean {
  const baseExpiresAt = getJobListingExpiresAt(createdAt, fields.bumpedAt);
  const reportedExpiresAt = fields.expiresAt ? new Date(fields.expiresAt) : null;
  const nowMs = now.getTime();
  const timestamps = [baseExpiresAt, reportedExpiresAt].map((value) =>
    value instanceof Date ? value.getTime() : value ? new Date(value).getTime() : Number.NaN
  );
  return timestamps.some((expiresMs) => Number.isFinite(expiresMs) && expiresMs > nowMs);
}

/** Time remaining until the listing is hidden (`Dd Hh Mm Ss`). */
export function formatJobListingCountdown(expiresAt: string | Date, now: Date = new Date()): string {
  const parts = getJobCountdownParts(expiresAt, now);

  if (parts.expired) return 'Skaduar';

  return `${parts.days}d ${parts.hours}h ${pad2(parts.minutes)}m ${pad2(parts.seconds)}s`;
}

export type JobListingCountdownUrgency = 'normal' | 'warning' | 'critical';

export interface JobCountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

/** Split remaining time for detail-page countdown boxes (days + h/m/s). */
export function getJobCountdownParts(expiresAt: string | Date, now: Date = new Date()): JobCountdownParts {
  let remainingMs = (expiresAt instanceof Date ? expiresAt : new Date(expiresAt)).getTime() - now.getTime();

  if (remainingMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const days = Math.floor(remainingMs / MS_PER_DAY);
  remainingMs %= MS_PER_DAY;
  const hours = Math.floor(remainingMs / MS_PER_HOUR);
  remainingMs %= MS_PER_HOUR;
  const minutes = Math.floor(remainingMs / MS_PER_MINUTE);
  remainingMs %= MS_PER_MINUTE;
  const seconds = Math.floor(remainingMs / MS_PER_SECOND);

  return { days, hours, minutes, seconds, expired: false };
}

export function getJobListingCountdownUrgency(
  expiresAt: string | Date,
  now: Date = new Date()
): JobListingCountdownUrgency {
  const remainingMs = (expiresAt instanceof Date ? expiresAt : new Date(expiresAt)).getTime() - now.getTime();

  if (remainingMs <= JOB_COUNTDOWN_CRITICAL_DAYS * MS_PER_DAY) return 'critical';
  if (remainingMs <= JOB_COUNTDOWN_WARNING_DAYS * MS_PER_DAY) return 'warning';
  return 'normal';
}
