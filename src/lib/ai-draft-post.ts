'use client';

import type { AiListingDraft } from '@/lib/ai-listing-draft';
import { extractJobAddressFromText } from '@/lib/ai-draft-to-listing';
import { resolveJobAiCover } from '@/lib/ai-import-client';
import { defaultWeeklyHours, type WeeklyHourRow } from '@/lib/business-constants';
import {
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import { normalizeFuelType } from '@/lib/car-constants';
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
import { mirrorRemoteImageUrls } from '@/lib/uploads-client';

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

function knownOption(value: unknown, options: readonly { value: string }[]): string {
  const candidate = str(value);
  return options.some((option) => option.value === candidate) ? candidate : '';
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

/** Host AI-scraped photos on our CDN (avoids CORS / hotlink breakage). */
export async function hostAiDraftImages(
  urls: string[],
  folder: string,
): Promise<{ urls: string[]; error?: string }> {
  if (!urls.length) return { urls: [] };
  const mirrored = await mirrorRemoteImageUrls(urls, folder);
  if (mirrored.error && !mirrored.urls.length) {
    return { urls: [], error: mirrored.error };
  }
  return { urls: mirrored.urls };
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

  // Hard gate: never publish a draft whose category was stripped / invalid.
  const allowed: AiListingDraft['category'][] = [
    'real-estate',
    'cars',
    'job-listings',
    'marketplace',
    'businesses',
    'professionals',
  ];
  if (!allowed.includes(draft.category)) {
    return {
      draftId: draft.id,
      ok: false,
      error: 'This listing category is invalid. Choose the correct category and try again.',
    };
  }

  const f = draft.form || {};
  const rawImageUrls = (draft.imageUrls || []).filter((u) => {
    if (!/^https?:\/\//i.test(u)) return false;
    const lower = u.toLowerCase();
    if (/facebook\.com\/(?:tr|tr\/)\b|[?&]ev=pageview\b/i.test(lower)) return false;
    if (
      /google-analytics\.com|googletagmanager\.com|doubleclick\.net|bat\.bing\.com|adservice\.google/i.test(
        lower,
      )
    ) {
      return false;
    }
    return true;
  });
  const phone =
    str(f.contactPhone) ||
    str(opts?.phoneFallback) ||
    '';

  try {
    const cities = await loadCities();
    const city = resolveCity(cities, str(f.cityId), draft.cityName || str(f.cityName));
    const cityId = city?.id || str(f.cityId);
    const zoneName = str(f.zoneName);
    const zoneId =
      str(f.zoneId) ||
      (city && zoneName
        ? city.zones.find(
            (z) =>
              z.name.toLowerCase() === zoneName.toLowerCase() ||
              z.name.toLowerCase().includes(zoneName.toLowerCase()) ||
              zoneName.toLowerCase().includes(z.name.toLowerCase()),
          )?.id
        : '') ||
      '';

    const folderByCategory: Record<string, string> = {
      'real-estate': 'real-estate',
      cars: 'cars',
      'job-listings': 'jobs',
      marketplace: 'marketplace',
      businesses: 'businesses',
      professionals: 'professionals',
    };
    const folder = folderByCategory[draft.category] || 'listings';
    const isJob = draft.category === 'job-listings';
    const jobCover = isJob
      ? resolveJobAiCover({
          prompt: draft.sourcePrompt ?? str(f.sourcePrompt),
          imageUrls: rawImageUrls,
        })
      : null;
    const urlsToHost = jobCover?.coverMode === 'mockup' ? [] : rawImageUrls;
    const hosted = await hostAiDraftImages(urlsToHost, folder);
    if (hosted.error && urlsToHost.length > 0 && !hosted.urls.length) {
      return { draftId: draft.id, ok: false, error: hosted.error };
    }
    const imageUrls = hosted.urls;
    if (!isJob && imageUrls.length < 1) {
      return { draftId: draft.id, ok: false, error: 'Shtoni të paktën një foto.' };
    }
    const jobCoverMode = jobCover?.coverMode ?? 'mockup';
    const jobImageUrls = jobCoverMode === 'image' ? imageUrls : [];

    let result: ListingCreateResult;

    switch (draft.category) {
      case 'real-estate': {
        if (phone.length < 6) {
          return { draftId: draft.id, ok: false, error: 'Phone number is required.' };
        }
        const propertyCategory = str(f.propertyCategory);
        result = await createRealEstateListing({
          propertyCategory: propertyCategory || undefined,
          title: str(f.title) || draft.title || 'Njoftim',
          description: str(f.description) || draft.summary || '',
          transactionType: f.transactionType === 'rent' || f.transactionType === 'sale' ? f.transactionType : undefined,
          price: num(f.price) ?? 0,
          currency: f.currency === 'LEK' ? 'LEK' : 'EUR',
          surfaceM2: num(f.surfaceM2),
          cityId,
          zoneId: str(f.zoneId) || null,
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
        if (phone.length < 6) {
          return { draftId: draft.id, ok: false, error: 'Phone number is required.' };
        }
        const vehicleType = ['car', 'suv', 'van', 'truck', 'motorcycle', 'boat'].includes(
          str(f.vehicleType).toLowerCase(),
        )
          ? str(f.vehicleType).toLowerCase()
          : 'car';
        const colorRaw = str(f.color).toLowerCase();
        const color =
          [
            'beige',
            'blue',
            'brown',
            'yellow',
            'gold',
            'green',
            'grey',
            'orange',
            'red',
            'black',
            'silver',
            'purple',
            'white',
          ].includes(colorRaw)
            ? colorRaw
            : 'grey';
        const fd = new FormData();
        fd.append('vehicleType', vehicleType);
        fd.append('make', str(f.make) || 'Other');
        fd.append('model', str(f.model) || 'Other');
        fd.append('variant', str(f.variant));
        fd.append('description', str(f.description) || draft.summary || draft.title || '');
        fd.append('year', String(num(f.year) ?? new Date().getFullYear()));
        fd.append('kilometers', String(num(f.kilometers) ?? 0));
        fd.append(
          'transmission',
          f.transmission === 'automatic' || f.transmission === 'manual' ? String(f.transmission) : 'manual',
        );
        const fuelType = normalizeFuelType(f.fuelType);
        if (fuelType) {
          fd.append('fuelType', fuelType);
        }
        fd.append('price', String(num(f.price) ?? 0));
        fd.append('currency', f.currency === 'LEK' ? 'LEK' : 'EUR');
        fd.append('color', color);
        fd.append('contactPhone', phone);
        fd.append('cityId', cityId);
        if (Array.isArray(f.extras)) {
          for (const extra of f.extras) fd.append('extras[]', String(extra));
        }
        if (imageUrls.length) {
          fd.append('imageUrls', JSON.stringify(imageUrls));
        }
        result = await createCarListing(fd);
        break;
      }

      case 'job-listings': {
        const locationAddress = str(f.locationAddress) || extractJobAddressFromText(str(f.description), draft.summary) || null;
        const mapsUrl = str(f.mapsUrl) || null;
        const hasMapLocation = Boolean(locationAddress || mapsUrl);
        result = await createJobListing({
          title: str(f.title) || draft.title || 'Punë',
          description: str(f.description) || draft.summary || draft.title || '',
          coverMode: jobCoverMode,
          industry: str(f.industry) || 'other',
          cityId: hasMapLocation ? null : cityId,
          zoneId: hasMapLocation ? null : zoneId || null,
          mapsUrl,
          locationAddress,
          locationLat: num(f.locationLat),
          locationLng: num(f.locationLng),
          education: knownOption(f.education, JOB_EDUCATION_OPTIONS),
          experience: knownOption(f.experience, JOB_EXPERIENCE_OPTIONS),
          jobType: knownOption(f.jobType, JOB_TYPE_OPTIONS) || 'full-time',
          workLocation: knownOption(f.workLocation, WORK_LOCATION_OPTIONS) || 'onsite',
          preferredGender:
            f.preferredGender === 'male' || f.preferredGender === 'female' || f.preferredGender === 'both'
              ? f.preferredGender
              : null,
          preferredAgeMin: num(f.preferredAgeMin),
          preferredAgeMax: num(f.preferredAgeMax),
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
          imageUrls: jobImageUrls,
        });
        break;
      }

      case 'marketplace': {
        if (phone.length < 6) {
          return { draftId: draft.id, ok: false, error: 'Phone number is required.' };
        }
        result = await createMarketplaceListing({
          transactionType: 'shes',
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
        if (phone.length < 6) {
          return { draftId: draft.id, ok: false, error: 'Phone number is required.' };
        }
        const locationAddress = str(f.locationAddress) || null;
        const mapsUrl = str(f.mapsUrl) || null;
        const hasMapLocation = Boolean(locationAddress || mapsUrl);
        const weeklyHours: WeeklyHourRow[] =
          Array.isArray(f.weeklyHours) && f.weeklyHours.length
            ? (f.weeklyHours as WeeklyHourRow[])
            : defaultWeeklyHours();
        result = await createBusinessListing({
          title: str(f.title) || draft.title || 'Biznes',
          description: str(f.description) || draft.summary || draft.title || '',
          category: str(f.category) || 'restorant',
          cityId: hasMapLocation ? null : cityId,
          zoneId: hasMapLocation ? null : zoneId || null,
          mapsUrl,
          contactPhone: phone,
          imageUrls,
          weeklyHours,
          reservationsEnabled: false,
          reservationUrl: null,
          reservationTimeSlots: [],
          reservationPartySizes: [],
          servicesHighlight: str(f.servicesHighlight) || null,
        });
        break;
      }

      case 'professionals': {
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

export type AiDraftPostProgress = {
  done: number;
  total: number;
  currentId: string | null;
};

export async function postAiListingDrafts(
  drafts: AiListingDraft[],
  opts?: {
    phoneFallback?: string | null;
    onProgress?: (info: AiDraftPostProgress) => void;
  },
): Promise<AiDraftPostResult[]> {
  const results: AiDraftPostResult[] = [];
  const total = drafts.length;
  for (let i = 0; i < drafts.length; i += 1) {
    const draft = drafts[i];
    opts?.onProgress?.({ done: i, total, currentId: draft.id });
    // Sequential to avoid quota/rate spikes.
    results.push(await postAiListingDraft(draft, opts));
  }
  if (total > 0) {
    opts?.onProgress?.({ done: total, total, currentId: null });
  }
  return results;
}
