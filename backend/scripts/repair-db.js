'use strict';

/**
 * Repair live Supabase after an init.sql wipe:
 *  1) Apply missing DDL (needs DATABASE_URL or SUPABASE_DB_URL)
 *  2) Re-grant Elite to redjan.t13@gmail.com (REST — works with service role)
 *
 *   DATABASE_URL='postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres' \
 *     node scripts/repair-db.js
 *
 * Or paste backend/scripts/repair-missing-schema.sql in Supabase → SQL Editor,
 * then run: node scripts/repair-db.js --data-only
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabase');
const { ensureContractPackages } = require('../lib/ensure-contract-packages');

const ELITE_EMAIL = process.env.REPAIR_ELITE_EMAIL || 'redjan.t13@gmail.com';
const dataOnly = process.argv.includes('--data-only');

async function applyRepairSql() {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    console.warn(
      'No DATABASE_URL / SUPABASE_DB_URL — skipping DDL.\n' +
        'Paste backend/scripts/repair-missing-schema.sql in Supabase SQL Editor, then re-run with --data-only.',
    );
    return false;
  }

  let Client;
  try {
    ({ Client } = require('pg'));
  } catch {
    console.error('Install pg first: npm install pg --prefix backend');
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, 'repair-missing-schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log('✓ Applied repair-missing-schema.sql');
  } finally {
    await client.end();
  }
  return true;
}

async function grantElite(sb, userId, subscriberKind) {
  const { data: contract, error } = await sb
    .from('contracts')
    .select('*')
    .eq('plan_code', 'elite')
    .eq('subscriber_kind', subscriberKind)
    .maybeSingle();
  if (error) throw error;
  if (!contract) throw new Error(`Elite contract (${subscriberKind}) not found`);

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
      subscriber_kind: contract.subscriber_kind ?? subscriberKind,
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
    .select('id, plan_code, expires_at')
    .single();
  if (subErr) throw subErr;

  const { data: profile } = await sb.from('profiles').select('boost_credits').eq('id', userId).maybeSingle();
  const current = Number(profile?.boost_credits) || 0;
  if (current < boost) {
    const { error: uErr } = await sb
      .from('profiles')
      .update({ boost_credits: boost, updated_at: now.toISOString() })
      .eq('id', userId);
    if (uErr) throw uErr;
  }

  return { sub, boost: Math.max(current, boost) };
}

async function restoreEliteData() {
  if (!isSupabaseConfigured()) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  }
  await ensureContractPackages();
  const sb = getSupabaseAdmin();
  const { data: profile, error } = await sb
    .from('profiles')
    .select('id, email, account_type, role')
    .eq('email', ELITE_EMAIL)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error(`Profile not found: ${ELITE_EMAIL}`);

  const isBusiness =
    profile.account_type === 'business' || profile.role === 'business-user';
  const kind = isBusiness ? 'company' : 'agent';
  const roleName = isBusiness ? 'Biznes' : 'Individual';
  const { data: role } = await sb.from('roles').select('id').eq('name', roleName).maybeSingle();
  if (role?.id) {
    await sb
      .from('profiles')
      .update({ role_id: role.id, updated_at: new Date().toISOString() })
      .eq('id', profile.id);
  }

  const result = await grantElite(sb, profile.id, kind);
  console.log(`✓ Elite restored for ${ELITE_EMAIL} (${kind})`, result.sub, `BC=${result.boost}`);
}

async function probeSchema() {
  const sb = getSupabaseAdmin();
  const checks = [
    ['real_estate_listings', 'premium_until'],
    ['profiles', 'login_streak_days'],
    ['profiles', 'daily_share_claimed_on'],
    ['directory_listings', 'announcement_title'],
    ['contracts', 'max_okazion_listings'],
  ];
  let missing = 0;
  for (const [table, col] of checks) {
    const { error } = await sb.from(table).select(col).limit(1);
    if (error) {
      missing += 1;
      console.warn(`✗ ${table}.${col}: ${String(error.message).split('\n')[0]}`);
    } else {
      console.log(`✓ ${table}.${col}`);
    }
  }
  return missing;
}

async function main() {
  if (!dataOnly) {
    await applyRepairSql();
  }
  await restoreEliteData();
  const missing = await probeSchema();
  if (missing > 0) {
    console.warn(
      `\n${missing} schema gap(s) remain. Run backend/scripts/repair-missing-schema.sql in the Supabase SQL Editor.`,
    );
    process.exitCode = 2;
  } else {
    console.log('\nSchema + Elite look good.');
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
