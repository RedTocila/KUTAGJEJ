'use strict';

/**
 * Seed Albanian demo listings: 50 per category (approved).
 * Original demo copy + Unsplash stock photos (not scraped from other sites).
 *
 * Usage (from backend/):
 *   node scripts/seed-albania-listings.js
 *
 * Creates poster users if missing, cities/zones, then listings.
 * Fills each category up to TARGET (skips rows already present).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabase');
const { getProfileByEmail, insertProfile } = require('../lib/profiles');
const { buildAlbaniaCities } = require('../lib/albania-cities');
const { buildDemoBusinessMenu } = require('../lib/demo-business-menu');

const PHONE = '+355 69 400 1000';
const SEED_TAG = '[seed-albania]';
const TARGET = 50;

const IMG = {
  apt: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
  ],
  villa: [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cd0c?w=800&q=80',
  ],
  office: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80',
    'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800&q=80',
    'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80',
  ],
  shop: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
    'https://images.unsplash.com/photo-1441984904996-e0b6ba18b3a0?w=800&q=80',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80',
    'https://images.unsplash.com/photo-1555529902-5261145633bf?w=800&q=80',
  ],
  car: [
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
    'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80',
    'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80',
  ],
  job: [
    'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
    'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=800&q=80',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
  ],
  phone: [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
    'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80',
    'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&q=80',
    'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&q=80',
  ],
  sofa: [
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
    'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800&q=80',
    'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=800&q=80',
  ],
  bike: [
    'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80',
    'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800&q=80',
    'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=800&q=80',
    'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&q=80',
    'https://images.unsplash.com/photo-1511994298241-608b02d41fea?w=800&q=80',
  ],
  resto: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80',
    'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&q=80',
  ],
  cafe: [
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
    'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800&q=80',
    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80',
  ],
  bar: [
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80',
    'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80',
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
    'https://images.unsplash.com/photo-1543007630-9710e4b7efdd?w=800&q=80',
  ],
  pro: [
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80',
  ],
  medic: [
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
    'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&q=80',
    'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&q=80',
    'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=800&q=80',
  ],
};

function pick(arr, i) {
  return arr[i % arr.length];
}

/** Always return 5 images from a pool, rotating from offset. */
function fiveImages(pool, offset = 0) {
  const src = Array.isArray(pool) && pool.length ? pool : IMG.apt;
  return Array.from({ length: 5 }, (_, i) => src[(offset + i) % src.length]);
}

function weekHours(open = '09:00', close = '22:00') {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    closed: dayOfWeek === 6,
    open: dayOfWeek === 6 ? null : open,
    close: dayOfWeek === 6 ? null : close,
  }));
}

async function findAuthUserByEmail(sb, email) {
  const want = String(email || '').toLowerCase().trim();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = (data.users || []).find((u) => String(u.email || '').toLowerCase() === want);
    if (hit) return hit;
    if (!data.users?.length || data.users.length < 200) break;
  }
  return null;
}

async function ensurePoster({ email, password, accountType, fields }) {
  const sb = getSupabaseAdmin();
  const existing = await getProfileByEmail(email);
  if (existing) {
    console.log('Poster exists:', email, existing.id);
    return existing;
  }

  const orphan = await findAuthUserByEmail(sb, email);
  if (orphan) {
    await sb.auth.admin.updateUserById(orphan.id, {
      password,
      email_confirm: true,
      user_metadata: { account_type: accountType, ...fields.meta },
    });
    const profile = await insertProfile({
      id: orphan.id,
      email,
      account_type: accountType,
      is_active: true,
      ...fields.row,
    });
    console.log('Created profile for existing auth user:', email, profile.id);
    return profile;
  }

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { account_type: accountType, ...fields.meta },
  });
  if (error) throw error;
  const profile = await insertProfile({
    id: data.user.id,
    email,
    account_type: accountType,
    is_active: true,
    ...fields.row,
  });
  console.log('Created poster:', email, profile.id);
  return profile;
}

