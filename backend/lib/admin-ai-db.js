'use strict';

const { getSupabaseAdmin } = require('./supabase');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDENT_RE = /^[a-z][a-z0-9_]*$/;
const MAX_INSPECT = 20;
const MAX_EQ_VALUE = 80;

const TABLE_ALIASES = {
  users: 'profiles',
  user: 'profiles',
  referrals: 'referral_signups',
  referral: 'referral_signups',
  'referral-program': 'referral_programs',
  'referral_program': 'referral_programs',
  'real-estate': 'real_estate_listings',
  realestate: 'real_estate_listings',
  cars: 'car_listings',
  jobs: 'job_listings',
  marketplace: 'marketplace_listings',
  businesses: 'directory_listings',
  professionals: 'directory_listings',
  directory: 'directory_listings',
  cities: 'real_estate_cities',
  banners: 'home_banners',
  subscriptions: 'user_subscriptions',
  notifications: 'user_notifications',
};

const TABLE_CATALOG = {
  profiles: {
    label: 'Profilët',
    select:
      'id, email, account_type, role, first_name, last_name, phone, business_name, nipt, is_active, boost_credits, auto_refresh_slots, referral_code, referred_by_id, login_streak_days, login_streak_last_day, daily_share_claimed_on, avatar_url, created_at, last_login',
    filterColumns: ['id', 'email', 'account_type', 'referral_code', 'referred_by_id', 'is_active'],
    probe: 'id, login_streak_days, login_streak_last_day, referral_code, referred_by_id, boost_credits, auto_refresh_slots, avatar_url',
  },
  referral_programs: {
    label: 'Programi i referimit',
    select: 'id, page_title, login_streak, free_tiers, paid_tiers, updated_at',
    filterColumns: ['id'],
    probe: 'id, login_streak, free_tiers, trusted_reviewer_badge, platform_dominator_badge',
  },
  referral_signups: {
    label: 'Regjistrime nga referimi',
    select: 'id, referrer_id, referred_user_id, kind, credits_awarded, referral_code_used, created_at',
    filterColumns: ['id', 'referrer_id', 'referred_user_id', 'referral_code_used'],
    probe: 'id, referrer_id, referred_user_id, credits_awarded',
  },
  user_subscriptions: {
    label: 'Abonime',
    select: 'id, user_id, plan_code, status, months, starts_at, expires_at, boost_credits_granted, max_okazion_listings',
    filterColumns: ['id', 'user_id', 'plan_code', 'status'],
    probe: 'id, plan_code, status, max_okazion_listings',
  },
  payments: {
    label: 'Pagesa',
    select: 'id, payer_id, type, amount, currency, status, granted, description, created_at',
    filterColumns: ['id', 'payer_id', 'status', 'type'],
    probe: 'id, status, granted',
  },
  premium_listing_vouchers: {
    label: 'Kupona Premium',
    select: 'id, user_id, status, listing_kind, listing_id, days, source, created_at',
    filterColumns: ['id', 'user_id', 'status'],
    probe: 'id, status',
  },
  okazion_listing_vouchers: {
    label: 'Kupona OKAZION',
    select: 'id, user_id, status, listing_kind, listing_id, days, source, created_at',
    filterColumns: ['id', 'user_id', 'status'],
    probe: 'id, status',
  },
  addon_packages: {
    label: 'Paketat shtesë',
    select: 'id, kind, days, slots, price_eur, price_bc, active, sort_order',
    filterColumns: ['id', 'kind', 'active'],
    probe: 'id, kind, active',
  },
  listing_auto_refresh: {
    label: 'Auto-Refresh',
    select: 'id, listing_id, listing_kind, user_id, enabled, last_refreshed_at',
    filterColumns: ['id', 'listing_id', 'user_id', 'listing_kind'],
    probe: 'listing_id',
  },
  admin_ai_actions: {
    label: 'Audit AI',
    select: 'id, admin_email, tool, ok, created_at',
    filterColumns: ['id', 'admin_email', 'tool', 'ok'],
    probe: 'id, tool',
  },
  real_estate_listings: {
    label: 'Prona',
    select: 'id, poster_id, title, status, premium_until, okazion_until, bumped_at, created_at',
    filterColumns: ['id', 'poster_id', 'status'],
    probe: 'id, premium_until, bumped_at, okazion_until',
  },
  car_listings: {
    label: 'Makina',
    select: 'id, poster_id, make, model, status, premium_until, okazion_until, bumped_at, created_at',
    filterColumns: ['id', 'poster_id', 'status'],
    probe: 'id, premium_until, bumped_at, vehicle_type',
  },
  job_listings: {
    label: 'Punë',
    select: 'id, poster_id, title, status, premium_until, okazion_until, bumped_at, created_at',
    filterColumns: ['id', 'poster_id', 'status'],
    probe: 'id, premium_until, bumped_at',
  },
  marketplace_listings: {
    label: 'Tregu',
    select: 'id, poster_id, title, status, premium_until, okazion_until, bumped_at, created_at',
    filterColumns: ['id', 'poster_id', 'status'],
    probe: 'id, premium_until, bumped_at',
  },
  directory_listings: {
    label: 'Biznese / profesionistë',
    select: 'id, poster_id, title, vertical, status, premium_until, bumped_at, announcement_title, created_at',
    filterColumns: ['id', 'poster_id', 'status', 'vertical'],
    probe: 'id, premium_until, bumped_at, announcement_title',
  },
  user_notifications: {
    label: 'Njoftime përdoruesi',
    select: 'id, user_id, type, title, read_at, created_at',
    filterColumns: ['id', 'user_id', 'type'],
    probe: 'id',
  },
  user_notification_preferences: {
    label: 'Preferenca njoftimesh',
    select: 'user_id, messages, listing_saved, listing_shared, listing_hot_lead, listing_status, reviews',
    filterColumns: ['user_id'],
    probe: 'user_id, listing_shared, listing_hot_lead',
  },
  contracts: {
    label: 'Kontrata',
    select: 'id, plan_code, subscriber_kind, title, price_1_month, boost_credits, max_okazion_listings',
    filterColumns: ['id', 'plan_code', 'subscriber_kind'],
    probe: 'id, plan_code, max_okazion_listings',
  },
  credit_packages: {
    label: 'Paketat BC',
    select: 'id, credits, bonus_credits, price_eur, active, sort_order',
    filterColumns: ['id', 'active'],
    probe: 'id',
  },
  home_banners: {
    label: 'Bannerat',
    select: 'id, title, is_active, created_at',
    filterColumns: ['id', 'is_active'],
    probe: 'id, is_active',
  },
  roles: {
    label: 'Rolet',
    select: 'id, name',
    filterColumns: ['id', 'name'],
    probe: 'id, name',
  },
  listing_categories: {
    label: 'Kategoritë',
    select: 'id, key, title, slug',
    filterColumns: ['id', 'key', 'slug'],
    probe: 'id, key',
  },
  real_estate_cities: {
    label: 'Qytetet',
    select: 'id, name, slug',
    filterColumns: ['id', 'slug'],
    probe: 'id, name',
  },
  conversations: {
    label: 'Bisedat',
    select: 'id, listing_kind, listing_id, poster_id, inquirer_id, last_message_sender_id, started_by, created_at',
    filterColumns: ['id', 'poster_id', 'inquirer_id', 'listing_id'],
    probe: 'id, last_message_sender_id, started_by',
  },
  messages: {
    label: 'Mesazhet',
    select: 'id, conversation_id, sender_id, created_at',
    filterColumns: ['id', 'conversation_id', 'sender_id'],
    probe: 'id, image_url',
  },
  saved_listings: {
    label: 'Të ruajturat',
    select: 'id, saver_id, listing_kind, listing_id, created_at',
    filterColumns: ['id', 'saver_id', 'listing_kind', 'listing_id'],
    probe: 'saver_id, listing_id',
  },
  admin_notifications: {
    label: 'Njoftime admin',
    select: 'id, type, title, read_at, created_at',
    filterColumns: ['id', 'type'],
    probe: 'id',
  },
  professional_verification_requests: {
    label: 'Verifikime profesionistësh',
    select: 'id, applicant_id, status, created_at',
    filterColumns: ['id', 'applicant_id', 'status'],
    probe: 'id, status',
  },
  job_employer_verification_requests: {
    label: 'Verifikime punëdhënësish',
    select: 'id, applicant_id, status, created_at',
    filterColumns: ['id', 'applicant_id', 'status'],
    probe: 'id, status',
  },
  member_reviews: {
    label: 'Vlerësime anëtarësh',
    select: 'id, member_id, reviewer_id, rating, created_at',
    filterColumns: ['id', 'member_id', 'reviewer_id'],
    probe: 'id, rating',
  },
  business_listing_reviews: {
    label: 'Vlerësime biznesesh',
    select: 'id, listing_id, reviewer_id, rating, created_at',
    filterColumns: ['id', 'listing_id', 'reviewer_id'],
    probe: 'id, rating',
  },
  professional_listing_reviews: {
    label: 'Vlerësime profesionistësh',
    select: 'id, listing_id, reviewer_id, rating, created_at',
    filterColumns: ['id', 'listing_id', 'reviewer_id'],
    probe: 'id, rating',
  },
  business_reservations: {
    label: 'Rezervime',
    select: 'id, listing_id, user_id, status, created_at',
    filterColumns: ['id', 'listing_id', 'user_id', 'status'],
    probe: 'id, status',
  },
  listing_engagements: {
    label: 'Angazhime njoftimesh',
    select: 'listing_kind, listing_id, view_count, share_count',
    filterColumns: ['listing_kind', 'listing_id'],
    probe: 'listing_id',
  },
  conversation_user_state: {
    label: 'Gjendja e bisedës',
    select: 'conversation_id, user_id, pinned, hidden_at',
    filterColumns: ['conversation_id', 'user_id'],
    probe: 'conversation_id, user_id',
  },
  ai_import_daily_usage: {
    label: 'Përdorimi ditor AI Build',
    select: 'user_id, used_on, use_count',
    filterColumns: ['user_id', 'used_on'],
    probe: 'user_id, used_on',
  },
  ai_usage_events: {
    label: 'Përdorimi AI (Boost Coins)',
    select: 'user_id, kind, cost_bc, units, status, created_at',
    filterColumns: ['user_id', 'kind', 'status'],
    probe: 'user_id',
  },
};

