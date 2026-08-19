import type { AiListingDraft } from '@/lib/ai-listing-draft';
import { applyEmptyKnownDefaults, knownCreateDefaultsFromStorage } from '@/lib/listing-form-defaults';

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string {
  return value == null ? '' : String(value);
}

function withKnownDefaults(record: Record<string, unknown>, withZone = false): Record<string, unknown> {
  return applyEmptyKnownDefaults(record, knownCreateDefaultsFromStorage(), { withZone });
}

/** Shape AI draft fields into the mine-listing objects forms already understand. */
export function aiDraftToInitialListing(draft: AiListingDraft): Record<string, unknown> {
  const f = draft.form || {};
  const imageUrls = (draft.imageUrls || []).filter(Boolean);

  switch (draft.category) {
    case 'real-estate':
      return withKnownDefaults({
        id: draft.id,
        title: str(f.title) || draft.title,
        description: str(f.description),
        propertyCategory: str(f.propertyCategory),
        transactionType: f.transactionType === 'rent' || f.transactionType === 'sale' ? f.transactionType : 'sale',
        price: num(f.price) ?? 0,
        currency: f.currency === 'LEK' ? 'LEK' : 'EUR',
        surfaceM2: num(f.surfaceM2),
        cityName: draft.cityName || str(f.cityName) || null,
        zoneName: str(f.zoneName) || null,
        cityId: str(f.cityId) || null,
        zoneId: str(f.zoneId) || null,
        contactPhone: str(f.contactPhone) || null,
        condition: str(f.condition) || null,
        apartmentTypeSlug: null,
        floor: num(f.floor),
        totalFloors: num(f.totalFloors),
        parkingFloor: num(f.parkingFloor),
        bedrooms: num(f.bedrooms),
        bathrooms: num(f.bathrooms),
        furnishing: str(f.furnishing) || null,
        yearBuilt: num(f.yearBuilt),
        imageUrls,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, true);

    case 'cars': {
      const vehicleType = str(f.vehicleType);
      return withKnownDefaults({
        id: draft.id,
        // Prefer empty over wrong default "car" when AI left type unset.
        vehicleType: vehicleType || '',
        make: str(f.make),
        model: str(f.model),
        variant: str(f.variant),
        description: str(f.description),
        year: num(f.year),
        kilometers: num(f.kilometers),
        transmission: f.transmission === 'automatic' || f.transmission === 'manual' ? f.transmission : null,
        fuelType: str(f.fuelType),
        price: num(f.price),
        currency: f.currency === 'LEK' ? 'LEK' : f.currency === 'EUR' ? 'EUR' : null,
        color: str(f.color),
        finish: [],
        extras: Array.isArray(f.extras) ? f.extras.map(String) : [],
        contactPhone: str(f.contactPhone),
        cityId: str(f.cityId) || null,
        cityName: draft.cityName || null,
        imageUrls: imageUrls.slice(0, 8),
      });
    }

    case 'job-listings':
      return withKnownDefaults({
        id: draft.id,
        title: str(f.title) || draft.title,
        description: str(f.description),
        industry: str(f.industry),
        cityId: str(f.cityId) || null,
        cityName: draft.cityName || null,
        education: str(f.education),
        experience: str(f.experience),
        jobType: str(f.jobType),
        workLocation: str(f.workLocation),
        salary: num(f.salary),
        currency: f.currency === 'LEK' ? 'LEK' : f.currency === 'EUR' ? 'EUR' : null,
        contactPhone: str(f.contactPhone),
        responsibilities: Array.isArray(f.responsibilities) ? f.responsibilities.map(String) : [],
        requirements: Array.isArray(f.requirements) ? f.requirements.map(String) : [],
        benefitIds: [],
        imageUrls,
      });

    case 'marketplace':
      return withKnownDefaults({
        id: draft.id,
        title: str(f.title) || draft.title,
        description: str(f.description),
        transactionType: str(f.transactionType) || 'shes',
        category: str(f.category),
        condition: str(f.condition),
        price: num(f.price),
        currency: f.currency === 'LEK' ? 'LEK' : f.currency === 'EUR' ? 'EUR' : null,
        cityId: str(f.cityId) || null,
        cityName: draft.cityName || null,
        contactPhone: str(f.contactPhone),
        imageUrls,
      });

    case 'businesses':
      return withKnownDefaults({
        title: str(f.title) || draft.title,
        description: str(f.description),
        category: str(f.category),
        cityId: str(f.cityId) || '',
        contactPhone: str(f.contactPhone),
        servicesHighlight: str(f.servicesHighlight),
        imageUrls,
      });

    case 'professionals':
      return withKnownDefaults({
        title: str(f.title) || draft.title,
        description: str(f.description),
        category: str(f.category),
        cityId: str(f.cityId) || '',
        contactPhone: str(f.contactPhone),
        servicesHighlight: str(f.servicesHighlight),
        responseTimeHours: str(f.responseTimeHours) || '2',
        price: str(f.price),
        currency: f.currency === 'LEK' || f.currency === 'EUR' ? f.currency : '',
        imageUrls,
      });

    default:
      return withKnownDefaults({ title: draft.title, description: '', imageUrls });
  }
}

/**
 * Merge an AI-produced initial shape into an existing mine listing for edit mode.
 * Keeps identity fields (id, status, dates) and only overwrites provided values.
 */
export function mergeAiIntoListing(
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...current };

  for (const [key, value] of Object.entries(patch)) {
    if (key === 'id' || key === 'status' || key === 'createdAt' || key === 'updatedAt') continue;
    if (value == null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0 && key !== 'imageUrls') continue;
    next[key] = value;
  }

  if (Array.isArray(patch.imageUrls) && patch.imageUrls.length > 0) {
    next.imageUrls = patch.imageUrls;
  }

  return next;
}
