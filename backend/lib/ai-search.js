'use strict';

const { getSupabaseAdmin } = require('./supabase');
const {
  parseRealEstateFilters,
  parseCarFilters,
  parseJobFilters,
  parseMarketplaceFilters,
  parseDirectoryFilters,
} = require('./public-listings/listing-filters');
const {
  queryRealEstate,
  countRealEstate,
  queryCars,
  countCars,
  queryJobs,
  countJobs,
  queryMarketplace,
  countMarketplace,
  queryDirectory,
  countDirectory,
} = require('./public-listings/latest-queries');

const VERTICALS = [
  'real-estate',
  'cars',
  'jobs',
  'marketplace',
  'businesses',
  'professionals',
];

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function isOpenAiConfigured() {
  return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
}

function clampLimit(value, fallback = 24) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, 48);
}

function normalizeLocationName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ë/g, 'e')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

function locationTokens(value) {
  return normalizeLocationName(value)
    .split(/\s+/)
    .filter((t) => t && t !== 'e' && t !== 'te' && t !== 'ne' && t !== 'i' && t !== 'a');
}

function locationNamesMatch(a, b) {
  const left = normalizeLocationName(a);
  const right = normalizeLocationName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const leftTokens = locationTokens(left);
  const rightTokens = locationTokens(right);
  if (!leftTokens.length || !rightTokens.length) return false;
  const [shorter, longer] =
    leftTokens.length <= rightTokens.length ? [leftTokens, rightTokens] : [rightTokens, leftTokens];
  return shorter.every((token) => longer.some((other) => other === token || other.includes(token) || token.includes(other)));
}

/**
 * Resolve a free-text place name to a city id and optional zone id.
 * Matches city names first, then nested zone names (e.g. "Komuna e Parisit").
 */
async function resolveLocationByName(placeName) {
  const name = String(placeName || '').trim();
  if (!name) return null;
  const needle = normalizeLocationName(name);
  if (!needle) return null;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('real_estate_cities').select('id, name, zones');
  if (error) throw error;
  if (!data?.length) return null;

  let bestCity = null;
  let bestZone = null;

  for (const city of data) {
    if (locationNamesMatch(needle, city.name)) {
      const cityNorm = normalizeLocationName(city.name);
      if (!bestCity || cityNorm.length > normalizeLocationName(bestCity.name).length) {
        bestCity = city;
      }
    }
    for (const zone of city.zones || []) {
      if (!locationNamesMatch(needle, zone.name)) continue;
      const zoneNorm = normalizeLocationName(zone.name);
      if (!bestZone || zoneNorm.length > normalizeLocationName(bestZone.zone.name).length) {
        bestZone = { city, zone };
      }
    }
  }

  // Prefer an exact/longer zone match over a broader city match when both hit.
  if (bestZone) {
    return { cityId: bestZone.city.id, zoneId: bestZone.zone.id };
  }
  if (bestCity) {
    return { cityId: bestCity.id };
  }
  return null;
}

function buildSystemPrompt(language) {
  const lang = language === 'en' ? 'English' : 'Albanian';
  return `You are KuTaGjej's listing search assistant for Albania.
Users ask in natural language (like ChatGPT). Your job is to understand what they want and extract a structured search plan.

Reply language for the "reply" field: ${lang}.

Categories (verticals):
- real-estate: apartments, houses, villas, offices, shops, land (sale/rent)
- cars: cars, motorcycles, vehicles
- jobs: job openings, employment
- marketplace: electronics, furniture, clothes, toys, general goods
- businesses: restaurants, bars, cafés, local businesses
- professionals: freelancers, doctors, lawyers, consultants, services

Return ONLY valid JSON (no markdown) with this shape:
{
  "reply": "short helpful sentence acknowledging the request and what you will look for",
  "verticals": ["cars"],
  "q": "keywords for text search",
  "filters": {
    "cityName": "city name like Tirana, Durres — or null",
    "zoneName": "neighborhood/area like Komuna e Parisit, Blloku — or null",
    "maxPrice": "number string or null",
    "minPrice": "number string or null",
    "tx": "rent|sale|null",
    "cat": "property or marketplace category slug or null",
    "make": "car make or null",
    "fuel": "petrol|diesel|electric|hybrid-petrol|plugin-hybrid|lpg|null",
    "transmission": "manual|automatic|null",
    "minYear": "number string or null",
    "maxYear": "number string or null",
    "maxKm": "number string or null",
    "bedrooms": "number string or null",
    "minSurface": "number string or null",
    "industry": "job industry slug or null",
    "jobType": "full-time|part-time|remote|internship|freelance|null",
    "type": "business or professional type slug or null"
  }
}

Rules:
- Pick 1 most relevant vertical first (primary). You may add 1–2 secondary guesses.
- Put leftover free-text keywords in "q" (brand, model, role title, product name). Do not put city/zone/price into q when they fit filter fields.
- For houses/apartments use vertical "real-estate". Apartments → cat "apartment"; villas/houses → cat "villa". Rent → tx "rent"; sale → tx "sale".
- Put area names like "Komuna e Parisit" / "Blloku" in zoneName; city names like "Tiranë" in cityName.
- Use null for unknown filter fields.
- Keep "reply" concise (1–2 sentences). Do not invent listing results.`;
}

