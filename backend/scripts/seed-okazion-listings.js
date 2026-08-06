'use strict';

/**
 * Seed one active OKAZION listing per eligible category
 * (real-estate, cars, jobs, marketplace — not businesses/professionals).
 *
 * Usage (from backend/):
 *   node scripts/seed-okazion-listings.js
 *
 * Idempotent: skips a category if a `[seed-okazion]` approved listing already exists.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabase');
const { getProfileByEmail, insertProfile } = require('../lib/profiles');
const { buildAlbaniaCities } = require('../lib/albania-cities');

const PHONE = '+355 69 400 1000';
const SEED_TAG = '[seed-okazion]';
const OKAZION_DAYS = 5;

const IMG = {
  apt: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
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
};

function okazionUntilIso() {
  return new Date(Date.now() + OKAZION_DAYS * 24 * 60 * 60 * 1000).toISOString();
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

async function ensurePoster() {
  const sb = getSupabaseAdmin();
  const email = 'seed.individual@kutagjej.local';
  const password = 'SeedDemo_1';
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
      user_metadata: { account_type: 'individual', first_name: 'Arben', last_name: 'Hoxha' },
    });
    const profile = await insertProfile({
      id: orphan.id,
      email,
      account_type: 'individual',
      is_active: true,
      first_name: 'Arben',
      last_name: 'Hoxha',
      phone: PHONE,
      role: 'individual-user',
    });
    console.log('Created profile for existing auth user:', email, profile.id);
    return profile;
  }

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { account_type: 'individual', first_name: 'Arben', last_name: 'Hoxha' },
  });
  if (error) throw error;
  const profile = await insertProfile({
    id: data.user.id,
    email,
    account_type: 'individual',
    is_active: true,
    first_name: 'Arben',
    last_name: 'Hoxha',
    phone: PHONE,
    role: 'individual-user',
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
      for (const row of inserted) bySlug.set(String(row.slug || '').toLowerCase(), row);
    }
  }

  const all = desired.map((c) => bySlug.get(String(c.slug || '').toLowerCase())).filter(Boolean);
  const withZones = all.filter((c) => Array.isArray(c.zones) && c.zones.length > 0);
  if (!withZones.length) throw new Error('No cities with zones available for seeding');
  return withZones;
}

async function hasSeedOkazion(sb, table) {
  const { count, error } = await sb
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')
    .ilike('description', `%${SEED_TAG}%`)
    .gt('okazion_until', new Date().toISOString());
  if (error) {
    if (/okazion_until/i.test(String(error.message || ''))) {
      throw new Error(
        'okazion_until column missing — apply supabase/migrations/20260805140000_okazion_listings.sql',
      );
    }
    throw error;
  }
  return (count || 0) > 0;
}

async function seedOkazionListings(sb, posterId, cities) {
  const city = cities.find((c) => String(c.slug).toLowerCase() === 'tirane') || cities[0];
  const zone = city.zones[0];
  const now = new Date().toISOString();
  const until = okazionUntilIso();

  const jobs = [
    {
      label: 'real-estate',
      table: 'real_estate_listings',
      row: {
        poster_id: posterId,
        property_category: 'apartment',
        title: 'OKAZION — Apartament 2+1 te Blloku',
        description: `${SEED_TAG} Çmim i ulur për 5 ditë. Apartament i ndriçuar, i mobiluar pjesërisht. Ideal për banim ose investim.`,
        transaction_type: 'sale',
        price: 119000,
        currency: 'EUR',
        surface_m2: 88,
        city_id: city.id,
        zone_id: zone.id,
        contact_phone: PHONE,
        condition: 'renovated',
        floor: 4,
        bedrooms: 2,
        bathrooms: 1,
        furnishing: 'furnished',
        year_built: 2019,
        image_urls: IMG.apt,
        status: 'approved',
        reviewed_at: now,
        okazion_until: until,
        created_at: now,
      },
    },
    {
      label: 'cars',
      table: 'car_listings',
      row: {
        poster_id: posterId,
        vehicle_type: 'car',
        make: 'Audi',
        model: 'A4',
        variant: 'S line',
        description: `${SEED_TAG} OKAZION 5-ditor. Makina e mirëmbajtur, e rregjistruar në Shqipëri. Shërbime të dokumentuara.`,
        year: 2019,
        kilometers: 82000,
        transmission: 'automatic',
        fuel_type: 'diesel',
        price: 14900,
        currency: 'EUR',
        color: 'grey',
        finish: ['metallic'],
        extras: ['ABS', 'Air conditioning', 'Parking sensors'],
        contact_phone: PHONE,
        city_id: city.id,
        image_urls: IMG.car,
        status: 'approved',
        reviewed_at: now,
        okazion_until: until,
        created_at: now,
      },
    },
    {
      label: 'jobs',
      table: 'job_listings',
      row: {
        poster_id: posterId,
        title: 'OKAZION — Full-stack Developer',
        description: `${SEED_TAG} Vend i hapur me bonus fillimi. Pozicion hybrid në Tiranë me pagë konkurruese.`,
        industry: 'teknologji-informacioni',
        education: 'bachelor',
        experience: '2-3',
        job_type: 'full-time',
        work_location: 'hybrid',
        city_id: city.id,
        salary: 1600,
        currency: 'EUR',
        contact_phone: PHONE,
        image_urls: IMG.job,
        responsibilities: ['Zhvillim me React/Node', 'Bashkëpunim me produktin'],
        requirements: ['React', 'Node.js', 'TypeScript'],
        benefits: [
          { id: 'pay', label: 'Pagë konkurruese' },
          { id: 'bonus', label: 'Bonus fillimi' },
          { id: 'remote', label: 'Hybrid' },
        ],
        status: 'approved',
        reviewed_at: now,
        okazion_until: until,
        created_at: now,
      },
    },
    {
      label: 'marketplace',
      table: 'marketplace_listings',
      row: {
        poster_id: posterId,
        transaction_type: 'shes',
        title: 'OKAZION — iPhone 14 Pro 256GB',
        description: `${SEED_TAG} Çmim i ulur për 5 ditë. Telefon në gjendje shumë të mirë, me kuti dhe faturë.`,
        category: 'elektronike',
        condition: 'si-i-ri',
        price: 690,
        currency: 'EUR',
        city_id: city.id,
        contact_phone: PHONE,
        image_urls: IMG.phone,
        status: 'approved',
        reviewed_at: now,
        okazion_until: until,
        created_at: now,
      },
    },
  ];

  for (const job of jobs) {
    if (await hasSeedOkazion(sb, job.table)) {
      console.log(`Skip ${job.label} (active seed OKAZION already present)`);
      continue;
    }
    const { error } = await sb.from(job.table).insert(job.row);
    if (error) throw error;
    console.log(`Inserted OKAZION ${job.label} (until ${until})`);
  }
}

async function main() {
  if (!isSupabaseConfigured()) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  }
  const sb = getSupabaseAdmin();
  const poster = await ensurePoster();
  const cities = await ensureCities(sb);
  await seedOkazionListings(sb, poster.id, cities);
  console.log('\nDone. Browse http://localhost:3000 and /okazion');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
