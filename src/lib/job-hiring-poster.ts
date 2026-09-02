import { findOptionLabel } from '@/lib/find-option-label';
import type { AppMessages } from '@/lib/i18n/messages';
import type { AppLanguage } from '@/lib/language';
import { JOB_TYPE_OPTIONS } from '@/lib/job-constants';
import { inferRequiredRolesFromTitle, sanitizeRequiredRoles } from '@/lib/job-required-roles';

export type JobHiringPosterTheme = {
  background: string;
  bubble: string;
  accent: string;
};

export type JobHiringPosterFields = {
  companyName: string;
  roles: string[];
  location: string;
  jobType: string;
  salary: string;
};

/** Hiring poster palettes — background, speech bubble, accent. */
const JOB_HIRING_POSTER_PALETTES: readonly JobHiringPosterTheme[] = [
  { background: '#2b6fe0', bubble: '#0b1630', accent: '#f5c518' },
  { background: '#0d9488', bubble: '#042f2e', accent: '#fde047' },
  { background: '#7c3aed', bubble: '#1e1033', accent: '#fbbf24' },
  { background: '#dc2626', bubble: '#1a0505', accent: '#fcd34d' },
  { background: '#ea580c', bubble: '#1f0a02', accent: '#fef08a' },
  { background: '#16a34a', bubble: '#052e16', accent: '#fde68a' },
  { background: '#db2777', bubble: '#1f0510', accent: '#fef08a' },
  { background: '#4338ca', bubble: '#0f0a2e', accent: '#facc15' },
  { background: '#ca8a04', bubble: '#1a1404', accent: '#ffffff' },
  { background: '#475569', bubble: '#0f172a', accent: '#38bdf8' },
  { background: '#0891b2', bubble: '#042f3a', accent: '#fda4af' },
  { background: '#be123c', bubble: '#1a0208', accent: '#a7f3d0' },
] as const;

export const JOB_HIRING_POSTER_PALETTE_COUNT = JOB_HIRING_POSTER_PALETTES.length;

export function pickRandomJobPosterColorSeed(): number {
  return Math.floor(Math.random() * JOB_HIRING_POSTER_PALETTE_COUNT);
}

export function jobPosterThemeFromSeed(seed: number): JobHiringPosterTheme {
  const index = ((Math.trunc(seed) % JOB_HIRING_POSTER_PALETTE_COUNT) + JOB_HIRING_POSTER_PALETTE_COUNT) % JOB_HIRING_POSTER_PALETTE_COUNT;
  return JOB_HIRING_POSTER_PALETTES[index]!;
}

export function jobPosterColorSeedFromListingId(listingId: string): number {
  let hash = 0;
  for (let i = 0; i < listingId.length; i++) {
    hash = (hash * 31 + listingId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % JOB_HIRING_POSTER_PALETTE_COUNT;
}

export function resolveJobPosterColorSeed(input: {
  posterColorSeed?: number | null;
  listingId?: string | null;
  previewSeed?: number | null;
}): number {
  if (input.previewSeed != null && Number.isFinite(input.previewSeed)) {
    return Math.trunc(input.previewSeed);
  }
  if (input.posterColorSeed != null && Number.isFinite(input.posterColorSeed)) {
    return Math.trunc(input.posterColorSeed);
  }
  const listingId = String(input.listingId ?? '').trim();
  if (listingId) return jobPosterColorSeedFromListingId(listingId);
  return 0;
}

export function resolveJobPosterTheme(input: {
  posterColorSeed?: number | null;
  listingId?: string | null;
  previewSeed?: number | null;
}): JobHiringPosterTheme {
  return jobPosterThemeFromSeed(resolveJobPosterColorSeed(input));
}

export type JobHiringPosterInput = {
  title?: string | null;
  companyName?: string | null;
  requiredRoles?: string[] | null;
  cityName?: string | null;
  zoneName?: string | null;
  locationAddress?: string | null;
  experience?: string | null;
  education?: string | null;
  jobType?: string | null;
  salary?: number | null;
  currency?: 'EUR' | 'LEK' | null;
};

type JobPosterCopy = AppMessages['jobPoster'];

const JOB_TYPE_LABEL_EN: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  remote: 'Remote',
  internship: 'Internship',
  weekend: 'Weekends',
  seasonal: 'Seasonal',
  freelance: 'Freelance',
};

function localizedJobOptionLabel(
  language: AppLanguage,
  options: readonly { value: string; label: string }[],
  value: string,
  enMap: Record<string, string>
): string {
  if (language === 'en') {
    return enMap[value] ?? findOptionLabel(options, value) ?? value;
  }
  return findOptionLabel(options, value) || value;
}

function formatPosterSalary(
  copy: JobPosterCopy,
  salary?: number | null,
  currency?: 'EUR' | 'LEK' | null
): string {
  if (salary == null || !Number.isFinite(salary)) return copy.negotiableSalary;
  const formatted = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(salary);
  if (currency === 'EUR') return `${formatted} €${copy.perMonth}`;
  if (currency === 'LEK') return `${formatted} L${copy.perMonth}`;
  return `${formatted}${copy.perMonth}`;
}

function resolvePosterRoles(
  copy: JobPosterCopy,
  title?: string | null,
  requiredRoles?: string[] | null
): string[] {
  const stored = sanitizeRequiredRoles(requiredRoles);
  if (stored.length) return stored.slice(0, 5);
  const titleTrimmed = String(title ?? '').trim();
  if (titleTrimmed) return [titleTrimmed];
  const inferred = inferRequiredRolesFromTitle(title);
  if (inferred.length) return inferred.slice(0, 5);
  return [copy.openPosition];
}

function resolvePosterLocation(
  copy: JobPosterCopy,
  cityName?: string | null,
  zoneName?: string | null,
  locationAddress?: string | null
): string {
  const address = String(locationAddress ?? '').trim();
  if (address) return address;
  const parts = [zoneName, cityName].filter(Boolean).map((part) => String(part).trim());
  if (parts.length) return parts.join(', ');
  return copy.defaultCountry;
}

export function buildJobHiringPosterFields(
  input: JobHiringPosterInput,
  copy: JobPosterCopy,
  language: AppLanguage = 'sq'
): JobHiringPosterFields {
  const companyName = String(input.companyName ?? '').trim();
  const jobTypeValue = String(input.jobType ?? '').trim();

  return {
    companyName,
    roles: resolvePosterRoles(copy, input.title, input.requiredRoles),
    location: resolvePosterLocation(copy, input.cityName, input.zoneName, input.locationAddress),
    jobType: jobTypeValue
      ? localizedJobOptionLabel(language, JOB_TYPE_OPTIONS, jobTypeValue, JOB_TYPE_LABEL_EN)
      : localizedJobOptionLabel(language, JOB_TYPE_OPTIONS, 'full-time', JOB_TYPE_LABEL_EN),
    salary: formatPosterSalary(copy, input.salary, input.currency),
  };
}
