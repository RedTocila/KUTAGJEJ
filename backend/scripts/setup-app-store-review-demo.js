'use strict';

/**
 * Create / reset Apple App Review demo account (login + a few approved listings).
 *
 *   node scripts/setup-app-store-review-demo.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { randomUUID } = require('crypto');
const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabase');
const { getProfileByEmail, insertProfile } = require('../lib/profiles');
const { ensureCoreRoles } = require('../lib/core-roles');

const EMAIL = 'appreview@kutagjej.al';
const PASSWORD = 'ReviewKuTaGjej2026!';
const PHONE = '+355 69 000 0001';

const IMG = {
  apt: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
  ],
  car: [
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
  ],
  phone: [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
    'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80',
  ],
};

async function findAuthByEmail(sb, email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = (data.users || []).find(
      (u) => String(u.email || '').toLowerCase() === email.toLowerCase()
    );
    if (hit) return hit;
    if (!data.users?.length || data.users.length < 200) break;
  }
  return null;
}

async function ensureUser(sb) {
  let profile = await getProfileByEmail(EMAIL);
  if (profile) {
    await sb.auth.admin.updateUserById(profile.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    await sb
      .from('profiles')
      .update({
        first_name: 'App',
        last_name: 'Reviewer',
        phone: PHONE,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);
    console.log('Updated existing review user:', profile.id);
    return profile;
  }

  const authUser = await findAuthByEmail(sb, EMAIL);
  if (authUser) {
    await sb.auth.admin.updateUserById(authUser.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        account_type: 'individual',
        first_name: 'App',
        last_name: 'Reviewer',
      },
    });
    profile = await insertProfile({
      id: authUser.id,
      email: EMAIL,
      first_name: 'App',
      last_name: 'Reviewer',
      phone: PHONE,
      account_type: 'individual',
      role: 'Individual',
      is_active: true,
      boost_credits: 0,
    });
    console.log('Created profile for existing auth user:', profile.id);
    return profile;
  }

  const { data, error } = await sb.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      account_type: 'individual',
      first_name: 'App',
      last_name: 'Reviewer',
    },
  });
  if (error) throw error;

  profile = await insertProfile({
    id: data.user.id,
    email: EMAIL,
    first_name: 'App',
    last_name: 'Reviewer',
    phone: PHONE,
    account_type: 'individual',
    role: 'Individual',
    is_active: true,
    boost_credits: 0,
  });
  console.log('Created new review user:', profile.id);
  return profile;
}

async function ensureCity(sb) {
  const { data: existing, error } = await sb.from('real_estate_cities').select('*').limit(1);
  if (error) throw error;
  if (existing?.length) return existing[0];

  const city = {
    name: 'Tiranë',
    slug: 'tirane',
    zones: [{ id: randomUUID(), name: 'Blloku', slug: 'blloku' }],
  };
  const { data, error: insErr } = await sb.from('real_estate_cities').insert(city).select('*').single();
  if (insErr) throw insErr;
  return data;
}

async function seedListings(sb, posterId, city) {
  const zone = Array.isArray(city.zones) && city.zones[0] ? city.zones[0] : null;
  const now = new Date().toISOString();

  const { count: reCount, error: reErr } = await sb
    .from('real_estate_listings')
    .select('id', { count: 'exact', head: true })
    .eq('poster_id', posterId);
  if (reErr) throw reErr;
  if (!(reCount > 0)) {
    const { error } = await sb.from('real_estate_listings').insert({
      poster_id: posterId,
      property_category: 'apartment',
      title: 'App Review — Apartament demo Tiranë',
      description:
        'Demo listing for Apple App Review. Safe to browse; not a real offer.',
      transaction_type: 'sale',
      price: 120000,
      currency: 'EUR',
      surface_m2: 75,
      city_id: city.id,
      zone_id: zone?.id ?? null,
      contact_phone: PHONE,
      condition: 'renovated',
      floor: 3,
      bedrooms: 2,
      bathrooms: 1,
      furnishing: 'furnished',
      year_built: 2020,
      image_urls: IMG.apt,
      status: 'approved',
      reviewed_at: now,
    });
    if (error) throw error;
    console.log('Inserted demo real-estate listing');
  }

  const { count: carCount, error: carErr } = await sb
    .from('car_listings')
    .select('id', { count: 'exact', head: true })
    .eq('poster_id', posterId);
  if (carErr) throw carErr;
  if (!(carCount > 0)) {
    const { error } = await sb.from('car_listings').insert({
      poster_id: posterId,
      vehicle_type: 'car',
      make: 'Volkswagen',
      model: 'Golf',
      variant: 'Comfortline',
      description: 'Demo car listing for Apple App Review.',
      year: 2017,
      kilometers: 120000,
      transmission: 'manual',
      fuel_type: 'diesel',
      price: 9500,
      currency: 'EUR',
      color: 'grey',
      finish: [],
      extras: [],
      contact_phone: PHONE,
      city_id: city.id,
      image_urls: IMG.car,
      status: 'approved',
      reviewed_at: now,
    });
    if (error) throw error;
    console.log('Inserted demo car listing');
  }

  const { count: mktCount, error: mktErr } = await sb
    .from('marketplace_listings')
    .select('id', { count: 'exact', head: true })
    .eq('poster_id', posterId);
  if (mktErr) throw mktErr;
  if (!(mktCount > 0)) {
    const { error } = await sb.from('marketplace_listings').insert({
      poster_id: posterId,
      transaction_type: 'shes',
      title: 'App Review — iPhone demo',
      description: 'Demo marketplace listing for Apple App Review.',
      category: 'elektronike',
      condition: 'si-i-ri',
      price: 300,
      currency: 'EUR',
      city_id: city.id,
      contact_phone: PHONE,
      image_urls: IMG.phone,
      status: 'approved',
      reviewed_at: now,
    });
    if (error) throw error;
    console.log('Inserted demo marketplace listing');
  }
}

async function main() {
  if (!isSupabaseConfigured()) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  }
  const sb = getSupabaseAdmin();
  await ensureCoreRoles();

  const profile = await ensureUser(sb);
  const { data: role } = await sb.from('roles').select('id').eq('name', 'Individual').maybeSingle();
  if (role?.id) {
    await sb
      .from('profiles')
      .update({ role_id: role.id, role: 'Individual', updated_at: new Date().toISOString() })
      .eq('id', profile.id);
  }

  const city = await ensureCity(sb);
  await seedListings(sb, profile.id, city);

  console.log('\n=== App Store Review demo account ===');
  console.log('Email:', EMAIL);
  console.log('Password:', PASSWORD);
  console.log('User ID:', profile.id);
  console.log('Login URL: https://kutagjej.al (or in the iOS app)');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