const CORE_TABLES = new Set([
  'profiles',
  'referral_programs',
  'referral_signups',
  'user_subscriptions',
  'payments',
  'admin_ai_actions',
  'real_estate_listings',
  'car_listings',
  'job_listings',
  'marketplace_listings',
  'directory_listings',
  'contracts',
  'conversations',
  'messages',
  'roles',
  'credit_packages',
  'ai_usage_events',
]);

/** Allowlisted ADD COLUMN IF NOT EXISTS — never user-supplied. */
const SAFE_COLUMN_ADDS = [
  ['profiles', 'login_streak_days', 'integer not null default 0'],
  ['profiles', 'login_streak_last_day', 'date'],
  ['profiles', 'daily_share_claimed_on', 'date'],
  ['profiles', 'avatar_url', 'text'],
  ['profiles', 'auto_refresh_slots', 'integer not null default 0'],
  ['profiles', 'referral_code', 'text'],
  ['profiles', 'referred_by_id', 'uuid'],
  ['profiles', 'referral_tiers_claimed', "integer[] not null default '{}'"],
  ['profiles', 'boost_credits', 'integer not null default 0'],
  ['profiles', 'based_city_id', 'uuid'],
  ['profiles', 'based_city_name', 'text'],
  ['profiles', 'share_theme_color', 'text'],
  ['real_estate_listings', 'premium_until', 'timestamptz'],
  ['real_estate_listings', 'okazion_until', 'timestamptz'],
  ['real_estate_listings', 'bumped_at', 'timestamptz'],
  ['real_estate_listings', 'original_price', 'numeric'],
  ['car_listings', 'premium_until', 'timestamptz'],
  ['car_listings', 'okazion_until', 'timestamptz'],
  ['car_listings', 'bumped_at', 'timestamptz'],
  ['car_listings', 'original_price', 'numeric'],
  ['car_listings', 'vehicle_type', 'text'],
  ['job_listings', 'premium_until', 'timestamptz'],
  ['job_listings', 'okazion_until', 'timestamptz'],
  ['job_listings', 'bumped_at', 'timestamptz'],
  ['marketplace_listings', 'premium_until', 'timestamptz'],
  ['marketplace_listings', 'okazion_until', 'timestamptz'],
  ['marketplace_listings', 'bumped_at', 'timestamptz'],
  ['marketplace_listings', 'original_price', 'numeric'],
  ['directory_listings', 'premium_until', 'timestamptz'],
  ['directory_listings', 'bumped_at', 'timestamptz'],
  ['directory_listings', 'announcement_title', 'text'],
  ['directory_listings', 'announcement_subtitle', 'text'],
  ['directory_listings', 'announcement_banner_url', 'text'],
  ['directory_listings', 'announcement_at', 'timestamptz'],
  ['contracts', 'max_okazion_listings', 'integer'],
  ['user_subscriptions', 'max_okazion_listings', 'integer'],
  ['user_subscriptions', 'used_job_listings', 'integer not null default 0'],
  ['user_subscriptions', 'used_car_listings', 'integer not null default 0'],
  ['user_subscriptions', 'used_apartment_listings', 'integer not null default 0'],
  ['user_subscriptions', 'used_product_listings', 'integer not null default 0'],
  ['user_subscriptions', 'used_premium_listings', 'integer not null default 0'],
  ['user_subscriptions', 'used_okazion_listings', 'integer not null default 0'],
  ['messages', 'image_url', "text not null default ''"],
  ['conversations', 'last_message_sender_id', 'uuid'],
  ['conversations', 'started_by', "text not null default 'inquirer'"],
  ['user_notification_preferences', 'listing_shared', 'boolean not null default true'],
  ['user_notification_preferences', 'listing_hot_lead', 'boolean not null default true'],
];

