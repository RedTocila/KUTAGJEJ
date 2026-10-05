'use strict';

/**
 * Create / reset the Apple App Review demo accounts with pre-populated content.
 *
 *   node scripts/setup-app-store-review-demo.js
 *
 * Accounts (same password, override with REVIEW_PASSWORD):
 *   - appreview@kutagjej.al           individual · real-estate, car, marketplace listings
 *   - appreview-business@kutagjej.al  business   · restaurant listing (menu + reservations)
 *   - appreview-buyer@kutagjej.al     individual · helper buyer so both review accounts have chats
 *
 * Seeds one conversation per pair (the app allows one thread per two users) with several
 * messages, a business review and a reservation. Re-running is safe: it only touches rows
 * owned by these demo accounts, unblocks them from each other and un-hides their chats.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { randomUUID } = require('crypto');
const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabase');
const { getProfileByEmail, insertProfile } = require('../lib/profiles');
const { ensureCoreRoles } = require('../lib/core-roles');
const { buildDemoBusinessMenu } = require('../lib/demo-business-menu');

const PASSWORD = process.env.REVIEW_PASSWORD || 'ReviewKuTaGjej2026!';

const ACCOUNTS = {
  individual: {
    email: process.env.REVIEW_EMAIL || 'appreview@kutagjej.al',
    firstName: 'App',
    lastName: 'Reviewer',
    phone: '+355 69 000 0001',
    accountType: 'individual',
  },
  business: {
    email: process.env.REVIEW_BUSINESS_EMAIL || 'appreview-business@kutagjej.al',
    firstName: 'Demo',
    lastName: 'Biznes',
    phone: '+355 69 000 0002',
    accountType: 'business',
    businessName: 'Restorant Demo (App Review)',
    businessCategory: 'restorant',
    nipt: process.env.REVIEW_BUSINESS_NIPT || 'M99999999R',
  },
  buyer: {
    email: process.env.REVIEW_BUYER_EMAIL || 'appreview-buyer@kutagjej.al',
    firstName: 'Demo',
    lastName: 'Blerës',
    phone: '+355 69 000 0003',
    accountType: 'individual',
  },
};

const TITLE_PREFIX = 'App Review';

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
  resto: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  ],
};

function weekHours(open, close) {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    closed: dayOfWeek === 0,
    open: dayOfWeek === 0 ? null : open,
    close: dayOfWeek === 0 ? null : close,
  }));
}

async function findAuthByEmail(sb, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = (data.users || []).find((u) => String(u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (!data.users?.length || data.users.length < 200) break;
  }
  return null;
}

function profileFields(acc) {
  const base = {
    first_name: acc.firstName,
    last_name: acc.lastName,
    phone: acc.phone,
    account_type: acc.accountType,
    is_active: true,
  };
  if (acc.accountType === 'business') {
    return {
      ...base,
      role: 'business-user',
      nipt: acc.nipt,
      business_name: acc.businessName,
      business_owner: `${acc.firstName} ${acc.lastName}`,
      business_category: acc.businessCategory,
    };
  }
  return { ...base, role: 'Individual' };
}

async function ensureAccount(sb, acc) {
  const metadata = {
    account_type: acc.accountType,
    first_name: acc.firstName,
    last_name: acc.lastName,
    ...(acc.accountType === 'business' ? { business_name: acc.businessName } : {}),
  };

  let profile = await getProfileByEmail(acc.email);
  if (profile) {
    const { error: authErr } = await sb.auth.admin.updateUserById(profile.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (authErr) throw authErr;
    const { error } = await sb
      .from('profiles')
      .update({ ...profileFields(acc), updated_at: new Date().toISOString() })
      .eq('id', profile.id);
    if (error) throw error;
    console.log(`Updated ${acc.email}:`, profile.id);
    return profile;
  }

  let authUser = await findAuthByEmail(sb, acc.email);
  if (authUser) {
    const { error } = await sb.auth.admin.updateUserById(authUser.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email: acc.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    authUser = data.user;
  }

  profile = await insertProfile({ id: authUser.id, email: acc.email, ...profileFields(acc), boost_credits: 0 });
  console.log(`Created ${acc.email}:`, profile.id);
  return profile;
}

async function attachRole(sb, profileId, roleName, roleLabel) {
  const { data: role } = await sb.from('roles').select('id').eq('name', roleName).maybeSingle();
  if (!role?.id) return;
  const { error } = await sb
    .from('profiles')
    .update({ role_id: role.id, role: roleLabel, updated_at: new Date().toISOString() })
    .eq('id', profileId);
  if (error) throw error;
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

/** Returns the poster's first listing in `table`, inserting `row` when there is none. */
async function ensureListing(sb, table, posterId, row, extraFilter = {}) {
  let q = sb.from(table).select('id').eq('poster_id', posterId).order('created_at', { ascending: true }).limit(1);
  for (const [k, v] of Object.entries(extraFilter)) q = q.eq(k, v);
  const { data: existing, error } = await q;
  if (error) throw error;
  if (existing?.length) return existing[0].id;

  const { data, error: insErr } = await sb
    .from(table)
    .insert({ ...row, poster_id: posterId, status: 'approved', reviewed_at: new Date().toISOString() })
    .select('id')
    .single();
  if (insErr) throw insErr;
  console.log(`Inserted ${table} listing for ${posterId}`);
  return data.id;
}

