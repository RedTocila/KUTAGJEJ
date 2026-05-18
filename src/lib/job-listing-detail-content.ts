import {
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_INDUSTRY_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import type { PublicJobListingDetail } from '@/lib/public-listings-client';

import { findOptionLabel } from '@/components/public/listing-cards/format-helpers';

const ALBANIAN_MONTHS = [
  'Jan',
  'Shk',
  'Mar',
  'Pri',
  'Maj',
  'Qer',
  'Kor',
  'Gus',
  'Sht',
  'Tet',
  'Nën',
  'Dhj',
] as const;

export function formatJobPostedDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${ALBANIAN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function isJobListingNew(createdAt: string, withinDays = 3): boolean {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs >= 0 && ageMs <= withinDays * 24 * 60 * 60 * 1000;
}

export function formatJobListingId(id: string): string {
  return id.slice(-6).toUpperCase();
}

function parseBulletLines(description: string): string[] {
  return description
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•\-–*]+/, '').trim())
    .filter((line) => line.length > 8);
}

function defaultResponsibilities(listing: PublicJobListingDetail): string[] {
  const industry = findOptionLabel(JOB_INDUSTRY_OPTIONS, listing.industry);
  return [
    `Kryej detyrat kryesore në fushën e ${industry}.`,
    'Punon në ekip dhe raporton progresin sipas objektivave.',
    'Mban komunikim të qartë me menaxherin dhe kolegët.',
    'Respekton standardet e kompanisë dhe afatet e caktuara.',
    'Kontribuon në përmirësimin e proceseve të punës.',
  ];
}

function defaultRequirements(listing: PublicJobListingDetail): string[] {
  const items: string[] = [];
  if (listing.education && listing.education !== 'no-requirement') {
    items.push(`Arsimi: ${findOptionLabel(JOB_EDUCATION_OPTIONS, listing.education)}.`);
  }
  items.push(`Eksperienca: ${findOptionLabel(JOB_EXPERIENCE_OPTIONS, listing.experience)}.`);
  items.push(`Vendi i punës: ${findOptionLabel(WORK_LOCATION_OPTIONS, listing.workLocation)}.`);
  items.push(`Lloji i punës: ${findOptionLabel(JOB_TYPE_OPTIONS, listing.jobType)}.`);
  items.push('Aftësi të mira komunikimi dhe punë në ekip.');
  return items.slice(0, 5);
}

export interface JobDetailBenefit {
  id: string;
  label: string;
}

export interface JobDetailSections {
  intro: string;
  responsibilities: string[];
  requirements: string[];
  benefits: JobDetailBenefit[];
}

export function buildJobDetailSections(listing: PublicJobListingDetail): JobDetailSections {
  const bullets = parseBulletLines(listing.description);
  const intro =
    bullets.length > 0
      ? listing.description
          .split(/\n+/)
          .filter((line) => !/^[\s•\-–*]/.test(line))
          .join(' ')
          .trim() || bullets[0]
      : listing.description.trim();

  const responsibilities =
    bullets.length >= 3 ? bullets.slice(0, Math.ceil(bullets.length / 2)).slice(0, 5) : defaultResponsibilities(listing);
  const requirements =
    bullets.length >= 4 ? bullets.slice(Math.ceil(bullets.length / 2)).slice(0, 5) : defaultRequirements(listing);

  const benefits: JobDetailBenefit[] = [
    {
      id: 'pay',
      label: listing.salary != null ? 'Pagë konkurruese' : 'Pagë e diskutueshme',
    },
    { id: 'growth', label: 'Mundësi zhvillimi profesional' },
    { id: 'health', label: 'Sigurim shëndetësor' },
    { id: 'flex', label: 'Orar fleksibël' },
  ];

  return { intro, responsibilities, requirements, benefits };
}

export function jobDetailMetaRows(listing: PublicJobListingDetail) {
  const location = listing.cityName ? `${listing.cityName}, Shqipëri` : 'Shqipëri';
  return [
    { label: 'Lokacioni', value: location },
    { label: 'Lloji i punës', value: findOptionLabel(JOB_TYPE_OPTIONS, listing.jobType) },
    { label: 'Data e postimit', value: formatJobPostedDate(listing.createdAt) },
    { label: 'Përvoja', value: findOptionLabel(JOB_EXPERIENCE_OPTIONS, listing.experience) },
  ] as const;
}