function allowedTableNames() {
  return Object.keys(TABLE_CATALOG);
}

function resolveTable(raw) {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const mapped = TABLE_ALIASES[key] || TABLE_ALIASES[String(raw || '').trim().toLowerCase()] || key;
  if (!IDENT_RE.test(mapped) || !TABLE_CATALOG[mapped]) return null;
  return mapped;
}

function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

function needsConfirm(args, summary, safeArgs) {
  if (args && args.confirm === true) return null;
  return {
    ok: false,
    needsConfirmation: true,
    summary,
    args: safeArgs,
  };
}

function assertIdent(value, label) {
  const v = String(value || '');
  if (!IDENT_RE.test(v)) {
    throw new Error(`${label || 'Emër'} i pavlefshëm.`);
  }
  return v;
}

function assertTypeSql(value) {
  const t = String(value || '').trim();
  if (
    !t ||
    t.length > 180 ||
    /;|--|\/\*|\b(drop|truncate|delete|update|insert|grant|revoke|execute)\b/i.test(t)
  ) {
    throw new Error('Tip kolone i pavlefshëm.');
  }
  return t;
}

function columnAddSql(table, column, typeSql) {
  return `alter table public.${assertIdent(table, 'Tabela')} add column if not exists ${assertIdent(column, 'Kolona')} ${assertTypeSql(typeSql)}`;
}

