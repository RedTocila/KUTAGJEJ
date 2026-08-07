'use strict';

/**
 * One-off: ensure redjan.t13@gmail.com exists, seed one listing per category, grant Elite.
 *
 *   node scripts/setup-redjan-demo.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { randomUUID } = require('crypto');
const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabase');
const { getProfileByEmail, insertProfile } = require('../lib/profiles');
const { ensureCoreRoles } = require('../lib/core-roles');
const { ensureContractPackages } = require('../lib/ensure-contract-packages');
const { buildDemoBusinessMenu } = require('../lib/demo-business-menu');

const EMAIL = 'redjan.t13@gmail.com';
const PASSWORD = 'Komardarja_1';
const PHONE = '+355 69 400 1000';

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
  resto: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80',
    'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&q=80',
  ],
  pro: [
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80',
  ],
};

function weekHours(open = '09:00', close = '22:00') {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    closed: dayOfWeek === 0,
    open: dayOfWeek === 0 ? null : open,
    close: dayOfWeek === 0 ? null : close,
  }));
}

async function ensureUser(sb) {
  let profile = await getProfileByEmail(EMAIL);
  if (profile) {
    await sb.auth.admin.updateUserById(profile.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    console.log('User exists, password reset:', profile.id);
    return profile;
  }

  // Auth user may exist without a profile (orphan).
  let authUser = null;
  for (let page = 1; page <= 10 && !authUser; page += 1) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    authUser = (data.users || []).find(
      (u) => String(u.email || '').toLowerCase() === EMAIL.toLowerCase(),
    );
    if (!data.users?.length || data.users.length < 200) break;
  }

  if (authUser) {
    await sb.auth.admin.updateUserById(authUser.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        account_type: 'individual',
        first_name: 'Redjan',
        last_name: 'Tocila',
      },
    });
    profile = await insertProfile({
      id: authUser.id,
      email: EMAIL,
      first_name: 'Redjan',
      last_name: 'Tocila',
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
      first_name: 'Redjan',
      last_name: 'Tocila',
    },
  });
  if (error) throw error;

  profile = await insertProfile({
    id: data.user.id,
    email: EMAIL,
    first_name: 'Redjan',
    last_name: 'Tocila',
    phone: PHONE,
    account_type: 'individual',
    role: 'Individual',
    is_active: true,
    boost_credits: 0,
  });
  console.log('Created new user:', profile.id);
  return profile;
}

async function ensureCities(sb) {
  const { data: existing, error } = await sb.from('real_estate_cities').select('*');
  if (error) throw error;
  if (existing?.length) return existing;

  const cities = [
    {
      name: 'Tiranë',
      slug: 'tirane',
      zones: [
        { id: randomUUID(), name: 'Blloku', slug: 'blloku' },
        { id: randomUUID(), name: 'Komuna e Parisit', slug: 'komuna-e-parisit' },
      ],
    },
    {
      name: 'Durrës',
      slug: 'durres',
      zones: [
        { id: randomUUID(), name: 'Plazhi', slug: 'plazhi' },
        { id: randomUUID(), name: 'Qendra', slug: 'qendra' },
      ],
    },
  ];
  const { data, error: insErr } = await sb.from('real_estate_cities').insert(cities).select('*');
  if (insErr) throw insErr;
  console.log('Inserted cities:', data.length);
  return data;
}

async function seedOnePerCategory(sb, posterId, cities) {
  const city = cities[0];
  const zone = city.zones[0];
  const now = new Date().toISOString();

  const checks = [
    ['real_estate_listings', {}],
    ['car_listings', {}],
    ['job_listings', {}],
    ['marketplace_listings', {}],
    ['directory_listings', { vertical: 'businesses' }],
    ['directory_listings', { vertical: 'professionals' }],
  ];

  for (const [table, extra] of checks) {
    let q = sb.from(table).select('id', { count: 'exact', head: true }).eq('poster_id', posterId);
    for (const [k, v] of Object.entries(extra)) q = q.eq(k, v);
    const { count, error } = await q;
    if (error) throw error;
    if ((count || 0) > 0) {
      console.log(`Skip ${table}${extra.vertical ? `/${extra.vertical}` : ''} (already has posts)`);
      continue;
    }

    if (table === 'real_estate_listings') {
      const { error: e } = await sb.from(table).insert({
        poster_id: posterId,
        property_category: 'apartment',
        title: 'Apartament 2+1 te Blloku',
        description: 'Apartament i ndriçuar me pamje, i mobiluar pjesërisht. Ideal për banim ose investim.',
        transaction_type: 'sale',
        price: 145000,
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
      });
      if (e) throw e;
      console.log('Inserted real-estate listing');
    } else if (table === 'car_listings') {
      const { error: e } = await sb.from(table).insert({
        poster_id: posterId,
        vehicle_type: 'car',
        make: 'BMW',
        model: '3 Series',
        variant: 'M Sport',
        description: 'Makina e mirëmbajtur, e rregjistruar në Shqipëri. Shërbime të dokumentuara.',
        year: 2018,
        kilometers: 98000,
        transmission: 'automatic',
        fuel_type: 'diesel',
        price: 17500,
        currency: 'EUR',
        color: 'black',
        finish: ['metallic'],
        extras: ['ABS', 'Air conditioning', 'Parking sensors'],
        contact_phone: PHONE,
        city_id: city.id,
        image_urls: IMG.car,
        status: 'approved',
        reviewed_at: now,
      });
      if (e) throw e;
      console.log('Inserted car listing');
    } else if (table === 'job_listings') {
      const { error: e } = await sb.from(table).insert({
        poster_id: posterId,
        title: 'Frontend Developer (React)',
        description: 'Pozicion i hapur në Tiranë. Ofrojmë mjedis pune profesional dhe mundësi zhvillimi.',
        industry: 'teknologji-informacioni',
        education: 'bachelor',
        experience: '2-3',
        job_type: 'full-time',
        work_location: 'hybrid',
        city_id: city.id,
        salary: 1400,
        currency: 'EUR',
        contact_phone: PHONE,
        image_urls: IMG.job,
        responsibilities: ['Zhvillim UI me React', 'Bashkëpunim me ekipin'],
        requirements: ['React', 'TypeScript'],
        benefits: [
          { id: 'pay', label: 'Pagë konkurruese' },
          { id: 'remote', label: 'Hybrid' },
        ],
        status: 'approved',
        reviewed_at: now,
      });
      if (e) throw e;
      console.log('Inserted job listing');
    } else if (table === 'marketplace_listings') {
      const { error: e } = await sb.from(table).insert({
        poster_id: posterId,
        transaction_type: 'shes',
        title: 'iPhone 13 128GB',
        description: 'Telefon në gjendje shumë të mirë, me kuti. Çmimi i diskutueshëm.',
        category: 'elektronike',
        condition: 'si-i-ri',
        price: 420,
        currency: 'EUR',
        city_id: city.id,
        contact_phone: PHONE,
        image_urls: IMG.phone,
        status: 'approved',
        reviewed_at: now,
      });
      if (e) throw e;
      console.log('Inserted marketplace listing');
    } else if (extra.vertical === 'businesses') {
      const menu = buildDemoBusinessMenu('restorant');
      const { error: e } = await sb.from(table).insert({
        vertical: 'businesses',
        poster_id: posterId,
        title: 'Restorant Deti Blu',
        description: 'Kuzhinë mesdhetare dhe peshk i freskët. Rezervime të pranuara.',
        category: 'restorant',
        city_id: city.id,
        contact_phone: PHONE,
        image_urls: IMG.resto,
        weekly_hours: weekHours('12:00', '23:30'),
        opening_hours: '12:00–23:30',
        menu_categories: menu.menuCategories,
        menu_items: menu.menuItems,
        reservations_enabled: true,
        reservation_time_slots: ['12:00', '13:00', '19:00', '20:00', '21:00'],
        reservation_party_sizes: [2, 4, 6, 8],
        services_highlight: 'Wifi, parking, delivery',
        status: 'approved',
        reviewed_at: now,
      });
      if (e) throw e;
      console.log('Inserted business listing');
    } else if (extra.vertical === 'professionals') {
      const { error: e } = await sb.from(table).insert({
        vertical: 'professionals',
        poster_id: posterId,
        title: 'Web developer WordPress',
        description: 'Website biznesi dhe e-commerce. Shërbim profesional në Tiranë dhe online.',
        category: 'freelance',
        city_id: city.id,
        contact_phone: PHONE,
        image_urls: IMG.pro,
        price: 20,
        currency: 'EUR',
        response_time_hours: 24,
        services_highlight: 'Website biznesi dhe e-commerce',
        portfolio_items: [],
        weekly_hours: weekHours('09:00', '18:00'),
        status: 'approved',
        reviewed_at: now,
      });
      if (e) throw e;
      console.log('Inserted professional listing');
    }
  }
}

async function grantElite(sb, userId) {
  const { data: contract, error } = await sb
    .from('contracts')
    .select('*')
    .eq('plan_code', 'elite')
    .eq('subscriber_kind', 'agent')
    .maybeSingle();
  if (error) throw error;
  if (!contract) throw new Error('Elite contract (agent) not found after ensureContractPackages');

  // Expire any previous active paid subs so Elite is the clear active plan.
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 12);

  await sb
    .from('user_subscriptions')
    .update({ status: 'canceled', updated_at: now.toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active');

  const boost = Number(contract.boost_credits) || 0;
  const { data: sub, error: subErr } = await sb
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      contract_id: contract.id,
      contract_title: contract.title || 'ELITE',
      listing_category_key: contract.listing_category_key ?? null,
      subscriber_kind: contract.subscriber_kind ?? 'agent',
      months: 12,
      price_eur: Number(contract.price_1_month) || 149,
      refresh_every_hours: contract.refresh_every_hours ?? 6,
      glow_badge_enabled: Boolean(contract.glow_badge_enabled),
      boost_credits_granted: boost,
      daily_boost_access: Boolean(contract.daily_boost_access),
      plan_code: 'elite',
      max_list_all_categories: Number(contract.max_list_all_categories) || 0,
      max_job_listings: Number(contract.max_job_listings) || 0,
      max_car_listings: Number(contract.max_car_listings) || 0,
      max_apartment_listings: Number(contract.max_apartment_listings) || 0,
      max_product_listings: Number(contract.max_product_listings) || 0,
      max_premium_listings: Number(contract.max_premium_listings) || 0,
      max_okazion_listings: Number(contract.max_okazion_listings) || 0,
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'active',
    })
    .select('id')
    .single();
  if (subErr) throw subErr;

  if (boost > 0) {
    const { data: profile, error: pErr } = await sb
      .from('profiles')
      .select('boost_credits')
      .eq('id', userId)
      .maybeSingle();
    if (pErr) throw pErr;
    const { error: uErr } = await sb
      .from('profiles')
      .update({
        boost_credits: (Number(profile?.boost_credits) || 0) + boost,
        updated_at: now.toISOString(),
      })
      .eq('id', userId);
    if (uErr) throw uErr;
  }

  console.log('Granted Elite subscription:', sub.id, `+${boost} BC`);
}

async function main() {
  if (!isSupabaseConfigured()) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  }
  const sb = getSupabaseAdmin();

  await ensureCoreRoles();
  await ensureContractPackages();

  const profile = await ensureUser(sb);
  // Attach Individual role id if available
  const { data: role } = await sb.from('roles').select('id').eq('name', 'Individual').maybeSingle();
  if (role?.id) {
    await sb
      .from('profiles')
      .update({ role_id: role.id, role: 'Individual', updated_at: new Date().toISOString() })
      .eq('id', profile.id);
  }

  const cities = await ensureCities(sb);
  await seedOnePerCategory(sb, profile.id, cities);
  await grantElite(sb, profile.id);

  console.log('Done.', { email: EMAIL, userId: profile.id });
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