async function seedListings(sb, ids, city) {
  const zone = Array.isArray(city.zones) && city.zones[0] ? city.zones[0] : null;
  const individualPhone = ACCOUNTS.individual.phone;
  const businessPhone = ACCOUNTS.business.phone;

  const apartmentId = await ensureListing(sb, 'real_estate_listings', ids.individual, {
    property_category: 'apartment',
    title: `${TITLE_PREFIX} — Apartament demo Tiranë`,
    description: 'Demo listing for Apple App Review. Safe to browse; not a real offer.',
    transaction_type: 'sale',
    price: 120000,
    currency: 'EUR',
    surface_m2: 75,
    city_id: city.id,
    zone_id: zone?.id ?? null,
    contact_phone: individualPhone,
    condition: 'renovated',
    floor: 3,
    bedrooms: 2,
    bathrooms: 1,
    furnishing: 'furnished',
    year_built: 2020,
    image_urls: IMG.apt,
  });

  await ensureListing(sb, 'car_listings', ids.individual, {
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
    contact_phone: individualPhone,
    city_id: city.id,
    image_urls: IMG.car,
  });

  const phoneId = await ensureListing(sb, 'marketplace_listings', ids.individual, {
    transaction_type: 'shes',
    title: `${TITLE_PREFIX} — iPhone demo`,
    description: 'Demo marketplace listing for Apple App Review.',
    category: 'elektronike',
    condition: 'si-i-ri',
    price: 300,
    currency: 'EUR',
    city_id: city.id,
    contact_phone: individualPhone,
    image_urls: IMG.phone,
  });

  const menu = buildDemoBusinessMenu('restorant');
  const restaurantId = await ensureListing(
    sb,
    'directory_listings',
    ids.business,
    {
      vertical: 'businesses',
      title: 'Restorant Demo (App Review)',
      description: 'Demo business listing for Apple App Review: menu, opening hours and table reservations.',
      category: 'restorant',
      city_id: city.id,
      contact_phone: businessPhone,
      image_urls: IMG.resto,
      weekly_hours: weekHours('12:00', '23:00'),
      opening_hours: '12:00–23:00',
      menu_categories: menu.menuCategories,
      menu_items: menu.menuItems,
      reservations_enabled: true,
      reservation_time_slots: ['12:00', '13:00', '19:00', '20:00', '21:00'],
      reservation_party_sizes: [2, 4, 6],
      services_highlight: 'Wi‑Fi, parking, rezervime online',
    },
    { vertical: 'businesses' },
  );

  return {
    apartment: { kind: 'real-estate', id: apartmentId, title: `${TITLE_PREFIX} — Apartament demo Tiranë`, image: IMG.apt[0] },
    phone: { kind: 'marketplace', id: phoneId, title: `${TITLE_PREFIX} — iPhone demo`, image: IMG.phone[0] },
    restaurant: { kind: 'businesses', id: restaurantId, title: 'Restorant Demo (App Review)', image: IMG.resto[0] },
  };
}

