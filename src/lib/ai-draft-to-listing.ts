import type { AiListingDraft } from '@/lib/ai-listing-draft';
import { normalizeFuelType } from '@/lib/car-constants';
import {
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import { applyEmptyKnownDefaults, knownCreateDefaultsFromStorage } from '@/lib/listing-form-defaults';
import {
  isValidVehicleMake,
  isValidVehicleModel,
  isVehicleType,
  parseCarDetailsFromTitleOrText,
  type VehicleType,
} from '@/lib/vehicle-catalog';

function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string {
  return value == null ? '' : String(value);
}

function knownOption(value: unknown, options: readonly { value: string }[]): string {
  const candidate = str(value).trim();
  return options.some((option) => option.value === candidate) ? candidate : '';
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
      return withKnownDefaults(
        {
          id: draft.id,
          title: str(f.title) || draft.title,
          description: str(f.description),
          propertyCategory: str(f.propertyCategory),
          transactionType: f.transactionType === 'rent' || f.transactionType === 'sale' ? f.transactionType : 'sale',
          price: num(f.price),
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
        },
        true
      );

    case 'cars': {
      let vehicleType = str(f.vehicleType);
      let make = str(f.make);
      let model = str(f.model);
      let variant = str(f.variant);

      // If make or model is missing/invalid, parse from title, summary, or description
      const blob = [draft.title, draft.summary, str(f.description)].filter(Boolean).join(' ');
      const parsed = parseCarDetailsFromTitleOrText(blob, isVehicleType(vehicleType) ? vehicleType : undefined);

      if (!vehicleType && parsed.vehicleType) {
        vehicleType = parsed.vehicleType;
      }
      if (!isVehicleType(vehicleType) && parsed.vehicleType) {
        vehicleType = parsed.vehicleType;
      }
      const activeVType = (isVehicleType(vehicleType) ? vehicleType : 'car') as VehicleType;

      if (!make || !isValidVehicleMake(activeVType, make)) {
        if (parsed.make && isValidVehicleMake(activeVType, parsed.make)) {
          make = parsed.make;
        }
      }
      if (make && (!model || !isValidVehicleModel(activeVType, make, model))) {
        if (parsed.model && isValidVehicleModel(activeVType, make, parsed.model)) {
          model = parsed.model;
        }
      }
      if (!variant && parsed.variant) {
        variant = parsed.variant;
      }

      return withKnownDefaults({
        id: draft.id,
        // Prefer inferred/catalog type or leave empty for user selection
        vehicleType: vehicleType || (make ? activeVType : ''),
        make,
        model,
        variant,
        description: str(f.description),
        year: num(f.year),
        kilometers: num(f.kilometers),
        transmission: f.transmission === 'automatic' || f.transmission === 'manual' ? f.transmission : null,
        fuelType: normalizeFuelType(f.fuelType),
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

    case 'job-listings': {
      const locationAddress = str(f.locationAddress) || null;
      const mapsUrl = str(f.mapsUrl) || null;
      const hasMapLocation = Boolean(locationAddress || mapsUrl);
      return withKnownDefaults(
        {
          id: draft.id,
          title: str(f.title) || draft.title,
          description: str(f.description),
          industry: str(f.industry),
          cityId: hasMapLocation ? null : str(f.cityId) || null,
          cityName: draft.cityName || str(f.cityName) || null,
          zoneId: hasMapLocation ? null : str(f.zoneId) || null,
          zoneName: draft.zoneName || str(f.zoneName) || null,
          locationAddress,
          locationLat: num(f.locationLat),
          locationLng: num(f.locationLng),
          mapsUrl,
          locationMode: hasMapLocation ? 'map' : '',
          education: knownOption(f.education, JOB_EDUCATION_OPTIONS),
          experience: knownOption(f.experience, JOB_EXPERIENCE_OPTIONS),
          jobType: knownOption(f.jobType, JOB_TYPE_OPTIONS),
          workLocation: knownOption(f.workLocation, WORK_LOCATION_OPTIONS),
          preferredGender:
            f.preferredGender === 'male' || f.preferredGender === 'female' || f.preferredGender === 'both'
              ? f.preferredGender
              : '',
          preferredAgeMin: num(f.preferredAgeMin),
          preferredAgeMax: num(f.preferredAgeMax),
          salary: num(f.salary),
          currency: f.currency === 'LEK' ? 'LEK' : f.currency === 'EUR' ? 'EUR' : null,
          contactPhone: str(f.contactPhone),
          responsibilities: Array.isArray(f.responsibilities) ? f.responsibilities.map(String) : [],
          requirements: Array.isArray(f.requirements) ? f.requirements.map(String) : [],
          benefitIds: [],
          imageUrls,
        },
        !hasMapLocation
      );
    }

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

    case 'businesses': {
      const locationAddress = str(f.locationAddress) || null;
      const mapsUrl = str(f.mapsUrl) || null;
      const hasMapLocation = Boolean(locationAddress || mapsUrl);
      return withKnownDefaults(
        {
          title: str(f.title) || draft.title,
          description: str(f.description),
          category: str(f.category),
          cityId: hasMapLocation ? '' : str(f.cityId) || '',
          zoneId: hasMapLocation ? '' : str(f.zoneId) || '',
          zoneName: draft.zoneName || str(f.zoneName) || null,
          locationAddress,
          locationLat: num(f.locationLat),
          locationLng: num(f.locationLng),
          mapsUrl,
          locationMode: hasMapLocation ? 'map' : '',
          contactPhone: str(f.contactPhone),
          servicesHighlight: str(f.servicesHighlight),
          weeklyHours: Array.isArray(f.weeklyHours) ? f.weeklyHours : undefined,
          imageUrls,
        },
        !hasMapLocation
      );
    }

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
  patch: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...current };

  for (const [key, value] of Object.entries(patch)) {
    if (key === 'id' || key === 'status' || key === 'createdAt' || key === 'updatedAt') continue;
    if (value == null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0 && key !== 'imageUrls') continue;
    if (typeof value === 'number' && value === 0) {
      const cur = next[key];
      if (cur != null && cur !== '' && cur !== 0 && cur !== '0') continue;
    }
    next[key] = value;
  }

  if (Array.isArray(patch.imageUrls) && patch.imageUrls.length > 0) {
    next.imageUrls = patch.imageUrls;
  }

  return next;
}
