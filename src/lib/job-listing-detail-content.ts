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
  const responsibilities =
    listing.responsibilities?.filter((line) => line.trim().length > 0) ?? [];
  const requirements = listing.requirements?.filter((line) => line.trim().length > 0) ?? [];
  const benefits =
    listing.benefits?.filter((b) => b.id && b.label?.trim()).map((b) => ({ id: b.id, label: b.label.trim() })) ??
    [];

  return {
    intro: listing.description.trim(),
    responsibilities,
    requirements,
    benefits,
  };
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

export function jobCoverImageUrls(listing: PublicJobListingDetail): string[] {
  const images = listing.imageUrls.filter(Boolean);
  if (images.length > 0) return [images[0]!];
  if (listing.imageUrl) return [listing.imageUrl];
  return [];
}

export function jobCompanyAvatarUrl(listing: PublicJobListingDetail): string | null {
  const images = listing.imageUrls.filter(Boolean);
  return images.length > 1 ? images[1]! : null;
}

export function jobCompanyInitials(companyName: string): string {
  return (
    companyName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'K'
  );
}