/** Undo anything the reviewer may have done last time (block / hide chat) between demo accounts. */
async function resetDemoRelations(sb, demoIds) {
  const { error: blockErr } = await sb
    .from('user_blocks')
    .delete()
    .in('blocker_id', demoIds)
    .in('blocked_id', demoIds);
  if (blockErr && !/does not exist|Could not find the table/i.test(String(blockErr.message || ''))) throw blockErr;
}

async function findConversation(sb, a, b) {
  const { data, error } = await sb
    .from('conversations')
    .select('id')
    .or(`and(poster_id.eq.${a},inquirer_id.eq.${b}),and(poster_id.eq.${b},inquirer_id.eq.${a})`)
    .limit(1);
  if (error) throw error;
  return data?.[0]?.id || null;
}

/**
 * One thread per user pair. Messages are only inserted when the thread is new, so re-runs never
 * duplicate them. `script` entries are [senderKey, text, minutesAgo].
 */
async function ensureConversation(sb, { posterId, inquirerId, listing, script, senderIds, posterUnread, inquirerUnread }) {
  let conversationId = await findConversation(sb, posterId, inquirerId);

  if (!conversationId) {
    const { data, error } = await sb
      .from('conversations')
      .insert({
        listing_kind: listing.kind,
        listing_id: listing.id,
        listing_title: listing.title,
        listing_image_url: listing.image,
        poster_id: posterId,
        inquirer_id: inquirerId,
        started_by: 'inquirer',
      })
      .select('id')
      .single();
    if (error) throw error;
    conversationId = data.id;

    const now = Date.now();
    const rows = script.map(([sender, body, minutesAgo]) => {
      const at = new Date(now - minutesAgo * 60 * 1000).toISOString();
      return { conversation_id: conversationId, sender_id: senderIds[sender], body, created_at: at, updated_at: at };
    });
    const { error: msgErr } = await sb.from('messages').insert(rows);
    if (msgErr) throw msgErr;

    const last = rows[rows.length - 1];
    const { error: updErr } = await sb
      .from('conversations')
      .update({
        last_message_text: last.body.slice(0, 200),
        last_message_at: last.created_at,
        last_message_sender_id: last.sender_id,
        poster_unread_count: posterUnread,
        inquirer_unread_count: inquirerUnread,
        updated_at: last.created_at,
      })
      .eq('id', conversationId);
    if (updErr) throw updErr;
    console.log(`Created conversation about "${listing.title}" with ${rows.length} messages`);
  } else {
    console.log(`Conversation about "${listing.title}" already exists`);
  }

  const states = [posterId, inquirerId].map((userId) => ({
    conversation_id: conversationId,
    user_id: userId,
    hidden_at: null,
    updated_at: new Date().toISOString(),
  }));
  const { error: stateErr } = await sb
    .from('conversation_user_state')
    .upsert(states, { onConflict: 'conversation_id,user_id' });
  if (stateErr && !/does not exist|Could not find the table/i.test(String(stateErr.message || ''))) throw stateErr;
}