async function ensureCities(sb) {
  const desired = buildAlbaniaCities();
  const { data: existing, error: existingErr } = await sb.from('real_estate_cities').select('*');
  if (existingErr) throw existingErr;

  const bySlug = new Map((existing || []).map((c) => [String(c.slug || '').toLowerCase(), c]));
  const missing = desired.filter((c) => !bySlug.has(String(c.slug || '').toLowerCase()));

  if (missing.length) {
    const chunkSize = 25;
    for (let i = 0; i < missing.length; i += chunkSize) {
      const chunk = missing.slice(i, i + chunkSize);
      const { data: inserted, error } = await sb.from('real_estate_cities').insert(chunk).select('*');
      if (error) throw error;
      console.log('Inserted cities:', inserted.length, inserted.map((c) => c.name).join(', '));
      for (const row of inserted) bySlug.set(String(row.slug || '').toLowerCase(), row);
    }
  } else {
    console.log('Cities already present:', existing.length);
  }

  const all = desired.map((c) => bySlug.get(String(c.slug || '').toLowerCase())).filter(Boolean);
  // Prefer cities that have zones so seeded listings always get a valid zone_id.
  const withZones = all.filter((c) => Array.isArray(c.zones) && c.zones.length > 0);
  if (!withZones.length) {
    throw new Error('No cities with zones available for seeding');
  }
  return withZones;
}

function pickCity(cities, i) {
  return cities[i % cities.length];
}

function pickZone(city, i) {
  const zones = Array.isArray(city?.zones) ? city.zones : [];
  if (!zones.length) {
    throw new Error(`City ${city?.name || '?'} has no zones`);
  }
  return zones[i % zones.length];
}

async function countApproved(sb, table, extra = {}) {
  let q = sb.from(table).select('*', { count: 'exact', head: true }).eq('status', 'approved');
  for (const [k, v] of Object.entries(extra)) q = q.eq(k, v);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function insertInChunks(sb, table, rows, chunkSize = 25) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await sb.from(table).insert(chunk);
    if (error) throw error;
  }
}

function need(current) {
  return Math.max(0, TARGET - current);
}

async function seedRealEstate(sb, posterId, cities) {
  const existing = await countApproved(sb, 'real_estate_listings');
  const n = need(existing);
  if (n === 0) {
    console.log(`Skip real-estate (already ≥${TARGET})`);
    return;
  }

  const categories = [
    'apartment',
    'apartment',
    'apartment',
    'villa',
    'office',
    'shop',
    'penthouse-duplex',
    'room-studio-attic',
    'building-plot',
  ];
  const zonesHints = ['Bllok', 'Astir', 'Kombinat', 'Laprakë', 'Plazh', 'Qendër', 'Lungomare'];
  const titles = {
    apartment: (i, city) =>
      [
        `Apartament ${1 + (i % 3)}+1 në ${city.name}`,
        `Apartament i mobiluar – ${pick(zonesHints, i)}`,
        `Apartament me pamje, ${city.name}`,
        `Shitje apartamenti ${70 + (i % 50)} m²`,
      ][i % 4],
    villa: (i, city) => `Vilë ${2 + (i % 2)} kate me kopsht – ${city.name}`,
    office: (i, city) => `Zyrë e mobiluar në ${city.name}`,
    shop: (i, city) => `Dyqan / lokal tregtar – ${city.name}`,
    'penthouse-duplex': (i, city) => `Penthouse me tarracë – ${city.name}`,
    'room-studio-attic': (i, city) => `Garsonierë / studio – ${city.name}`,
    'building-plot': (i, city) => `Tokë ndërtimi ${400 + i * 20} m² – ${city.name}`,
  };

  const rows = Array.from({ length: n }, (_, idx) => {
    const i = existing + idx;
    const city = pickCity(cities, i);
    const zone = pickZone(city, i);
    const property_category = pick(categories, i);
    const sale = i % 3 !== 0;
    const title = titles[property_category](i, city);
    const surface =
      property_category === 'building-plot'
        ? 400 + i * 15
        : property_category === 'villa'
          ? 160 + (i % 10) * 12
          : 35 + (i % 20) * 5;
    const imgPool =
      property_category === 'villa' || property_category === 'building-plot'
        ? IMG.villa
        : property_category === 'office'
          ? IMG.office
          : property_category === 'shop'
            ? IMG.shop
            : IMG.apt;

    return {
      poster_id: posterId,
      property_category,
      title,
      description: `${SEED_TAG} ${title}. Pronë në ${city.name}, ${zone.name}. ${
        sale ? 'Në shitje' : 'Me qira'
      }, e dokumentuar dhe e gatshme për vizitë. Kontaktoni për më shumë detaje.`,
      transaction_type: sale ? 'sale' : 'rent',
      price: sale
        ? property_category === 'building-plot'
          ? 50000 + i * 2500
          : property_category === 'villa'
            ? 180000 + i * 4000
            : 70000 + i * 2500
        : 250 + (i % 25) * 40,
      currency: 'EUR',
      surface_m2: surface,
      city_id: city.id,
      zone_id: zone.id,
      contact_phone: PHONE,
      condition: pick(['new', 'renovated', 'good-condition'], i),
      floor: property_category === 'apartment' || property_category === 'room-studio-attic' ? 1 + (i % 8) : null,
      total_floors: property_category === 'villa' ? 2 : null,
      bedrooms: property_category.includes('apartment') || property_category === 'villa' || property_category === 'penthouse-duplex' ? 1 + (i % 4) : null,
      bathrooms: 1 + (i % 2),
      furnishing: pick(['furnished', 'partially-furnished', 'unfurnished', 'kitchen-only'], i),
      year_built: 2008 + (i % 17),
      image_urls: fiveImages(imgPool, i),
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    };
  });

  await insertInChunks(sb, 'real_estate_listings', rows);
  console.log(`Seeded real-estate: +${rows.length} (total target ${TARGET})`);
}