function columnAddsForTable(table) {
  if (!table) return SAFE_COLUMN_ADDS;
  return SAFE_COLUMN_ADDS.filter(([t]) => t === table);
}

async function probeTable(table) {
  const meta = TABLE_CATALOG[table];
  const { error } = await getSupabaseAdmin()
    .from(table)
    .select(meta.probe || meta.select)
    .limit(1);
  if (!error) return { table, label: meta.label, ok: true };
  return { table, label: meta.label, ok: false, error: String(error.message || error).split('\n')[0] };
}

async function diagnoseSchema() {
  const checks = await Promise.all(allowedTableNames().map((table) => probeTable(table)));
  const missing = checks.filter((c) => !c.ok);
  const coreMissing = missing.filter((c) => CORE_TABLES.has(c.table));
  const optionalMissing = missing.filter((c) => !CORE_TABLES.has(c.table));
  return {
    ok: true,
    healthy: coreMissing.length === 0,
    checks,
    missingTablesOrColumns: coreMissing.map((c) => c.table),
    optionalMissing: optionalMissing.map((c) => c.table),
    missingDetail: missing.map((c) => ({ table: c.table, error: c.error, core: CORE_TABLES.has(c.table) })),
    advice:
      coreMissing.length === 0
        ? optionalMissing.length === 0
          ? 'Skema duket e plotë për tabelat e kontrolluara. Për rreshta përdorni inspect_table / count_rows. AI nuk ekzekuton SQL të lirë.'
          : `Skema kryesore OK. Tabela opsionale që mungojnë: ${optionalMissing.join(', ')}.`
        : 'Disa tabela/kolona kryesore mungojnë. Përdorni repair_missing_schema (konfirmim). MOS ekzekutoni init.sql, DROP, ose TRUNCATE.',
  };
}

async function listDbTables() {
  const diagnosis = await diagnoseSchema();
  return {
    ok: true,
    tables: diagnosis.checks.map((c) => ({
      table: c.table,
      label: c.label,
      ok: c.ok,
      error: c.error || null,
    })),
    healthy: diagnosis.healthy,
  };
}

