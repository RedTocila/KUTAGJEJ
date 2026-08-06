'use strict';

/**
 * Restore real-user entitlements after an init.sql wipe.
 * Auth users + some additive tables (e.g. premium_listing_vouchers) survived;
 * listings / payments / referrals / boost balances did not.
 *
 *   node scripts/restore-wiped-users.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabase');
const { ensureContractPackages } = require('../lib/ensure-contract-packages');
const { ensureCoreRoles } = require('../lib/core-roles');

const SEED_EMAILS = new Set([
  'seed.business@kutagjej.local',
  'seed.individual@kutagjej.local',
]);

/** Known pre-wipe state recovered from vouchers + prior admin grants. */
const KNOWN = {
  'emiljangeshtenja25@gmail.com': {
    plan: 'elite',
    // Granted 2026-08-03 → 2027-08-03, +2000 BC. Spent 100 BC (premium-5) + 300 BC (premium-30 unused).
    boostCredits: 1600,
    eliteExpiresAt: '2027-08-03T12:00:00.000Z',
    restoreProfessionals: true,
    restoreBusiness: true,
  },
  'redjan.t13@gmail.com': {
    plan: 'elite',
    boostCredits: 2000,
    eliteExpiresAt: null, // keep / refresh 12 months from now if missing
  },
};

function publicUrl(sb, path) {
  return sb.storage.from('uploads').getPublicUrl(path).data.publicUrl;
}