async function seedCars(sb, posterId, cities) {
  const existing = await countApproved(sb, 'car_listings');
  const n = need(existing);
  if (n === 0) {
    console.log(`Skip cars (already ≥${TARGET})`);
    return;
  }

  const fleet = [
    { vehicle_type: 'car', make: 'BMW', model: '3 Series', variant: 'M Sport', fuel_type: 'diesel', transmission: 'automatic' },
    { vehicle_type: 'car', make: 'Mercedes-Benz', model: 'C-Class', variant: 'AMG Line', fuel_type: 'diesel', transmission: 'automatic' },
    { vehicle_type: 'car', make: 'Volkswagen', model: 'Golf', variant: '7.5', fuel_type: 'petrol', transmission: 'manual' },
    { vehicle_type: 'car', make: 'Audi', model: 'A4', variant: '2.0 TDI', fuel_type: 'diesel', transmission: 'automatic' },
    { vehicle_type: 'car', make: 'Toyota', model: 'Corolla', variant: 'Hybrid', fuel_type: 'hybrid-petrol', transmission: 'automatic' },
    { vehicle_type: 'van', make: 'Mercedes-Benz', model: 'Sprinter', variant: '311', fuel_type: 'diesel', transmission: 'manual' },
    { vehicle_type: 'car', make: 'Fiat', model: '500', variant: 'Lounge', fuel_type: 'petrol', transmission: 'manual' },
    { vehicle_type: 'car', make: 'Skoda', model: 'Octavia', variant: '1.6 TDI', fuel_type: 'diesel', transmission: 'manual' },
    { vehicle_type: 'car', make: 'Renault', model: 'Clio', variant: '1.5 dCi', fuel_type: 'diesel', transmission: 'manual' },
    { vehicle_type: 'suv', make: 'Hyundai', model: 'Tucson', variant: '1.6 T-GDI', fuel_type: 'petrol', transmission: 'automatic' },
    { vehicle_type: 'car', make: 'Ford', model: 'Focus', variant: '1.5 EcoBoost', fuel_type: 'petrol', transmission: 'manual' },
    { vehicle_type: 'car', make: 'Opel', model: 'Astra', variant: '1.6 CDTI', fuel_type: 'diesel', transmission: 'manual' },
    { vehicle_type: 'suv', make: 'Peugeot', model: '3008', variant: 'Allure', fuel_type: 'diesel', transmission: 'automatic' },
    { vehicle_type: 'suv', make: 'Nissan', model: 'Qashqai', variant: '1.5 dCi', fuel_type: 'diesel', transmission: 'manual' },
    { vehicle_type: 'car', make: 'Volkswagen', model: 'Passat', variant: '2.0 TDI', fuel_type: 'diesel', transmission: 'automatic' },
    { vehicle_type: 'motorcycle', make: 'Yamaha', model: 'MT-07', variant: '', fuel_type: 'petrol', transmission: 'manual' },
    { vehicle_type: 'motorcycle', make: 'Honda', model: 'PCX', variant: '', fuel_type: 'petrol', transmission: 'automatic' },
    { vehicle_type: 'boat', make: 'Quicksilver', model: 'Activ', variant: '555', fuel_type: 'petrol', transmission: 'manual' },
  ];
  const colors = ['black', 'white', 'silver', 'grey', 'blue', 'red', 'green'];

  const rows = Array.from({ length: n }, (_, idx) => {
    const i = existing + idx;
    const base = pick(fleet, i);
    const city = pickCity(cities, i + 1);
    const year = 2012 + (i % 13);
    const kilometers = 25000 + i * 3500 + (i % 7) * 1000;
    const price = 4500 + (2025 - year) * -200 + Math.max(0, 180000 - kilometers) / 12 + i * 120;
    return {
      poster_id: posterId,
      vehicle_type: base.vehicle_type,
      make: base.make,
      model: base.model,
      variant: base.variant,
      year,
      kilometers,
      transmission: base.transmission,
      fuel_type: base.fuel_type,
      price: Math.round(Math.max(2800, price) / 50) * 50,
      color: pick(colors, i),
      description: `${SEED_TAG} ${base.make} ${base.model} ${year}. Makina e mirëmbajtur, e regjistruar në Shqipëri, me shërbime të dokumentuara. Vendndodhja: ${city.name}. Çmimi i diskutueshëm.`,
      currency: 'EUR',
      finish: ['metallic'],
      extras: ['ABS', 'Air conditioning', 'Parking sensors', 'Bluetooth'],
      contact_phone: PHONE,
      city_id: city.id,
      image_urls: fiveImages(IMG.car, i),
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    };
  });

  await insertInChunks(sb, 'car_listings', rows);
  console.log(`Seeded cars: +${rows.length}`);
}