async function interpretQuery(query, language = 'sq') {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not configured');
    err.status = 503;
    throw err;
  }

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(language) },
        { role: 'user', content: String(query || '').trim() },
      ],
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      payload?.error?.message || `OpenAI request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw err;
  }

  const raw = payload?.choices?.[0]?.message?.content;
  let parsed;
  try {
    parsed = JSON.parse(typeof raw === 'string' ? raw : '{}');
  } catch {
    parsed = {};
  }

  const verticals = Array.isArray(parsed.verticals)
    ? parsed.verticals.filter((v) => VERTICALS.includes(v))
    : [];

  return {
    reply:
      typeof parsed.reply === 'string' && parsed.reply.trim()
        ? parsed.reply.trim()
        : language === 'en'
          ? 'Looking for matching listings…'
          : 'Po kërkoj njoftime që përputhen…',
    verticals: verticals.length ? verticals : [...VERTICALS],
    q: typeof parsed.q === 'string' ? parsed.q.trim() : String(query || '').trim(),
    filters: parsed.filters && typeof parsed.filters === 'object' ? parsed.filters : {},
  };
}

function filterValue(filters, key) {
  const value = filters?.[key];
  if (value == null) return undefined;
  const str = String(value).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return undefined;
  return str;
}

async function buildQueryParams(intent) {
  const filters = intent.filters || {};
  const params = {};
  const q = String(intent.q || '').trim();
  if (q) params.q = q;

  for (const key of [
    'maxPrice',
    'minPrice',
    'tx',
    'cat',
    'make',
    'fuel',
    'transmission',
    'minYear',
    'maxYear',
    'maxKm',
    'bedrooms',
    'minSurface',
    'industry',
    'jobType',
    'type',
  ]) {
    const value = filterValue(filters, key);
    if (value) params[key] = value;
  }

  const zoneName = filterValue(filters, 'zoneName');
  const cityName = filterValue(filters, 'cityName');

  if (zoneName) {
    const location = await resolveLocationByName(zoneName);
    if (location?.cityId) params.city = location.cityId;
    if (location?.zoneId) params.zone = location.zoneId;
  }

  if (!params.city && cityName) {
    const location = await resolveLocationByName(cityName);
    if (location?.cityId) params.city = location.cityId;
    if (location?.zoneId && !params.zone) params.zone = location.zoneId;
  }

  return params;
}

async function searchVertical(vertical, params, perVertical) {
  switch (vertical) {
    case 'real-estate': {
      const { filter, sort } = parseRealEstateFilters(params);
      const [listings, total] = await Promise.all([
        queryRealEstate(perVertical, filter, sort, 0),
        countRealEstate(filter),
      ]);
      return {
        items: listings.map((listing) => ({ kind: 'real-estate', listing })),
        total,
      };
    }
    case 'cars': {
      const { filter, sort } = parseCarFilters(params);
      const [listings, total] = await Promise.all([
        queryCars(perVertical, filter, sort, 0),
        countCars(filter),
      ]);
      return {
        items: listings.map((listing) => ({ kind: 'car', listing })),
        total,
      };
    }
    case 'jobs': {
      const { filter, sort } = parseJobFilters(params);
      const [listings, total] = await Promise.all([
        queryJobs(perVertical, filter, sort, 0),
        countJobs(filter),
      ]);
      return {
        items: listings.map((listing) => ({ kind: 'job', listing })),
        total,
      };
    }
    case 'marketplace': {
      const { filter, sort } = parseMarketplaceFilters(params);
      const [listings, total] = await Promise.all([
        queryMarketplace(perVertical, filter, sort, 0),
        countMarketplace(filter),
      ]);
      return {
        items: listings.map((listing) => ({ kind: 'marketplace', listing })),
        total,
      };
    }
    case 'businesses': {
      const { filter, sort } = parseDirectoryFilters(params, 'businesses');
      const [listings, total] = await Promise.all([
        queryDirectory('businesses', perVertical, filter, sort, 0),
        countDirectory(filter),
      ]);
      return {
        items: listings.map((listing) => ({ kind: 'businesses', listing })),
        total,
      };
    }
    case 'professionals': {
      const { filter, sort } = parseDirectoryFilters(params, 'professionals');
      const [listings, total] = await Promise.all([
        queryDirectory('professionals', perVertical, filter, sort, 0),
        countDirectory(filter),
      ]);
      return {
        items: listings.map((listing) => ({ kind: 'professionals', listing })),
        total,
      };
    }
    default:
      return { items: [], total: 0 };
  }
}

/**
 * Natural-language search: OpenAI interprets the query, then we run structured
 * public listing queries across the relevant verticals.
 * When interpretOnly is true, skip listing queries (used to redirect to browse).
 */
async function runAiSearch({ query, language = 'sq', limit = 24, interpretOnly = false }) {
  const trimmed = String(query || '').trim();
  if (!trimmed) {
    return {
      reply: language === 'en' ? 'Tell me what you are looking for.' : 'Më thuaj çfarë po kërkon.',
      intent: { verticals: [], q: '', filters: {} },
      items: [],
      total: 0,
    };
  }

  const intent = await interpretQuery(trimmed, language);
  const params = await buildQueryParams(intent);
  const verticals = intent.verticals.length ? intent.verticals : [...VERTICALS];
  const resolvedIntent = {
    verticals,
    q: params.q || '',
    filters: params,
  };

  if (interpretOnly) {
    return {
      reply: intent.reply,
      intent: resolvedIntent,
      items: [],
      total: 0,
    };
  }

  const capped = clampLimit(limit, 24);
  const perVertical = Math.max(4, Math.ceil(capped / verticals.length));

  const batches = await Promise.all(
    verticals.map((vertical) => searchVertical(vertical, params, perVertical)),
  );

  const items = [];
  let total = 0;
  for (const batch of batches) {
    total += batch.total;
    for (const item of batch.items) {
      items.push(item);
      if (items.length >= capped) break;
    }
    if (items.length >= capped) break;
  }

  return {
    reply: intent.reply,
    intent: resolvedIntent,
    items,
    total,
  };
}

module.exports = {
  isOpenAiConfigured,
  runAiSearch,
  VERTICALS,
};