async function grantPlan(sb, profile, planCode, expiresAtIso) {
  const isBusiness =
    profile.account_type === 'business' || profile.role === 'business-user';
  const kind = isBusiness ? 'company' : 'agent';

  const { data: contract, error } = await sb
    .from('contracts')
    .select('*')
    .eq('plan_code', planCode)
    .eq('subscriber_kind', kind)
    .maybeSingle();
  if (error) throw error;
  if (!contract) throw new Error(`${planCode} contract (${kind}) missing`);

  const now = new Date();
  const expiresAt = expiresAtIso ? new Date(expiresAtIso) : new Date(now);
  if (!expiresAtIso) expiresAt.setMonth(expiresAt.getMonth() + 12);

  await sb
    .from('user_subscriptions')
    .update({ status: 'canceled', updated_at: now.toISOString() })
    .eq('user_id', profile.id)
    .eq('status', 'active');

  const { data: sub, error: subErr } = await sb
    .from('user_subscriptions')
    .insert({
      user_id: profile.id,
      contract_id: contract.id,
      contract_title: contract.title || planCode.toUpperCase(),
      listing_category_key: contract.listing_category_key ?? null,
      subscriber_kind: contract.subscriber_kind ?? kind,
      months: 12,
      price_eur: Number(contract.price_1_month) || 0,
      refresh_every_hours: contract.refresh_every_hours ?? null,
      glow_badge_enabled: Boolean(contract.glow_badge_enabled),
      boost_credits_granted: Number(contract.boost_credits) || 0,
      daily_boost_access: Boolean(contract.daily_boost_access),
      plan_code: planCode,
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
    .select('id, plan_code, expires_at')
    .single();
  if (subErr) throw subErr;
  return sub;
}

async function syncProfileFromAuth(sb, profile, authUser, roleByName) {
  const meta = authUser?.user_metadata || {};
  const isBusiness = profile.account_type === 'business';
  const roleName = isBusiness ? 'Biznes' : profile.account_type === 'admin' ? null : 'Individual';
  const patch = {
    business_name: meta.business_name || profile.business_name || null,
    first_name: meta.first_name || profile.first_name || '',
    last_name: meta.last_name || profile.last_name || '',
    updated_at: new Date().toISOString(),
  };
  if (roleName && roleByName[roleName]) {
    patch.role_id = roleByName[roleName];
    patch.role = isBusiness ? 'business-user' : 'Individual';
  }
  const { error } = await sb.from('profiles').update(patch).eq('id', profile.id);
  if (error) throw error;
}

async function ensureDirectoryListing(sb, { posterId, vertical, title, description, category, cityId, imageUrls }) {
  const { data: existing } = await sb
    .from('directory_listings')
    .select('id')
    .eq('poster_id', posterId)
    .eq('vertical', vertical)
    .maybeSingle();
  if (existing) return existing;

  const now = new Date().toISOString();
  const row = {
    vertical,
    poster_id: posterId,
    title,
    description,
    category,
    city_id: cityId,
    contact_phone: '',
    image_urls: imageUrls,
    status: 'approved',
    reviewed_at: now,
    created_at: now,
    updated_at: now,
  };
  // Keep cards looking like normal listings — do not surface restore notes as labels.
  row.services_highlight = null;
  if (vertical === 'professionals') {
    row.currency = 'EUR';
    row.response_time_hours = 24;
    row.portfolio_items = [];
    row.weekly_hours = {};
  } else {
    row.weekly_hours = {};
    row.menu_categories = [];
    row.menu_items = [];
    row.reservations_enabled = false;
    row.reservation_time_slots = [];
    row.reservation_party_sizes = [];
  }

  const { data, error } = await sb.from('directory_listings').insert(row).select('id').single();
  if (error) throw error;
  return data;
}

async function relinkPremiumVouchers(sb, userId, oldListingId, newListingId) {
  if (!oldListingId || !newListingId || oldListingId === newListingId) return 0;
  const { data, error } = await sb
    .from('premium_listing_vouchers')
    .update({ listing_id: newListingId, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('listing_id', oldListingId)
    .select('id');
  if (error) throw error;
  return (data || []).length;
}

async function main() {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  await ensureCoreRoles();
  await ensureContractPackages();

  const sb = getSupabaseAdmin();
  const { data: roles } = await sb.from('roles').select('id,name');
  const roleByName = Object.fromEntries((roles || []).map((r) => [r.name, r.id]));

  const { data: city } = await sb
    .from('real_estate_cities')
    .select('id,name')
    .eq('slug', 'tirane')
    .maybeSingle();

  const { data: authPage } = await sb.auth.admin.listUsers({ perPage: 200 });
  const authById = new Map((authPage?.users || []).map((u) => [u.id, u]));

  const { data: profiles, error: pErr } = await sb
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (pErr) throw pErr;

  const proImages = [
    'professionals/1785759201738-dce8f16703b5.png',
    'professionals/1785759204090-ba67e396f18a.png',
    'professionals/1785759206564-19c5a35bd1a4.png',
    'professionals/1785759651223-cf916f05a669.png',
    'professionals/1785759656293-c04f12ab79ec.png',
    'professionals/1785759662208-802ac499217d.png',
  ].map((p) => publicUrl(sb, p));

  const bizImages = ['business-announcements/1785891506853-0ce2dd46a0bd.png'].map((p) =>
    publicUrl(sb, p),
  );

  const report = [];

  for (const profile of profiles || []) {
    if (SEED_EMAILS.has(profile.email) || profile.account_type === 'admin') {
      report.push({ email: profile.email, skipped: true, reason: 'seed/admin' });
      continue;
    }

    const authUser = authById.get(profile.id);
    await syncProfileFromAuth(sb, profile, authUser, roleByName);

    const known = KNOWN[profile.email] || null;
    const entry = { email: profile.email, actions: [] };

    // Infer paid plan from surviving subscription-source vouchers
    const { data: vouchers } = await sb
      .from('premium_listing_vouchers')
      .select('*')
      .eq('user_id', profile.id);

    const hadPlanPremium = (vouchers || []).some((v) => v.source === 'subscription');
    const plan = known?.plan || (hadPlanPremium ? 'elite' : null);

    if (plan === 'elite') {
      const sub = await grantPlan(sb, profile, 'elite', known?.eliteExpiresAt || null);
      entry.actions.push(`elite→${sub.expires_at}`);
    }

    if (known?.boostCredits != null) {
      const { error } = await sb
        .from('profiles')
        .update({
          boost_credits: known.boostCredits,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (error) throw error;
      entry.actions.push(`boost=${known.boostCredits}`);
    } else if (plan === 'elite' && (Number(profile.boost_credits) || 0) < 2000) {
      // Default Elite grant if we know they had a plan but not exact spend
      const { error } = await sb
        .from('profiles')
        .update({ boost_credits: 2000, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (error) throw error;
      entry.actions.push('boost=2000');
    }

    if (known?.restoreProfessionals) {
      const businessName =
        authUser?.user_metadata?.business_name || profile.business_name || 'Geshtenja Light';
      const listing = await ensureDirectoryListing(sb, {
        posterId: profile.id,
        vertical: 'professionals',
        title: businessName,
        description: '',
        category: 'sherbim',
        cityId: city?.id || null,
        imageUrls: proImages,
      });
      entry.actions.push(`professionals=${listing.id}`);

      const oldId = (vouchers || []).find(
        (v) => v.listing_kind === 'professionals' && v.listing_id,
      )?.listing_id;
      const n = await relinkPremiumVouchers(sb, profile.id, oldId, listing.id);
      if (n) entry.actions.push(`relinked ${n} premium voucher(s)`);

      // Best-effort premium window if column exists
      const until = new Date();
      until.setDate(until.getDate() + 30);
      const { error: premErr } = await sb
        .from('directory_listings')
        .update({ premium_until: until.toISOString() })
        .eq('id', listing.id);
      if (premErr && /premium_until/i.test(premErr.message)) {
        entry.actions.push('premium_until column missing — run repair SQL');
      } else if (!premErr) {
        entry.actions.push('premium_until +30d');
      }
    }

    if (known?.restoreBusiness) {
      const businessName =
        authUser?.user_metadata?.business_name || profile.business_name || 'Geshtenja Light';
      const listing = await ensureDirectoryListing(sb, {
        posterId: profile.id,
        vertical: 'businesses',
        title: businessName,
        description: '',
        category: 'kafe',
        cityId: city?.id || null,
        imageUrls: bizImages,
      });
      entry.actions.push(`businesses=${listing.id}`);
    }

    if (!entry.actions.length) entry.actions.push('profile synced from auth only');
    report.push(entry);
  }

  console.log(JSON.stringify(report, null, 2));
  console.log(
    '\nNote: referral progress, converted-quota history, and other wiped listings cannot be reconstructed without a Supabase backup / PITR.',
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