async function seedJobs(sb, posterId, cities) {
  const existing = await countApproved(sb, 'job_listings');
  const n = need(existing);
  if (n === 0) {
    console.log(`Skip jobs (already ≥${TARGET})`);
    return;
  }

  const jobs = [
    { title: 'Kamerier/e', industry: 'horeka', education: 'secondary', experience: 'less-than-1', job_type: 'full-time', work_location: 'onsite', salary: 450 },
    { title: 'Frontend Developer (React)', industry: 'teknologji-informacioni', education: 'bachelor', experience: '2-3', job_type: 'full-time', work_location: 'hybrid', salary: 1400 },
    { title: 'Shitës/e në dyqan', industry: 'retail', education: 'secondary', experience: '1-2', job_type: 'full-time', work_location: 'onsite', salary: 500 },
    { title: 'Kontabilist/e', industry: 'finance', education: 'bachelor', experience: '3-5', job_type: 'full-time', work_location: 'onsite', salary: 900 },
    { title: 'Recepsionist/e hoteli', industry: 'horeka', education: 'secondary', experience: '1-2', job_type: 'seasonal', work_location: 'onsite', salary: 550 },
    { title: 'Specialist marketing digjital', industry: 'marketing-produkte', education: 'bachelor', experience: '2-3', job_type: 'full-time', work_location: 'hybrid', salary: 800 },
    { title: 'Elektricist ndërtese', industry: 'instalime-mirembajtje', education: 'vocational', experience: '3-5', job_type: 'full-time', work_location: 'onsite', salary: 700 },
    { title: 'Infermier/e', industry: 'mjekesore-shendetesore', education: 'bachelor', experience: '1-2', job_type: 'full-time', work_location: 'onsite', salary: 750 },
    { title: 'Punëtor magazina', industry: 'prokurim-logjistike', education: 'no-requirement', experience: 'no-experience', job_type: 'full-time', work_location: 'onsite', salary: 420 },
    { title: 'Praktikant IT Support', industry: 'teknologji-informacioni', education: 'bachelor', experience: 'no-experience', job_type: 'internship', work_location: 'onsite', salary: 250 },
    { title: 'Menaxher dyqani', industry: 'retail', education: 'bachelor', experience: '3-5', job_type: 'full-time', work_location: 'onsite', salary: 850 },
    { title: 'Backend Developer (Node.js)', industry: 'teknologji-informacioni', education: 'bachelor', experience: '2-3', job_type: 'full-time', work_location: 'remote', salary: 1500 },
    { title: 'Kuzhinier/e', industry: 'horeka', education: 'vocational', experience: '2-3', job_type: 'full-time', work_location: 'onsite', salary: 600 },
    { title: 'Shofer shpërndarjeje', industry: 'prokurim-logjistike', education: 'secondary', experience: '1-2', job_type: 'full-time', work_location: 'onsite', salary: 480 },
    { title: 'Administrativ/e zyre', industry: 'finance', education: 'secondary', experience: '1-2', job_type: 'full-time', work_location: 'onsite', salary: 520 },
  ];

  const rows = Array.from({ length: n }, (_, idx) => {
    const i = existing + idx;
    const r = pick(jobs, i);
    const city = pickCity(cities, i);
    const title = `${r.title} – ${city.name}${i > 14 ? ` #${i + 1}` : ''}`;
    return {
      poster_id: posterId,
      title,
      description: `${SEED_TAG} Pozicion i hapur në ${city.name}. Ofrojmë mjedis pune profesional, pagesë të rregullt dhe mundësi zhvillimi. Aplikoni me CV dhe letër motivimi.`,
      industry: r.industry,
      education: r.education,
      experience: r.experience,
      job_type: r.job_type,
      work_location: r.work_location,
      city_id: city.id,
      salary: r.salary + (i % 5) * 25,
      currency: 'EUR',
      contact_phone: PHONE,
      image_urls: fiveImages(IMG.job, i),
      responsibilities: [
        'Kryen detyrat e përditshme sipas përshkrimit të pozicionit.',
        'Bashkëpunon me ekipin dhe klientët.',
        'Respekton standardet e cilësisë dhe afatet.',
      ],
      requirements: ['Komunikim i mirë në shqip.', 'Gatishmëri për punë në ekip.', 'Përvojë e preferuar në fushën përkatëse.'],
      benefits: [
        { id: 'pay', label: 'Pagë e rregullt' },
        { id: 'training', label: 'Trajnim në punë' },
        { id: 'insurance', label: 'Sigurim shëndetësor' },
      ],
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    };
  });

  await insertInChunks(sb, 'job_listings', rows);
  console.log(`Seeded jobs: +${rows.length}`);
}

