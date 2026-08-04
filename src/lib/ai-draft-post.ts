'use client';

import type { AiListingDraft } from '@/lib/ai-listing-draft';
import { defaultWeeklyHours } from '@/lib/business-constants';
import {
  createBusinessListing,
  createProfessionalListing,
} from '@/lib/directory-listings-client';
import {
  createCarListing,
  createJobListing,
  createMarketplaceListing,
  createRealEstateListing,
  type ListingCreateResult,
} from '@/lib/listings-client';
import {
  listRealEstateLocationsPublic,
  type RealEstateCityDto,
} from '@/lib/real-estate-locations-client';

export type AiDraftPostResult = {
  draftId: string;
  ok: boolean;
  error?: string;
  listingId?: string;
};

let citiesCache: RealEstateCityDto[] | null = null;

async function loadCities(): Promise<RealEstateCityDto[]> {
  if (citiesCache) return citiesCache;
  const res = await listRealEstateLocationsPublic();
  citiesCache = res.cities ?? [];
  return citiesCache;
}

function str(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function resolveCity(
  cities: RealEstateCityDto[],
  cityId: string,
  cityName: string,
): RealEstateCityDto | null {
  if (cityId) {
    const byId = cities.find((c) => c.id === cityId);
    if (byId) return byId;
  }
  const name = cityName.trim().toLowerCase();
  if (!name) return null;
  const exact = cities.find((c) => c.name.toLowerCase() === name);
  if (exact) return exact;
  return (
    cities.find(
      (c) => c.name.toLowerCase().includes(name) || name.includes(c.name.toLowerCase()),
    ) ?? null
  );
}

async function fetchImageFiles(urls: string[]): Promise<File[]> {
  const files: File[] = [];
  for (let i = 0; i < Math.min(urls.length, 8); i += 1) {
    const url = urls[i];
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) continue;
      const ext = blob.type.split('/')[1]?.split('+')[0] || 'jpg';
      files.push(new File([blob], `ai-image-${i + 1}.${ext}`, { type: blob.type }));
    } catch {
      /* skip broken remote image */
    }
  }
  return files;
}

/**
 * Publish one AI draft through the same create APIs as the listing forms.
 * Fills missing city/zone/phone with best-effort defaults when possible.
 */
