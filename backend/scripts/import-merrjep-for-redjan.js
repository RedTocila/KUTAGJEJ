'use strict';

/**
 * One-off: scrape MerrJep apartment links (listing photos only) and create
 * real-estate listings for redjan.t13@gmail.com. Does not use OpenAI.
 *
 *   node scripts/import-merrjep-for-redjan.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const API = process.env.API_BASE_URL || 'http://127.0.0.1:5001/api';
const EMAIL = 'redjan.t13@gmail.com';
const PASSWORD = process.env.REDJAN_PASSWORD || 'Komardarja_1';

const URLS = [
  'https://www.merrjep.al/njoftim/apartament-ne-shitje-1+1-aos-construcion-astir/19425492',
  'https://www.merrjep.al/njoftim/apartament-me-qira-2+1+2-pazari-ri-tirane/19497254',
  'https://www.merrjep.al/njoftim/apartament-ne-shitje-1+1+garderobe-tulipan-rezidence/19382854',
  'https://www.merrjep.al/njoftim/apartament-me-qira-2+1+2-pazari-ri-tirane/19497246',
  'https://www.merrjep.al/njoftim/shitet-super-apartament-te-square-21-1+1/19316852',
];

const LISTINGS = {
  '19425492': {
    title: 'Apartament në shitje 1+1 – AOS Construction, Astir',
    transactionType: 'sale',
    price: 92500,
    surfaceM2: 63,
    floor: 3,
    bedrooms: 1,
    bathrooms: 1,
    condition: 'new',
    zoneHint: 'Astir',
    description: `Apartament 1+1 për shitje – AOS Residence, Astir.

Rezidencë moderne në një zonë shumë të kërkuar të Astirit.

• Çmimi total: 92,500 €
• 5,000 € paguhen pas daljes së hipotekës (si garanci)
• Sipërfaqe bruto: 62.8 m²
• Kati: 3 banim
• Në fazën e zgjedhjes së parketit ose pllakave

Organizimi:
• Sallon ndenje
• Ambient gatimi + ngrënie
• 1 dhomë gjumi
• 1 tualet
• Ballkon

Avantazhe: ndërtim i ri, kati i ulët, mundësi personalizimi të finiturave, ideal për banim ose investim.`,
  },
  '19497254': {
    title: 'Apartament me qira 2+1+2 – Pazari i Ri, Tiranë',
    transactionType: 'rent',
    price: 900,
    surfaceM2: 98,
    floor: 6,
    bedrooms: 2,
    bathrooms: 2,
    condition: 'new',
    zoneHint: 'Pazari i Ri',
    description: `Apartament 2+1+2 me qira – Pazari i Ri.

Jepet me qira apartament modern në një nga zonat më të preferuara të Tiranës.

• Tipologjia: 2+1+2
• Sipërfaqe: 98 m²
• Kati: 6
• Pallat i ri me ashensor
• Çmimi: 900 €/muaj

Organizimi:
• Sallon ndenjeje i bollshëm
• Ambient gatimi i veçuar
• 2 dhoma gjumi
• 2 tualete
• Ballkon`,
  },
  '19382854': {
    title: 'Apartament në shitje 1+1+garderobë – Tulipan Residence',
    transactionType: 'sale',
    price: 181440,
    surfaceM2: 86.4,
    floor: 1,
    bedrooms: 1,
    bathrooms: 1,
    condition: 'new',
    zoneHint: 'Tulipan',
    description: `Apartament në shitje 1+1 – Tulipan Residence.

• Sipërfaqe: 86.4 m²
• Çmimi: 2,100 €/m² (total ~181,440 €)
• Parkim: 25,000 € (opsional)
• Kati: 1 banim
• Faza: përfundimtare (gati për mobilim)

Organizimi:
• Sallon + kuzhinë
• 1 dhomë gjumi
• 1 tualet
• Ballkon

Ndërtim cilësor, zonë e qetë — ideal për banim ose investim.`,
  },
  '19497246': {
    title: 'Apartament me qira 2+1+2 – Pazari i Ri, Tiranë (njësi tjetër)',
    transactionType: 'rent',
    price: 900,
    surfaceM2: 98,
    floor: 6,
    bedrooms: 2,
    bathrooms: 2,
    condition: 'new',
    zoneHint: 'Pazari i Ri',
    description: `Apartament 2+1+2 me qira – Pazari i Ri.

Jepet me qira apartament modern në një nga zonat më të preferuara të Tiranës.

• Tipologjia: 2+1+2
• Sipërfaqe: 98 m²
• Kati: 6
• Pallat i ri me ashensor
• Çmimi: 900 €/muaj

Organizimi:
• Sallon ndenjeje i bollshëm
• Ambient gatimi i veçuar
• 2 dhoma gjumi
• 2 tualete
• Ballkon`,
  },
  '19316852': {
    title: 'Apartament në shitje 1+1 – Square 21, Rruga Kavajës',
    transactionType: 'sale',
    price: 202000,
    surfaceM2: 67.5,
    bedrooms: 1,
    bathrooms: 1,
    condition: 'new',
    zoneHint: 'Kavaja',
    description: `Shitet apartament te Square 21, Rruga Kavajës.

• Pamje e lirë nga Rruga Kavajës
• Çmimi: 202,000 €
• Sipërfaqe: 67.5 m²
• Planimetri e rregullt
• Fazë përfundimtare
• Mundësi për banim, investim ose biznes`,
  },
};

function listingIdFromUrl(url) {
  const m = String(url).match(/\/(\d+)\/?$/);
  return m ? m[1] : '';
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\+/g, ' ')
    .replace(/%2b/gi, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function extractListingPhotos(html, pageUrl) {
  let slug = '';
  try {
    const path = new URL(pageUrl).pathname;
    slug = decodeURIComponent((path.match(/\/njoftim\/([^/]+)\//i) || [])[1] || '');
  } catch {
    slug = '';
  }
  const slugCompact = normalize(slug);
  const tokens = slug
    .toLowerCase()
    .split(/[^a-z0-9ëç]+/i)
    .map(normalize)
    .filter((t) => t.length >= 3 && !['ne', 'me', 'te', 'nga', 'per', 'dhe'].includes(t));

  const found = html.match(/https?:\/\/media\.merrjep\.al\/Image\/[^"'\\\s<>]+/gi) || [];
  const seen = new Set();
  const out = [];

  for (const raw of found) {
    let url = raw.replace(/&amp;/g, '&');
    try {
      url = decodeURIComponent(url.replace(/\\\u0026/g, '&'));
    } catch {
      /* keep */
    }
    // Prefer full-size gallery path when present.
    url = url.replace(/\/(?:80|120|240|320|480)\//, '/1280/');
    if (seen.has(url)) continue;

    let file = '';
    try {
      file = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
    } catch {
      file = url;
    }
    const fileCompact = normalize(file).replace(/\d+$/g, '');
    if (!fileCompact) continue;

    let ok = false;
    if (slugCompact && fileCompact.includes(slugCompact.slice(0, Math.min(48, slugCompact.length)))) {
      ok = true;
    } else if (slugCompact && slugCompact.includes(fileCompact.slice(0, Math.min(48, fileCompact.length)))) {
      ok = true;
    } else {
      const hits = tokens.filter((t) => fileCompact.includes(t)).length;
      ok = hits >= Math.min(3, Math.max(2, Math.ceil(tokens.length * 0.45)));
    }
    if (!ok) continue;

    seen.add(url);
    out.push(url);
    if (out.length >= 8) break;
  }
  return out;
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.message || data?.raw || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function resolveCityAndZone(cities, zoneHint) {
  const city =
    cities.find((c) => /tiran/i.test(c.name)) || cities[0] || null;
  if (!city) return { cityId: null, zoneId: null };

  const hint = String(zoneHint || '').trim().toLowerCase();
  let zone = null;
  if (hint && Array.isArray(city.zones)) {
    zone =
      city.zones.find((z) => z.name.toLowerCase() === hint) ||
      city.zones.find(
        (z) => z.name.toLowerCase().includes(hint) || hint.includes(z.name.toLowerCase()),
      ) ||
      null;
  }
  return { cityId: city.id, zoneId: zone?.id || null };
}