async function seedMarketplace(sb, posterId, cities) {
  const existing = await countApproved(sb, 'marketplace_listings');
  const n = need(existing);
  if (n === 0) {
    console.log(`Skip marketplace (already ≥${TARGET})`);
    return;
  }

  const items = [
    { title: 'iPhone', category: 'elektronike', condition: 'si-i-ri', price: 420, imgs: IMG.phone },
    { title: 'Samsung Galaxy', category: 'elektronike', condition: 'shume-mire', price: 380, imgs: IMG.phone },
    { title: 'Divan këndor', category: 'mobilje-shtepi', condition: 'mire', price: 280, imgs: IMG.sofa },
    { title: 'Tavolinë ngrënie', category: 'mobilje-shtepi', condition: 'si-i-ri', price: 190, imgs: IMG.sofa },
    { title: 'Bicikletë mountain', category: 'sport-hobi', condition: 'shume-mire', price: 150, imgs: IMG.bike },
    { title: 'Konsolë lojërash', category: 'elektronike', condition: 'si-i-ri', price: 220, imgs: IMG.phone },
    { title: 'Jakë dimërore', category: 'veshje-aksesore', condition: 'si-i-ri', price: 35, imgs: IMG.shop },
    { title: 'Libra universitarë', category: 'libra-shkolla', condition: 'mire', price: 25, imgs: IMG.shop },
    { title: 'Goma dimërore', category: 'automjete-pjese', condition: 'mire', price: 120, imgs: IMG.car },
    { title: 'Shërbim montimi mobiljesh', category: 'sherbime', condition: 'i-ri', price: 40, imgs: IMG.pro },
    { title: 'Laptop biznesi', category: 'elektronike', condition: 'shume-mire', price: 350, imgs: IMG.phone },
    { title: 'Frigorifer', category: 'mobilje-shtepi', condition: 'mire', price: 160, imgs: IMG.sofa },
    { title: 'Patina roller', category: 'sport-hobi', condition: 'si-i-ri', price: 45, imgs: IMG.bike },
    { title: 'Çanta laptopi', category: 'veshje-aksesore', condition: 'si-i-ri', price: 20, imgs: IMG.shop },
    { title: 'Monitor 27"', category: 'elektronike', condition: 'si-i-ri', price: 180, imgs: IMG.phone },
  ];

  const rows = Array.from({ length: n }, (_, idx) => {
    const i = existing + idx;
    const r = pick(items, i);
    const city = pickCity(cities, i + 2);
    const title = `${r.title} ${i % 3 === 0 ? '– urgjent' : i % 3 === 1 ? '– si i ri' : ''}`.trim() + ` (${city.name})`;
    return {
      poster_id: posterId,
      transaction_type: 'shes',
      title,
      description: `${SEED_TAG} ${title}. Në gjendje të mirë, i disponueshëm në ${city.name}. Takim në vendndodhje ose dërgesë me marrëveshje. Çmimi i diskutueshëm.`,
      category: r.category,
      condition: r.condition,
      price: Math.max(10, r.price + (i % 8) * 10 - (i % 3) * 5),
      currency: 'EUR',
      city_id: city.id,
      contact_phone: PHONE,
      image_urls: fiveImages(r.imgs, i),
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    };
  });

  await insertInChunks(sb, 'marketplace_listings', rows);
  console.log(`Seeded marketplace: +${rows.length}`);
}