async function seedConversations(sb, ids, listings) {
  const senderIds = { individual: ids.individual, business: ids.business, buyer: ids.buyer };

  await ensureConversation(sb, {
    posterId: ids.individual,
    inquirerId: ids.business,
    listing: listings.apartment,
    senderIds,
    posterUnread: 1,
    inquirerUnread: 0,
    script: [
      ['business', 'Përshëndetje! A është ende në dispozicion apartamenti?', 300],
      ['individual', 'Po, është ende në dispozicion. Kur do të donit ta shihnit?', 280],
      ['business', 'Nesër pasdite rreth orës 17:00 ju përshtatet?', 260],
      ['individual', 'Po, në rregull. Ju dërgoj vendndodhjen nesër në mëngjes.', 240],
      ['business', 'Faleminderit! Çmimi është i diskutueshëm?', 30],
    ],
  });

  await ensureConversation(sb, {
    posterId: ids.individual,
    inquirerId: ids.buyer,
    listing: listings.phone,
    senderIds,
    posterUnread: 0,
    inquirerUnread: 1,
    script: [
      ['buyer', 'Tungjatjeta, iPhone ka ndonjë gërvishtje?', 200],
      ['individual', 'Jo, është si i ri. Bateria është në 92%.', 190],
      ['buyer', 'A mund ta takojmë sot në qendër?', 180],
      ['individual', 'Sigurisht, pas orës 18:00 te sheshi Skënderbej.', 60],
    ],
  });

  await ensureConversation(sb, {
    posterId: ids.business,
    inquirerId: ids.buyer,
    listing: listings.restaurant,
    senderIds,
    posterUnread: 1,
    inquirerUnread: 0,
    script: [
      ['buyer', 'Përshëndetje, keni tavolinë për 4 persona të shtunën në 20:00?', 150],
      ['business', 'Po, kemi vend. E rezervuam në emrin tuaj.', 140],
      ['buyer', 'Shumë faleminderit! A keni edhe opsione vegjetariane?', 20],
    ],
  });
}

async function seedBusinessExtras(sb, ids, listings) {
  const { error: reviewErr } = await sb.from('business_listing_reviews').upsert(
    {
      listing_id: listings.restaurant.id,
      reviewer_id: ids.buyer,
      rating: 5,
      comment: 'Ushqim shumë i mirë dhe shërbim i shpejtë. Rekomandoj!',
    },
    { onConflict: 'listing_id,reviewer_id' },
  );
  if (reviewErr) throw reviewErr;

  const { count, error: countErr } = await sb
    .from('business_reservations')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', listings.restaurant.id)
    .eq('user_id', ids.buyer);
  if (countErr) throw countErr;
  if (!count) {
    const saturday = new Date();
    saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7 || 7));
    const { error } = await sb.from('business_reservations').insert({
      listing_id: listings.restaurant.id,
      guest_name: `${ACCOUNTS.buyer.firstName} ${ACCOUNTS.buyer.lastName}`,
      guest_phone: ACCOUNTS.buyer.phone,
      party_size: 4,
      reservation_date: saturday.toISOString().slice(0, 10),
      time_slot: '20:00',
      status: 'pending',
      user_id: ids.buyer,
    });
    if (error) throw error;
    console.log('Inserted demo reservation');
  }
}

async function main() {
  if (!isSupabaseConfigured()) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  }
  const sb = getSupabaseAdmin();
  await ensureCoreRoles();

  const ids = {};
  for (const [key, acc] of Object.entries(ACCOUNTS)) {
    const profile = await ensureAccount(sb, acc);
    ids[key] = profile.id;
  }
  await attachRole(sb, ids.individual, 'Individual', 'Individual');
  await attachRole(sb, ids.buyer, 'Individual', 'Individual');
  await attachRole(sb, ids.business, 'Biznes', 'business-user');

  const city = await ensureCity(sb);
  const listings = await seedListings(sb, ids, city);
  await resetDemoRelations(sb, Object.values(ids));
  await seedConversations(sb, ids, listings);
  await seedBusinessExtras(sb, ids, listings);

  console.log('\n=== App Store Review demo accounts ===');
  console.log('Password (all):', PASSWORD);
  console.log('Individual:', ACCOUNTS.individual.email);
  console.log('Business:  ', ACCOUNTS.business.email);
  console.log('Helper:    ', ACCOUNTS.buyer.email, '(not needed by Apple)');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
