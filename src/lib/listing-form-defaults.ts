import type { User } from '@/types/user';
import { AUTH_USER_KEY, readAuthItem } from '@/lib/auth/storage';
import { BUSINESS_CATEGORY_OPTIONS } from '@/lib/business-constants';

const LOCATION_STORAGE_KEY = 'listing-location-defaults';

/** Sync read of cached profile phone (available before `useUser` hydrates). */
export function contactPhoneFromStorage(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = readAuthItem(AUTH_USER_KEY);
    if (!raw) return '';
    const u = JSON.parse(raw) as { phone?: string };
    return typeof u.phone === 'string' ? u.phone.trim() : '';
  } catch {
    return '';
  }
}

export function contactPhoneFromUser(user: Pick<User, 'phone'> | null | undefined): string {
  return typeof user?.phone === 'string' ? user.phone.trim() : '';
}

/** Prefer live user profile, then localStorage cache. */
export function resolveContactPhone(user: Pick<User, 'phone'> | null | undefined): string {
  return contactPhoneFromUser(user) || contactPhoneFromStorage();
}

export function basedCityFromUser(
  user: Pick<User, 'basedCityId' | 'basedCityName'> | null | undefined,
): { cityId: string; cityName: string } {
  const cityId = typeof user?.basedCityId === 'string' ? user.basedCityId.trim() : '';
  const cityName = typeof user?.basedCityName === 'string' ? user.basedCityName.trim() : '';
  return { cityId, cityName };
}

/** Sync read of cached based city (available before `useUser` hydrates). */
export function basedCityFromStorage(): { cityId: string; cityName: string } {
  if (typeof window === 'undefined') return { cityId: '', cityName: '' };
  try {
    const raw = readAuthItem(AUTH_USER_KEY);
    if (!raw) return { cityId: '', cityName: '' };
    return basedCityFromUser(JSON.parse(raw) as User);
  } catch {
    return { cityId: '', cityName: '' };
  }
}

/** Prefer live user profile based city, then localStorage cache. */
export function resolveBasedCity(
  user: Pick<User, 'basedCityId' | 'basedCityName'> | null | undefined,
): { cityId: string; cityName: string } {
  const fromUser = basedCityFromUser(user);
  if (fromUser.cityId) return fromUser;
  return basedCityFromStorage();
}

/** Professional profile title from individual name or business name. */
export function professionalTitleFromUser(
  user: Pick<User, 'firstName' | 'lastName' | 'businessName'> | null | undefined,
): string {
  if (!user) return '';
  const business = typeof user.businessName === 'string' ? user.businessName.trim() : '';
  if (business) return business;
  const name = [user.firstName, user.lastName]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
    .join(' ');
  return name;
}

export function businessTitleFromUser(user: Pick<User, 'businessName'> | null | undefined): string {
  return typeof user?.businessName === 'string' ? user.businessName.trim() : '';
}

/**
 * Map free-text signup/profile business category onto listing option values when possible.
 */
export function businessCategoryFromUser(
  user: Pick<User, 'businessCategory'> | null | undefined,
): string {
  const raw = typeof user?.businessCategory === 'string' ? user.businessCategory.trim() : '';
  if (!raw) return '';
  const lower = raw.toLowerCase();
  const exactValue = BUSINESS_CATEGORY_OPTIONS.find((o) => o.value === lower);
  if (exactValue) return exactValue.value;
  const exactLabel = BUSINESS_CATEGORY_OPTIONS.find((o) => o.label.toLowerCase() === lower);
  if (exactLabel) return exactLabel.value;
  const partial = BUSINESS_CATEGORY_OPTIONS.find(
    (o) => lower.includes(o.label.toLowerCase()) || o.label.toLowerCase().includes(lower),
  );
  return partial?.value ?? '';
}

/** Cached profile snapshot for create-form initial state (SSR-safe). */
export function profileDefaultsFromStorage(): {
  phone: string;
  title: string;
  businessName: string;
  businessCategory: string;
  firstName: string;
  lastName: string;
} {
  if (typeof window === 'undefined') {
    return { phone: '', title: '', businessName: '', businessCategory: '', firstName: '', lastName: '' };
  }
  try {
    const raw = readAuthItem(AUTH_USER_KEY);
    if (!raw) {
      return { phone: '', title: '', businessName: '', businessCategory: '', firstName: '', lastName: '' };
    }
    const u = JSON.parse(raw) as User;
    return {
      phone: contactPhoneFromUser(u),
      title: professionalTitleFromUser(u),
      businessName: businessTitleFromUser(u),
      businessCategory: businessCategoryFromUser(u),
      firstName: typeof u.firstName === 'string' ? u.firstName.trim() : '',
      lastName: typeof u.lastName === 'string' ? u.lastName.trim() : '',
    };
  } catch {
    return { phone: '', title: '', businessName: '', businessCategory: '', firstName: '', lastName: '' };
  }
}