async function seedBusinesses(sb, posterId, cities) {
  const existing = await countApproved(sb, 'directory_listings', { vertical: 'businesses' });
  const n = need(existing);
  if (n === 0) {
    console.log(`Skip businesses (already ≥${TARGET})`);
    return;
  }

  const templates = [
    { title: 'Restorant', category: 'restorant', desc: 'Kuzhinë e shijshme dhe shërbim i ngrohtë.', imgs: IMG.resto, open: '12:00', close: '23:30' },
    { title: 'Kafe', category: 'kafe', desc: 'Kafe specialiteti dhe ëmbëlsira.', imgs: IMG.cafe, open: '08:00', close: '22:00' },
    { title: 'Bar', category: 'bar', desc: 'Koktejle dhe atmosferë e këndshme.', imgs: IMG.bar, open: '17:00', close: '01:00' },
    { title: 'Brunch', category: 'brunch', desc: 'Mëngjes dhe brunch gjatë ditës.', imgs: IMG.cafe, open: '09:00', close: '16:00' },
    { title: 'Piceri', category: 'piceri-fast-food', desc: 'Pica e freskët dhe delivery.', imgs: IMG.resto, open: '11:00', close: '23:00' },
    { title: 'Pasticeri', category: 'pasticeri', desc: 'Torta dhe ëmbëlsira të shtëpisë.', imgs: IMG.cafe, open: '08:00', close: '20:00' },
  ];
  const names = ['Deti Blu', 'Era', 'Tradita', 'Skyline', 'Muzeu', 'Lungomare', 'Qendra', 'Plaza', 'Nova', 'Arka'];

  const rows = Array.from({ length: n }, (_, idx) => {
    const i = existing + idx;
    const t = pick(templates, i);
    const city = pickCity(cities, i);
    const title = `${t.title} ${pick(names, i)} – ${city.name}`;
    const menu = buildDemoBusinessMenu(t.category);
    return {
      vertical: 'businesses',
      poster_id: posterId,
      title,
      description: `${SEED_TAG} ${t.desc} Vendndodhja: ${city.name}. Mirëpritëm klientët çdo ditë. Rezervimet pranohen me telefon.`,
      category: t.category,
      city_id: city.id,
      contact_phone: PHONE,
      image_urls: fiveImages(t.imgs, i),
      weekly_hours: weekHours(t.open, t.close),
      opening_hours: `${t.open}–${t.close}`,
      menu_categories: menu.menuCategories,
      menu_items: menu.menuItems,
      reservations_enabled: true,
      reservation_time_slots: ['12:00', '13:00', '19:00', '20:00', '21:00'],
      reservation_party_sizes: [2, 4, 6, 8],
      services_highlight: 'Wifi, parking, delivery',
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    };
  });

  await insertInChunks(sb, 'directory_listings', rows);
  console.log(`Seeded businesses: +${rows.length}`);
}

