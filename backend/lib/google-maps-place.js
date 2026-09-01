'use strict';

const {
  parseGoogleMapsLocation,
  extractPlaceQueryFromMapsUrl,
  forwardGeocodeQuery,
} = require('./google-maps-location');

const MAPS_HOST_RE =
  /^(?:www\.)?(?:google\.[a-z.]+|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)$/i;

const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.location',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.regularOpeningHours',
  'places.currentOpeningHours',
  'places.photos',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.types',
  'places.primaryType',
  'places.editorialSummary',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.businessStatus',
].join(',');

const PLACE_DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'shortFormattedAddress',
  'location',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'regularOpeningHours',
  'currentOpeningHours',
  'photos',
  'websiteUri',
  'googleMapsUri',
  'types',
  'primaryType',
  'editorialSummary',
  'rating',
  'userRatingCount',
  'priceLevel',
  'businessStatus',
].join(',');

const BUSINESS_TYPE_MAP = [
  { re: /\b(bakery|pastry|dessert|confectionery)\b/i, category: 'pasticeri' },
  { re: /\b(pizza|fast_food|meal_delivery|meal_takeaway|hamburger)\b/i, category: 'piceri-fast-food' },
  { re: /\b(brunch|breakfast)\b/i, category: 'brunch' },
  { re: /\b(cafe|coffee)\b/i, category: 'kafe' },
  { re: /\b(bar|pub|night_club|wine_bar|cocktail)\b/i, category: 'bar' },
  { re: /\b(restaurant|food|dining|bistro|grill|steakhouse|seafood)\b/i, category: 'restorant' },
];

function isGoogleMapsUrl(input) {
  try {
    const host = new URL(String(input || '').trim()).hostname.toLowerCase();
    if (!host) return false;
    if (MAPS_HOST_RE.test(host)) return true;
    return host.endsWith('.google.com') || host === 'google.com' || host.includes('maps.google.');
  } catch {
    return false;
  }
}

function extractPlaceNameFromMapsUrl(urlString) {
  const fromQuery = extractPlaceQueryFromMapsUrl(urlString);
  if (fromQuery && !/^\d/.test(fromQuery)) return fromQuery;
  try {
    const url = new URL(String(urlString || '').trim());
    const place = url.pathname.match(/\/place\/([^/@]+)/);
    if (place?.[1]) {
      const decoded = decodeURIComponent(place[1].replace(/\+/g, ' ')).trim();
      const name = decoded.split(',')[0].trim();
      if (name && name.length <= 120) return name;
    }
  } catch {
    /* ignore */
  }
  return fromQuery || null;
}

function extractPlaceIdFromMapsUrl(urlString) {
  const raw = String(urlString || '');
  const chij = raw.match(/(ChIJ[\w-]{20,})/);
  if (chij?.[1]) return chij[1];
  const dataChij = raw.match(/!1s(ChIJ[\w-]{20,})/);
  if (dataChij?.[1]) return dataChij[1];
  return null;
}

/** Google Places day: 0=Sun … 6=Sat → app day: 0=Mon … 6=Sun */
function googleDayToMonday0(googleDay) {
  const d = Number(googleDay);
  if (!Number.isInteger(d) || d < 0 || d > 6) return null;
  return d === 0 ? 6 : d - 1;
}

