'use strict';

/**
 * Grant Elite + BC + high listing quotas to specific emails.
 *
 *   node scripts/grant-elite-bc-quotas.js
 *   node scripts/grant-elite-bc-quotas.js meisreve@gmail.com
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabase');
const { ensureContractPackages } = require('../lib/ensure-contract-packages');
const { ensureCoreRoles } = require('../lib/core-roles');

const DEFAULT_EMAILS = [
  'emiljangeshtenja25@gmail.com',
  'redjan.t13@gmail.com',
  'meisreve@gmail.com',
];
const EMAILS = process.argv.slice(2).filter((a) => a.includes('@'));
const TARGET_EMAILS = EMAILS.length > 0 ? EMAILS : DEFAULT_EMAILS;
const BOOST_CREDITS = 20_000;
const QUOTA_PER_CATEGORY = 1000;

async function grantEliteFull(sb, profile) {
  const isBusiness =
    profile.account_type === 'business' || profile.role === 'business-user';
  const kind = isBusiness ? 'company' : 'agent';

  const { data: contract, error } = await sb
    .from('contracts')
    .select('*')
    .eq('plan_code', 'elite')
    .eq('subscriber_kind', kind)
    .maybeSingle();
  if (error) throw error;
  if (!contract) throw new Error(`Elite contract (${kind}) missing`);

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 12);

  await sb
    .from('user_subscriptions')
    .update({ status: 'canceled', updated_at: now.toISOString() })
    .eq('user_id', profile.id)
    .eq('status', 'active');

  const row = {
    user_id: profile.id,
    contract_id: contract.id,
    contract_title: contract.title || 'ELITE',
    listing_category_key: contract.listing_category_key ?? null,
    subscriber_kind: contract.subscriber_kind ?? kind,
    months: 12,
    price_eur: Number(contract.price_1_month) || 149,
    refresh_every_hours: contract.refresh_every_hours ?? 6,
    glow_badge_enabled: true,
    boost_credits_granted: BOOST_CREDITS,
    daily_boost_access: Boolean(contract.daily_boost_access),
    plan_code: 'elite',
    max_list_all_categories: QUOTA_PER_CATEGORY,
    max_job_listings: QUOTA_PER_CATEGORY,
    max_car_listings: QUOTA_PER_CATEGORY,
    max_apartment_listings: QUOTA_PER_CATEGORY,
    max_product_listings: QUOTA_PER_CATEGORY,
    max_premium_listings: Math.max(QUOTA_PER_CATEGORY, Number(contract.max_premium_listings) || 0),
    max_okazion_listings: Math.max(QUOTA_PER_CATEGORY, Number(contract.max_okazion_listings) || 0),
    used_job_listings: 0,
    used_car_listings: 0,
    used_apartment_listings: 0,
    used_product_listings: 0,
    used_premium_listings: 0,
    used_okazion_listings: 0,
    starts_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active',
  };

  let { data: sub, error: subErr } = await sb
    .from('user_subscriptions')
    .insert(row)
    .select('id, plan_code, expires_at, max_job_listings, max_car_listings, max_apartment_listings, max_product_listings, max_premium_listings, max_okazion_listings, max_list_all_categories')
    .single();

  if (subErr && /max_okazion_listings/i.test(String(subErr.message || ''))) {
    const { max_okazion_listings: _omit, ...rest } = row;
    ({ data: sub, error: subErr } = await sb
      .from('user_subscriptions')
      .insert(rest)
      .select('id, plan_code, expires_at, max_job_listings, max_car_listings, max_apartment_listings, max_product_listings, max_premium_listings, max_list_all_categories')
      .single());
  }
  if (subErr) throw subErr;

  const { error: bcErr } = await sb
    .from('profiles')
    .update({
      boost_credits: BOOST_CREDITS,
      updated_at: now.toISOString(),
    })
    .eq('id', profile.id);
  if (bcErr) throw bcErr;

  return sub;
}

async function main() {
  if (!isSupabaseConfigured()) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  }

  await ensureCoreRoles();
  await ensureContractPackages();

  const sb = getSupabaseAdmin();
  const report = [];

  for (const email of TARGET_EMAILS) {
    const { data: profile, error } = await sb
      .from('profiles')
      .select('id, email, account_type, role, boost_credits')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    if (!profile) {
      report.push({ email, ok: false, error: 'profile not found' });
      continue;
    }

    const beforeBc = Number(profile.boost_credits) || 0;
    const sub = await grantEliteFull(sb, profile);
    report.push({
      email,
      ok: true,
      userId: profile.id,
      boostCredits: { before: beforeBc, after: BOOST_CREDITS },
      subscription: sub,
    });
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