function applyEqFilter(q, meta, args) {
  const rawCol = String(args?.eqColumn || args?.column || '').trim();
  const rawVal = args?.eqValue ?? args?.value ?? args?.id ?? args?.email;
  if (rawVal == null || rawVal === '') {
    if (rawCol) return { error: 'Jepni eqValue për filtrin.' };
    return { q };
  }
  let col = rawCol;
  if (!col) {
    if (isUuid(rawVal) && meta.filterColumns.includes('id')) col = 'id';
    else if (String(rawVal).includes('@') && meta.filterColumns.includes('email')) col = 'email';
    else if (meta.filterColumns.includes('id') && isUuid(rawVal)) col = 'id';
    else return { error: `Specifikoni eqColumn (${meta.filterColumns.join(', ')}).` };
  }
  if (!IDENT_RE.test(col) || !meta.filterColumns.includes(col)) {
    return { error: `Filtri i lejuar për këtë tabelë: ${meta.filterColumns.join(', ')}.` };
  }
  const value = typeof rawVal === 'string' ? rawVal.trim().slice(0, MAX_EQ_VALUE) : rawVal;
  return { q: q.eq(col, value), filter: { column: col, value } };
}

async function inspectTable(args) {
  const table = resolveTable(args?.table);
  if (!table) {
    return {
      ok: false,
      message: 'Tabela nuk njihet. Përdorni list_db_tables.',
      allowed: allowedTableNames(),
    };
  }
  const meta = TABLE_CATALOG[table];
  const limit = Math.min(MAX_INSPECT, Math.max(1, Number(args?.limit) || 8));
  let q = getSupabaseAdmin().from(table).select(meta.select).limit(limit);
  const filtered = applyEqFilter(q, meta, args);
  if (filtered.error) return { ok: false, message: filtered.error };
  q = filtered.q;
  if (/\bcreated_at\b/.test(meta.select)) {
    q = q.order('created_at', { ascending: false });
  }
  const { data, error } = await q;
  if (error) return { ok: false, message: String(error.message || error).split('\n')[0], table };
  return {
    ok: true,
    table,
    label: meta.label,
    columns: meta.select,
    filter: filtered.filter || null,
    rows: data || [],
    count: (data || []).length,
    truncated: (data || []).length >= limit,
  };
}

async function countRows(args) {
  const table = resolveTable(args?.table);
  if (!table) {
    return {
      ok: false,
      message: 'Tabela nuk njihet. Përdorni list_db_tables.',
      allowed: allowedTableNames(),
    };
  }
  const meta = TABLE_CATALOG[table];
  let q = getSupabaseAdmin().from(table).select('*', { count: 'exact', head: true });
  const filtered = applyEqFilter(q, meta, args);
  if (filtered.error) return { ok: false, message: filtered.error };
  const { count, error } = await filtered.q;
  if (error) return { ok: false, message: String(error.message || error).split('\n')[0], table };
  return {
    ok: true,
    table,
    label: meta.label,
    filter: filtered.filter || null,
    count: count ?? 0,
  };
}

function dbUrl() {
  return String(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || '').trim();
}

async function applyColumnAddsViaPg(table) {
  const url = dbUrl();
  if (!url) return { used: false, applied: [] };
  let Client;
  try {
    ({ Client } = require('pg'));
  } catch {
    return { used: false, applied: [], warning: 'Paketa pg mungon në backend.' };
  }
  const adds = columnAddsForTable(table);
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const applied = [];
  const errors = [];
  try {
    for (const [tbl, col, typeSql] of adds) {
      const sql = columnAddSql(tbl, col, typeSql);
      try {
        await client.query(sql);
        applied.push(`${tbl}.${col}`);
      } catch (err) {
        errors.push({ column: `${tbl}.${col}`, error: String(err?.message || err).split('\n')[0] });
      }
    }
  } finally {
    await client.end();
  }
  return { used: true, applied, errors };
}

async function applyRepairViaRpc() {
  const { data, error } = await getSupabaseAdmin().rpc('admin_repair_missing_schema');
  if (error) {
    const msg = String(error.message || error);
    if (/could not find the function|schema cache|does not exist|404/i.test(msg)) {
      return { used: false, missingFn: true, error: msg };
    }
    return { used: true, ok: false, error: msg };
  }
  return { used: true, ok: true, result: data };
}