async function seedProfessionals(sb, posterId, cities) {
  const existing = await countApproved(sb, 'directory_listings', { vertical: 'professionals' });
  const n = need(existing);
  if (n === 0) {
    console.log(`Skip professionals (already ≥${TARGET})`);
    return;
  }

  const templates = [
    { title: 'Avokat civil', category: 'konsulent', price: 60, highlight: 'Kontrata, divorc, pronësi', imgs: IMG.pro },
    { title: 'Grafik designer', category: 'dizajn-it', price: 25, highlight: 'Logo, branding, social media', imgs: IMG.pro },
    { title: 'Kurs anglisht', category: 'kurse', price: 15, highlight: 'Online dhe face-to-face', imgs: IMG.pro },
    { title: 'Mjek familjar', category: 'mjekesi', price: 30, highlight: 'Kontroll periodik dhe receta', imgs: IMG.medic },
    { title: 'Specialist SEO', category: 'marketing', price: 40, highlight: 'Kampanja për SME', imgs: IMG.pro },
    { title: 'Instalim AC', category: 'sherbim', price: 35, highlight: 'Montim dhe mirëmbajtje', imgs: IMG.pro },
    { title: 'Tutor matematikë', category: 'arsim', price: 12, highlight: 'Nxënës dhe gjimnaz', imgs: IMG.pro },
    { title: 'Web developer', category: 'freelance', price: 20, highlight: 'Website dhe e-commerce', imgs: IMG.pro },
    { title: 'Fotografe eventi', category: 'sherbim', price: 150, highlight: 'Dasma dhe korporatë', imgs: IMG.pro },
    { title: 'Konsulent biznesi', category: 'konsulent', price: 50, highlight: 'Biznes plan dhe financim', imgs: IMG.pro },
  ];

  const rows = Array.from({ length: n }, (_, idx) => {
    const i = existing + idx;
    const r = pick(templates, i);
    const city = pickCity(cities, i + 1);
    const title = `${r.title} – ${city.name}${i >= 10 ? ` (${i + 1})` : ''}`;
    return {
      vertical: 'professionals',
      poster_id: posterId,
      title,
      description: `${SEED_TAG} ${r.highlight}. Shërbim profesional në ${city.name} dhe online. Kontaktoni për orar dhe çmim.`,
      category: r.category,
      city_id: city.id,
      contact_phone: PHONE,
      image_urls: fiveImages(r.imgs, i),
      price: r.price + (i % 4) * 5,
      currency: 'EUR',
      response_time_hours: 24,
      services_highlight: r.highlight,
      portfolio_items: [],
      weekly_hours: weekHours('09:00', '18:00'),
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    };
  });

  await insertInChunks(sb, 'directory_listings', rows);
  console.log(`Seeded professionals: +${rows.length}`);
}

async function main() {
  if (!isSupabaseConfigured()) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  }
  const sb = getSupabaseAdmin();

  const individual = await ensurePoster({
    email: 'seed.individual@kutagjej.local',
    password: 'SeedDemo_1',
    accountType: 'individual',
    fields: {
      meta: { first_name: 'Arben', last_name: 'Hoxha' },
      row: {
        first_name: 'Arben',
        last_name: 'Hoxha',
        phone: PHONE,
        role: 'individual-user',
      },
    },
  });

  const business = await ensurePoster({
    email: 'seed.business@kutagjej.local',
    password: 'SeedDemo_1',
    accountType: 'business',
    fields: {
      meta: { business_name: 'KuTaGjej Demo SHPK' },
      row: {
        first_name: 'Luan',
        last_name: 'Krasniqi',
        phone: PHONE,
        role: 'business-user',
        nipt: 'L12345678A',
        business_name: 'KuTaGjej Demo SHPK',
        business_owner: 'Luan Krasniqi',
        business_category: 'sherbime',
        jobs_employer_verified_at: new Date().toISOString(),
        professionals_verified_at: new Date().toISOString(),
      },
    },
  });

  const cities = await ensureCities(sb);

  await seedRealEstate(sb, individual.id, cities);
  await seedCars(sb, individual.id, cities);
  await seedJobs(sb, business.id, cities);
  await seedMarketplace(sb, individual.id, cities);
  await seedBusinesses(sb, business.id, cities);
  await seedProfessionals(sb, business.id, cities);

  console.log(`\nDone. Target ${TARGET} approved listings per category.`);
  console.log('Browse http://localhost:3000');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