function formatHourMinute(hour, minute) {
  const h = Number(hour);
  const m = Number(minute) || 0;
  if (!Number.isInteger(h) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function convertGoogleOpeningHours(regularOpeningHours) {
  if (!regularOpeningHours || typeof regularOpeningHours !== 'object') {
    return { weeklyHours: [], openingHoursText: null, weekdayDescriptions: [] };
  }

  const weekdayDescriptions = Array.isArray(regularOpeningHours.weekdayDescriptions)
    ? regularOpeningHours.weekdayDescriptions.map((line) => String(line || '').trim()).filter(Boolean)
    : [];

  const periods = Array.isArray(regularOpeningHours.periods) ? regularOpeningHours.periods : [];
  const byDay = new Map();

  for (const period of periods) {
    const open = period?.open;
    const close = period?.close;
    if (!open) continue;
    const dayOfWeek = googleDayToMonday0(open.day);
    if (dayOfWeek == null) continue;
    const openTime = formatHourMinute(open.hour, open.minute);
    const closeTime = close ? formatHourMinute(close.hour, close.minute) : null;
    if (!openTime || !closeTime) continue;
    byDay.set(dayOfWeek, { dayOfWeek, closed: false, open: openTime, close: closeTime });
  }

  const weeklyHours = [];
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
    const row = byDay.get(dayOfWeek);
    if (row) {
      weeklyHours.push(row);
    } else {
      weeklyHours.push({ dayOfWeek, closed: true, open: null, close: null });
    }
  }

  const openingHoursText = weekdayDescriptions.length
    ? weekdayDescriptions.join('\n')
    : weeklyHours
        .filter((d) => !d.closed && d.open && d.close)
        .map((d) => `${d.open}–${d.close}`)
        .join(', ') || null;

  return { weeklyHours, openingHoursText, weekdayDescriptions };
}

function inferBusinessCategoryFromTypes(types) {
  const blob = (Array.isArray(types) ? types : []).join(' ');
  if (!blob.trim()) return null;
  for (const { re, category } of BUSINESS_TYPE_MAP) {
    if (re.test(blob)) return category;
  }
  return null;
}

function inferCityZoneFromAddress(address) {
  const text = String(address || '').trim();
  if (!text) return { cityName: null, zoneName: null };
  const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
  const cityName = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || null;
  const zoneName = parts.length >= 3 ? parts[parts.length - 3] : null;
  return { cityName, zoneName };
}

function getPlacesApiKey() {
  return String(process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim();
}

function placesFetch(url, { apiKey, fieldMask, body, signal }) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': fieldMask,
    'Accept-Language': 'sq,en',
  };
  return fetch(url, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
}

async function fetchPlaceDetailsById(placeId, { apiKey, signal }) {
  const id = String(placeId || '').trim();
  if (!id || !apiKey) return null;
  const res = await placesFetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
    apiKey,
    fieldMask: PLACE_DETAILS_FIELD_MASK,
    signal,
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data && typeof data === 'object' ? data : null;
}

async function searchPlaceByText({ textQuery, lat, lng, apiKey, signal }) {
  const q = String(textQuery || '').trim();
  if (!q || !apiKey) return null;
  const body = {
    textQuery: q,
    languageCode: 'sq',
    regionCode: 'AL',
  };
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 250,
      },
    };
  }
  const res = await placesFetch('https://places.googleapis.com/v1/places:searchText', {
    apiKey,
    fieldMask: PLACES_FIELD_MASK,
    body,
    signal,
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const place = Array.isArray(data?.places) ? data.places[0] : null;
  return place && typeof place === 'object' ? place : null;
}

function buildPhotoUrls(photos, apiKey, max = 8) {
  if (!apiKey || !Array.isArray(photos)) return [];
  const out = [];
  for (const photo of photos) {
    const name = String(photo?.name || '').trim();
    if (!name) continue;
    const url =
      `https://places.googleapis.com/v1/${name}/media` +
      `?maxHeightPx=1200&maxWidthPx=1200&key=${encodeURIComponent(apiKey)}`;
    out.push(url);
    if (out.length >= max) break;
  }
  return out;
}

function normalizePlaceRecord(place, { apiKey, parsedLocation, fallbackName }) {
  if (!place || typeof place !== 'object') return null;

  const name =
    String(place.displayName?.text || place.displayName || '').trim() ||
    fallbackName ||
    null;
  const formattedAddress =
    String(place.formattedAddress || place.shortFormattedAddress || parsedLocation?.locationAddress || '').trim() ||
    null;
  const lat = Number(place.location?.latitude ?? parsedLocation?.locationLat);
  const lng = Number(place.location?.longitude ?? parsedLocation?.locationLng);
  const phone =
    String(place.nationalPhoneNumber || place.internationalPhoneNumber || '').trim() || null;
  const website = String(place.websiteUri || '').trim() || null;
  const mapsUrl =
    String(place.googleMapsUri || parsedLocation?.mapsUrl || '').trim() || null;
  const types = Array.isArray(place.types) ? place.types.map(String) : [];
  const primaryType = String(place.primaryType || '').trim() || null;
  const editorialSummary = String(place.editorialSummary?.text || place.editorialSummary || '').trim() || null;
  const rating = Number.isFinite(Number(place.rating)) ? Number(place.rating) : null;
  const reviewCount = Number.isFinite(Number(place.userRatingCount)) ? Number(place.userRatingCount) : null;
  const priceLevel = place.priceLevel != null ? String(place.priceLevel) : null;
  const businessStatus = String(place.businessStatus || '').trim() || null;
  const { weeklyHours, openingHoursText, weekdayDescriptions } = convertGoogleOpeningHours(
    place.regularOpeningHours || place.currentOpeningHours
  );
  const imageUrls = buildPhotoUrls(place.photos, apiKey, 8);
  const { cityName, zoneName } = inferCityZoneFromAddress(formattedAddress);
  const businessCategory = inferBusinessCategoryFromTypes(types.length ? types : primaryType ? [primaryType] : []);

  return {
    placeId: String(place.id || '').replace(/^places\//, '') || null,
    name,
    phone,
    website,
    formattedAddress,
    locationAddress: formattedAddress,
    lat: Number.isFinite(lat) ? lat : parsedLocation?.locationLat ?? null,
    lng: Number.isFinite(lng) ? lng : parsedLocation?.locationLng ?? null,
    mapsUrl,
    types,
    primaryType,
    businessCategory,
    editorialSummary,
    rating,
    reviewCount,
    priceLevel,
    businessStatus,
    weeklyHours,
    openingHoursText,
    weekdayDescriptions,
    imageUrls,
    cityName,
    zoneName,
  };
}

function buildPlaceTextSummary(mapsPlace) {
  if (!mapsPlace) return '';
  const lines = ['Google Maps place data:'];
  if (mapsPlace.name) lines.push(`Name: ${mapsPlace.name}`);
  if (mapsPlace.formattedAddress) lines.push(`Address: ${mapsPlace.formattedAddress}`);
  if (mapsPlace.phone) lines.push(`Phone: ${mapsPlace.phone}`);
  if (mapsPlace.website) lines.push(`Website: ${mapsPlace.website}`);
  if (mapsPlace.primaryType) lines.push(`Primary type: ${mapsPlace.primaryType}`);
  if (mapsPlace.types?.length) lines.push(`Types: ${mapsPlace.types.join(', ')}`);
  if (mapsPlace.rating != null) {
    lines.push(
      `Rating: ${mapsPlace.rating}${mapsPlace.reviewCount != null ? ` (${mapsPlace.reviewCount} reviews)` : ''}`
    );
  }
  if (mapsPlace.priceLevel) lines.push(`Price level: ${mapsPlace.priceLevel}`);
  if (mapsPlace.businessStatus) lines.push(`Status: ${mapsPlace.businessStatus}`);
  if (mapsPlace.editorialSummary) lines.push(`About: ${mapsPlace.editorialSummary}`);
  if (mapsPlace.openingHoursText) lines.push(`Opening hours:\n${mapsPlace.openingHoursText}`);
  return lines.join('\n');
}

function buildPlaceDescription(mapsPlace) {
  if (!mapsPlace?.name) return null;
  const bullets = [];
  if (mapsPlace.formattedAddress) bullets.push(`• Adresa: ${mapsPlace.formattedAddress}`);
  if (mapsPlace.phone) bullets.push(`• Telefon: ${mapsPlace.phone}`);
  if (mapsPlace.openingHoursText) {
    const hoursLine = mapsPlace.weekdayDescriptions?.length
      ? mapsPlace.weekdayDescriptions.join(' · ')
      : mapsPlace.openingHoursText.replace(/\n/g, ' · ');
    bullets.push(`• Orari: ${hoursLine}`);
  }
  if (mapsPlace.website) bullets.push(`• Website: ${mapsPlace.website}`);
  if (mapsPlace.rating != null) {
    bullets.push(
      `• Vlerësim: ${mapsPlace.rating}/5${mapsPlace.reviewCount != null ? ` (${mapsPlace.reviewCount} vlerësime)` : ''}`
    );
  }
  if (mapsPlace.types?.length) bullets.push(`• Lloji: ${mapsPlace.types.slice(0, 4).join(', ')}`);

  const opener =
    mapsPlace.editorialSummary ||
    `${mapsPlace.name} — zbuloni më shumë për këtë vend në KuTaGjej.`;
  const body = bullets.length ? `${opener}\n\n${bullets.join('\n')}` : opener;
  return `${body}\n\nKontaktoni për më shumë detaje.`.slice(0, 1600);
}

async function fetchPlaceFromGoogleApi({ url, parsedLocation, placeName, signal }) {
  const apiKey = getPlacesApiKey();
  if (!apiKey) return null;

  const placeId = extractPlaceIdFromMapsUrl(url) || extractPlaceIdFromMapsUrl(parsedLocation?.mapsUrl || '');
  let place = null;
  if (placeId) {
    place = await fetchPlaceDetailsById(placeId.startsWith('places/') ? placeId : `places/${placeId}`, {
      apiKey,
      signal,
    });
  }
  if (!place) {
    const query = placeName || parsedLocation?.placeQuery;
    place = await searchPlaceByText({
      textQuery: query,
      lat: parsedLocation?.locationLat,
      lng: parsedLocation?.locationLng,
      apiKey,
      signal,
    });
  }
  if (!place) return null;
  return normalizePlaceRecord(place, {
    apiKey,
    parsedLocation,
    fallbackName: placeName || parsedLocation?.placeQuery || null,
  });
}

async function fetchPlaceFallback({ parsedLocation, placeName }) {
  const name = placeName || parsedLocation?.placeQuery || null;
  let formattedAddress = parsedLocation?.locationAddress || null;
  let cityName = null;
  let zoneName = null;

  if (formattedAddress) {
    const inferred = inferCityZoneFromAddress(formattedAddress);
    cityName = inferred.cityName;
    zoneName = inferred.zoneName;
  } else if (parsedLocation?.placeQuery && !parsedLocation?.locationLat) {
    const hit = await forwardGeocodeQuery(
      /\bshqip|albania\b/i.test(parsedLocation.placeQuery)
        ? parsedLocation.placeQuery
        : `${parsedLocation.placeQuery}, Albania`
    );
    if (hit) {
      formattedAddress = hit.displayName || formattedAddress;
      cityName = hit.city || cityName;
      zoneName = hit.suburb || zoneName;
    }
  } else if (Number.isFinite(parsedLocation?.locationLat) && Number.isFinite(parsedLocation?.locationLng)) {
    const hit = await forwardGeocodeQuery(`${parsedLocation.locationLat},${parsedLocation.locationLng}`);
    if (hit?.displayName) {
      formattedAddress = hit.displayName;
      cityName = hit.city || cityName;
      zoneName = hit.suburb || zoneName;
    }
  }

  return {
    placeId: null,
    name,
    phone: null,
    website: null,
    formattedAddress,
    locationAddress: formattedAddress,
    lat: parsedLocation?.locationLat ?? null,
    lng: parsedLocation?.locationLng ?? null,
    mapsUrl: parsedLocation?.mapsUrl || null,
    types: [],
    primaryType: null,
    businessCategory: null,
    editorialSummary: null,
    rating: null,
    reviewCount: null,
    priceLevel: null,
    businessStatus: null,
    weeklyHours: [],
    openingHoursText: null,
    weekdayDescriptions: [],
    imageUrls: [],
    cityName,
    zoneName,
  };
}

/**
 * Build an AI-import snapshot from a Google Maps URL (Places API when configured).
 * @returns {Promise<object>}
 */
async function fetchGoogleMapsPlaceSnapshot(url, parentSignal) {
  const parsed = await parseGoogleMapsLocation(url);
  if (!parsed.ok) {
    return {
      ok: false,
      status: 400,
      finalUrl: url,
      title: null,
      description: null,
      caption: null,
      authorName: null,
      text: parsed.message || 'Invalid Google Maps link.',
      imageUrls: [],
      social: false,
      isGoogleMaps: true,
      mapsPlace: null,
      fetchError: parsed.message || 'Invalid Google Maps link.',
    };
  }

  const placeName = extractPlaceNameFromMapsUrl(parsed.mapsUrl || url);
  let mapsPlace = null;
  try {
    mapsPlace = await fetchPlaceFromGoogleApi({
      url: parsed.mapsUrl || url,
      parsedLocation: parsed,
      placeName,
      signal: parentSignal,
    });
  } catch (err) {
    if (parentSignal?.aborted) throw err;
  }

  if (!mapsPlace) {
    mapsPlace = await fetchPlaceFallback({ parsedLocation: parsed, placeName });
  }

  const textSummary = buildPlaceTextSummary(mapsPlace);
  const description = buildPlaceDescription(mapsPlace);

  return {
    ok: Boolean(mapsPlace?.name || mapsPlace?.formattedAddress || parsed.locationLat),
    status: 200,
    finalUrl: parsed.mapsUrl || url,
    title: mapsPlace?.name || placeName || null,
    description,
    caption: description,
    authorName: null,
    text: textSummary.slice(0, 6000),
    imageUrls: mapsPlace?.imageUrls || [],
    social: false,
    isGoogleMaps: true,
    mapsPlace,
    fetchError: mapsPlace?.name ? null : 'Limited place data — add GOOGLE_PLACES_API_KEY for full details.',
  };
}

module.exports = {
  isGoogleMapsUrl,
  extractPlaceNameFromMapsUrl,
  extractPlaceIdFromMapsUrl,
  convertGoogleOpeningHours,
  inferBusinessCategoryFromTypes,
  fetchGoogleMapsPlaceSnapshot,
  getPlacesApiKey,
};