export type ListingLocationDefaults = {
  cityId: string;
  zoneId: string;
  cityName: string;
  userId: string;
};

function emptyLocationDefaults(): ListingLocationDefaults {
  return { cityId: '', zoneId: '', cityName: '', userId: '' };
}

/** Last-used listing location (fallback when profile has no based city). */
export function locationDefaultsFromStorage(userId?: string | null): ListingLocationDefaults {
  if (typeof window === 'undefined') return emptyLocationDefaults();
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return emptyLocationDefaults();
    const parsed = JSON.parse(raw) as Partial<ListingLocationDefaults>;
    const storedUserId = typeof parsed.userId === 'string' ? parsed.userId : '';
    if (userId && storedUserId && storedUserId !== userId) return emptyLocationDefaults();
    return {
      cityId: typeof parsed.cityId === 'string' ? parsed.cityId.trim() : '',
      zoneId: typeof parsed.zoneId === 'string' ? parsed.zoneId.trim() : '',
      cityName: typeof parsed.cityName === 'string' ? parsed.cityName.trim() : '',
      userId: storedUserId,
    };
  } catch {
    return emptyLocationDefaults();
  }
}

/** Persist city/zone after a successful create so the next listing starts prefilled. */
export function rememberListingLocation(
  loc: { cityId?: string | null; zoneId?: string | null; cityName?: string | null },
  userId?: string | null,
): void {
  if (typeof window === 'undefined') return;
  const cityId = typeof loc.cityId === 'string' ? loc.cityId.trim() : '';
  if (!cityId) return;
  const next: ListingLocationDefaults = {
    cityId,
    zoneId: typeof loc.zoneId === 'string' ? loc.zoneId.trim() : '',
    cityName: typeof loc.cityName === 'string' ? loc.cityName.trim() : '',
    userId: typeof userId === 'string' ? userId : '',
  };
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export type CreateListingKnownDefaults = {
  contactPhone: string;
  cityId: string;
  zoneId: string;
  cityName: string;
};

/** Sync snapshot of known defaults for create forms / AI drafts (empty-only apply). */
export function knownCreateDefaultsFromStorage(userId?: string | null): CreateListingKnownDefaults {
  const fromProfile = basedCityFromStorage();
  const loc = locationDefaultsFromStorage(userId);
  return {
    contactPhone: contactPhoneFromStorage(),
    cityId: fromProfile.cityId || loc.cityId,
    zoneId: fromProfile.cityId && fromProfile.cityId !== loc.cityId ? '' : loc.zoneId,
    cityName: fromProfile.cityName || loc.cityName,
  };
}

/**
 * Fill only empty create fields from known profile / last-listing defaults.
 * Never overwrites values the user or AI already set.
 */
export function applyEmptyKnownDefaults<T extends Record<string, unknown>>(
  form: T,
  defaults: CreateListingKnownDefaults,
  opts?: { withZone?: boolean },
): T {
  const next = { ...form };
  const hasMapLocation =
    Boolean(String(next.locationAddress ?? '').trim()) || Boolean(String(next.mapsUrl ?? '').trim());
  const phone = String(next.contactPhone ?? '').trim();
  if (!phone && defaults.contactPhone) {
    (next as Record<string, unknown>).contactPhone = defaults.contactPhone;
  }

  const cityId = String(next.cityId ?? '').trim();
  if (!cityId && defaults.cityId && !hasMapLocation) {
    (next as Record<string, unknown>).cityId = defaults.cityId;
  }

  if (opts?.withZone && !hasMapLocation) {
    const resolvedCity = String(next.cityId ?? '').trim();
    const zoneId = String(next.zoneId ?? '').trim();
    if (!zoneId && defaults.zoneId && resolvedCity && resolvedCity === defaults.cityId) {
      (next as Record<string, unknown>).zoneId = defaults.zoneId;
    }
  }

  const cityName = String(next.cityName ?? '').trim();
  if (!cityName && defaults.cityName && !hasMapLocation) {
    (next as Record<string, unknown>).cityName = defaults.cityName;
  }

  return next;
}
