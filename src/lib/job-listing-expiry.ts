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

export function getJobListingExpiresAt(createdAt: string | Date): Date {
  const posted = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return new Date(posted.getTime() + JOB_LISTING_VISIBLE_DAYS * MS_PER_DAY);
}

export function isJobListingActive(createdAt: string | Date, now: Date = new Date()): boolean {
  return now.getTime() < getJobListingExpiresAt(createdAt).getTime();
}

/** Time remaining until the listing is hidden (`Hh Mm Ss`, hours include full multi-day remainder). */
export function formatJobListingCountdown(expiresAt: string | Date, now: Date = new Date()): string {
  const expires = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  const remainingMs = expires.getTime() - now.getTime();

  if (remainingMs <= 0) return 'Skaduar';

  const totalSeconds = Math.floor(remainingMs / MS_PER_SECOND);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${pad2(minutes)}m ${pad2(seconds)}s`;
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
  now: Date = new Date(),
): JobListingCountdownUrgency {
  const remainingMs = (expiresAt instanceof Date ? expiresAt : new Date(expiresAt)).getTime() - now.getTime();

  if (remainingMs <= JOB_COUNTDOWN_CRITICAL_DAYS * MS_PER_DAY) return 'critical';
  if (remainingMs <= JOB_COUNTDOWN_WARNING_DAYS * MS_PER_DAY) return 'warning';
  return 'normal';
}