async function repairMissingSchema(args) {
  const table = args?.table ? resolveTable(args.table) : null;
  if (args?.table && !table) {
    return { ok: false, message: 'Tabela nuk njihet.', allowed: allowedTableNames() };
  }

  const before = await diagnoseSchema();
  const allMissing = [...before.missingTablesOrColumns, ...(before.optionalMissing || [])];
  const relevantMissing = table ? allMissing.filter((t) => t === table) : before.missingTablesOrColumns;

  if (table && relevantMissing.length === 0) {
    return {
      ok: true,
      skipped: true,
      message: `Tabela ${table} duket e plotë për kolonat e kontrolluara.`,
      healthy: true,
    };
  }

  if (!table && before.healthy && relevantMissing.length === 0) {
    return {
      ok: true,
      skipped: true,
      message:
        (before.optionalMissing || []).length > 0
          ? `Skema kryesore është e plotë. Tabela opsionale që mungojnë: ${before.optionalMissing.join(', ')}.`
          : 'Skema është e plotë për kontrollet e AI. Asgjë për të ndrequr.',
      healthy: true,
      optionalMissing: before.optionalMissing || [],
    };
  }

  const scope = table ? `tabelën ${table}` : 'tabelat kryesore';
  const preview = needsConfirm(
    args,
    `Ndreq skemën për ${scope} (vetëm ADD COLUMN / CREATE TABLE IF NOT EXISTS). Nuk ekzekutohet SQL i lirë, DROP, TRUNCATE, ose DELETE. Mungojnë: ${relevantMissing.join(', ') || allMissing.join(', ') || 'kolona të mundshme'}.`,
    { table: table || null },
  );
  if (preview) return preview;

  const rpc = await applyRepairViaRpc();
  let pg = { used: false, applied: [] };
  if (!rpc.used || rpc.ok === false) {
    try {
      pg = await applyColumnAddsViaPg(table);
    } catch (err) {
      pg = { used: false, applied: [], errors: [{ error: String(err?.message || err) }] };
    }
  }

  if (rpc.missingFn && !pg.used) {
    return {
      ok: false,
      message:
        'Nuk u ndreq. Aplikoni migrimin 20260812150000_admin_repair_missing_schema.sql në SQL Editor (jo init.sql), ose vendosni DATABASE_URL dhe paketën pg.',
      missing: relevantMissing,
      rpcError: rpc.error || null,
    };
  }

  const after = await diagnoseSchema();
  const stillMissing = table
    ? [...after.missingTablesOrColumns, ...(after.optionalMissing || [])].filter((t) => t === table)
    : after.missingTablesOrColumns;

  return {
    ok: stillMissing.length === 0,
    message:
      stillMissing.length === 0
        ? 'Ndreqja u krye. Skema e kontrolluar është e plotë.'
        : `Ndreqja u provua, por mbeten: ${stillMissing.join(', ')}.`,
    viaRpc: Boolean(rpc.used && rpc.ok),
    viaPg: Boolean(pg.used),
    columnsTouched: pg.applied || [],
    remaining: stillMissing,
    healthy: after.healthy,
  };
}

async function ensureReferralProgramTool(args) {
  const preview = needsConfirm(
    args,
    'Krijo ose përditëso rreshtin default të programit të referimit (jo SQL i lirë).',
    {},
  );
  if (preview) return preview;

  try {
    const { ensureReferralProgram } = require('./ensure-referral-program');
    await ensureReferralProgram();
  } catch (err) {
    const msg = String(err?.message || err);
    if (/referral_programs|schema cache|does not exist/i.test(msg)) {
      return {
        ok: false,
        message: 'Tabela referral_programs mungon. Përdorni repair_missing_schema, pastaj riprovoni.',
        error: msg.split('\n')[0],
      };
    }
    throw err;
  }

  const { data, error } = await getSupabaseAdmin()
    .from('referral_programs')
    .select('id, page_title, login_streak, updated_at')
    .eq('id', 'default')
    .maybeSingle();
  if (error) throw error;
  return {
    ok: true,
    message: data ? 'Programi i referimit është gati.' : 'Insert-i u krye, por rreshti default nuk u lexua.',
    program: data || null,
  };
}

module.exports = {
  TABLE_CATALOG,
  allowedTableNames,
  diagnoseSchema,
  listDbTables,
  inspectTable,
  countRows,
  repairMissingSchema,
  ensureReferralProgramTool,
};