async function fetchListingHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`Fetch failed HTTP ${res.status}`);
  return res.text();
}

async function main() {
  console.log('Logging in as', EMAIL);
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  });
  const token = login.token;
  if (!token) throw new Error('Login did not return a token');

  const locations = await api('/real-estate/locations');
  const cities = locations.cities || [];
  if (!cities.length) throw new Error('No cities available');

  const results = [];

  for (const url of URLS) {
    const id = listingIdFromUrl(url);
    const meta = LISTINGS[id];
    if (!meta) {
      results.push({ url, ok: false, error: 'Missing listing metadata' });
      continue;
    }

    console.log(`\n=== Import ${id} ===\n${url}`);

    let photos = [];
    try {
      const html = await fetchListingHtml(url);
      photos = extractListingPhotos(html, url);
      console.log('Listing photos:', photos.length);
      photos.forEach((p, i) => console.log(`  ${i + 1}. ${p.split('/').pop()?.slice(0, 80)}`));
    } catch (err) {
      console.error('Scrape failed:', err.message);
      results.push({ url, ok: false, error: err.message });
      continue;
    }

    if (!photos.length) {
      results.push({ url, ok: false, error: 'No listing gallery photos found' });
      continue;
    }

    let mirrored = [];
    try {
      const mirror = await api('/uploads/from-urls', {
        method: 'POST',
        token,
        body: { urls: photos, folder: 'real-estate' },
      });
      mirrored = mirror.urls || [];
      console.log('Mirrored:', mirrored.length);
    } catch (err) {
      console.error('Mirror failed:', err.message, err.data || '');
      results.push({ url, ok: false, error: `Mirror failed: ${err.message}` });
      continue;
    }

    if (!mirrored.length) {
      results.push({ url, ok: false, error: 'Image mirror returned empty' });
      continue;
    }

    const { cityId, zoneId } = resolveCityAndZone(cities, meta.zoneHint);
    const body = {
      propertyCategory: 'apartment',
      title: meta.title,
      description: meta.description,
      transactionType: meta.transactionType,
      price: meta.price,
      currency: 'EUR',
      surfaceM2: meta.surfaceM2,
      cityId,
      zoneId,
      contactPhone: '+355692424555',
      condition: meta.condition || 'new',
      floor: meta.floor ?? null,
      bedrooms: meta.bedrooms ?? 1,
      bathrooms: meta.bathrooms ?? 1,
      furnishing: null,
      yearBuilt: null,
      imageUrls: mirrored,
    };

    try {
      const created = await api('/listings/real-estate', {
        method: 'POST',
        token,
        body,
      });
      console.log('Created:', created.listing?.id, created.listing?.title);
      results.push({
        url,
        ok: true,
        listingId: created.listing?.id,
        title: created.listing?.title,
        photos: mirrored.length,
      });
    } catch (err) {
      console.error('Create failed:', err.message, err.data || '');
      results.push({ url, ok: false, error: err.message, detail: err.data });
    }
  }

  console.log('\n=== Summary ===');
  console.log(JSON.stringify(results, null, 2));
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