export async function postAiListingDraft(
  draft: AiListingDraft,
  opts?: { phoneFallback?: string | null },
): Promise<AiDraftPostResult> {
  if (draft.error || !draft.category) {
    return { draftId: draft.id, ok: false, error: draft.error || 'Draft is incomplete.' };
  }

  const f = draft.form || {};
  const imageUrls = (draft.imageUrls || []).filter((u) => /^https?:\/\//i.test(u));
  const phone =
    str(f.contactPhone) ||
    str(opts?.phoneFallback) ||
    '';

  try {
    const cities = await loadCities();
    const city = resolveCity(cities, str(f.cityId), draft.cityName || str(f.cityName));
    const cityId = city?.id || str(f.cityId);
    const zoneId = str(f.zoneId) || city?.zones?.[0]?.id || '';

    let result: ListingCreateResult;

    switch (draft.category) {
      case 'real-estate': {
        if (!cityId || !zoneId) {
          return {
            draftId: draft.id,
            ok: false,
            error: 'City/zone missing — open the form to pick location.',
          };
        }
        if (phone.length < 6) {
          return { draftId: draft.id, ok: false, error: 'Phone number is required.' };
        }
        const propertyCategory = str(f.propertyCategory) || 'apartment';
        result = await createRealEstateListing({
          propertyCategory,
          title: str(f.title) || draft.title || 'Njoftim',
          description: str(f.description) || draft.summary || draft.title || 'Njoftim',
          transactionType: f.transactionType === 'rent' ? 'rent' : 'sale',
          price: num(f.price) ?? 0,
          currency: f.currency === 'LEK' ? 'LEK' : 'EUR',
          surfaceM2: num(f.surfaceM2) ?? 0,
          cityId,
          zoneId,
          contactPhone: phone,
          condition: str(f.condition) || undefined,
          floor: num(f.floor) ?? undefined,
          totalFloors: num(f.totalFloors) ?? undefined,
          parkingFloor: num(f.parkingFloor) ?? undefined,
          bedrooms: num(f.bedrooms) ?? undefined,
          bathrooms: num(f.bathrooms) ?? undefined,
          furnishing: str(f.furnishing) || undefined,
          yearBuilt: num(f.yearBuilt) ?? undefined,
          imageUrls,
        });
        break;
      }

      case 'cars': {
        if (!cityId) {
          return {
            draftId: draft.id,
            ok: false,
            error: 'City missing — open the form to pick location.',
          };
        }
        if (phone.length < 6) {
          return { draftId: draft.id, ok: false, error: 'Phone number is required.' };
        }
        const fd = new FormData();
        fd.append('make', str(f.make) || 'Other');
        fd.append('model', str(f.model) || 'Model');
        fd.append('variant', str(f.variant));
        fd.append('description', str(f.description) || draft.summary || draft.title || '');
        fd.append('year', String(num(f.year) ?? new Date().getFullYear()));
        fd.append('kilometers', String(num(f.kilometers) ?? 0));
        fd.append(
          'transmission',
          f.transmission === 'automatic' || f.transmission === 'manual' ? String(f.transmission) : 'manual',
        );
        fd.append('fuelType', str(f.fuelType) || 'petrol');
        fd.append('price', String(num(f.price) ?? 0));
        fd.append('currency', f.currency === 'LEK' ? 'LEK' : 'EUR');
        fd.append('color', str(f.color) || 'Other');
        fd.append('contactPhone', phone);
        fd.append('cityId', cityId);
        if (Array.isArray(f.extras)) {
          for (const extra of f.extras) fd.append('extras[]', String(extra));
        }
        const files = await fetchImageFiles(imageUrls);
        for (const file of files) fd.append('images', file, file.name);
        result = await createCarListing(fd);
        break;
      }

      case 'job-listings': {
        if (!cityId) {
          return {
            draftId: draft.id,
            ok: false,
            error: 'City missing — open the form to pick location.',
          };
        }
        result = await createJobListing({
          title: str(f.title) || draft.title || 'Punë',
          description: str(f.description) || draft.summary || draft.title || '',
          industry: str(f.industry) || 'other',
          cityId,
          education: str(f.education) || '',
          experience: str(f.experience) || '',
          jobType: str(f.jobType) || 'full-time',
          workLocation: str(f.workLocation) || 'onsite',
          salary: num(f.salary),
          currency: f.currency === 'LEK' || f.currency === 'EUR' ? String(f.currency) : null,
          contactPhone: phone || '000000',
          responsibilities: Array.isArray(f.responsibilities)
            ? f.responsibilities.map(String).filter(Boolean)
            : [],
          requirements: Array.isArray(f.requirements)
            ? f.requirements.map(String).filter(Boolean)
            : [],
          benefits: [],
          imageUrls,
        });
        break;
      }

      case 'marketplace': {
        if (!cityId) {
          return {
            draftId: draft.id,
            ok: false,
            error: 'City missing — open the form to pick location.',
          };
        }
        if (phone.length < 6) {
          return { draftId: draft.id, ok: false, error: 'Phone number is required.' };
        }
        result = await createMarketplaceListing({
          transactionType: str(f.transactionType) || 'shes',
          title: str(f.title) || draft.title || 'Produkt',
          description: str(f.description) || draft.summary || draft.title || '',
          category: str(f.category) || 'te-tjera',
          condition: str(f.condition) || null,
          price: num(f.price),
          currency: f.currency === 'LEK' || f.currency === 'EUR' ? String(f.currency) : 'EUR',
          cityId,
          contactPhone: phone,
          imageUrls,
        });
        break;
      }

      case 'businesses': {
        if (!cityId) {
          return {
            draftId: draft.id,
            ok: false,
            error: 'City missing — open the form to pick location.',
          };
        }
        if (phone.length < 6) {
          return { draftId: draft.id, ok: false, error: 'Phone number is required.' };
        }
        result = await createBusinessListing({
          title: str(f.title) || draft.title || 'Biznes',
          description: str(f.description) || draft.summary || draft.title || '',
          category: str(f.category) || 'restorant',
          cityId,
          contactPhone: phone,
          imageUrls,
          weeklyHours: defaultWeeklyHours(),
          reservationsEnabled: false,
          reservationUrl: null,
          reservationTimeSlots: [],
          reservationPartySizes: [],
          servicesHighlight: str(f.servicesHighlight) || null,
        });
        break;
      }

      case 'professionals': {
        if (!cityId) {
          return {
            draftId: draft.id,
            ok: false,
            error: 'City missing — open the form to pick location.',
          };
        }
        if (phone.length < 6) {
          return { draftId: draft.id, ok: false, error: 'Phone number is required.' };
        }
        result = await createProfessionalListing({
          title: str(f.title) || draft.title || 'Profesionist',
          description: str(f.description) || draft.summary || draft.title || '',
          category: str(f.category) || 'sherbim',
          cityId,
          contactPhone: phone,
          imageUrls,
          responseTimeHours: num(f.responseTimeHours) ?? 2,
          portfolioItems: [],
          price: num(f.price),
          currency: f.currency === 'LEK' || f.currency === 'EUR' ? f.currency : null,
          condition: null,
          servicesHighlight: str(f.servicesHighlight) || null,
        });
        break;
      }

      default:
        return { draftId: draft.id, ok: false, error: 'Unsupported category.' };
    }

    if (result.error) {
      return { draftId: draft.id, ok: false, error: result.error };
    }
    return { draftId: draft.id, ok: true, listingId: result.id };
  } catch (err) {
    return {
      draftId: draft.id,
      ok: false,
      error: err instanceof Error ? err.message : 'Could not post listing.',
    };
  }
}

export async function postAiListingDrafts(
  drafts: AiListingDraft[],
  opts?: { phoneFallback?: string | null },
): Promise<AiDraftPostResult[]> {
  const results: AiDraftPostResult[] = [];
  for (const draft of drafts) {
    // Sequential to avoid quota/rate spikes.
    results.push(await postAiListingDraft(draft, opts));
  }
  return results;
}
