'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { getProfileById, getProfileByEmail, mapProfile } = require('./profiles');
const { LISTING_KINDS, listAdminListings, reviewListing, countListingsByStatus } = require('./listing-moderation');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLAN_CODES = new Set(['free', 'starter', 'grow', 'elite']);
const MAX_BC_DELTA = 100_000;
const MAX_PASSWORD_LEN = 72;

function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

function sanitizeIlike(value) {
  return String(value || '')
    .replace(/[%_,()"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function publicUser(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    email: profile.email,
    accountType: profile.accountType,
    role: profile.role,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone || '',
    businessName: profile.businessName || null,
    nipt: profile.nipt || null,
    isActive: profile.isActive !== false,
    boostCredits: Number(profile.boostCredits) || 0,
    autoRefreshSlots: Number(profile.autoRefreshSlots) || 0,
    jobsEmployerVerifiedAt: profile.jobsEmployerVerifiedAt || null,
    professionalsVerifiedAt: profile.professionalsVerifiedAt || null,
    createdAt: profile.createdAt || null,
    lastLogin: profile.lastLogin || null,
  };
}

function assertMutable(profile, admin) {
  if (!profile) return { ok: false, message: 'Përdoruesi nuk u gjet.' };
  if (profile.accountType === 'admin') {
    return { ok: false, message: 'Nuk mund të ndryshoni llogari administratori nga AI.' };
  }
  if (admin?.id && String(profile.id) === String(admin.id)) {
    return { ok: false, message: 'Nuk mund ta ndryshoni llogarinë tuaj nga ky asistent.' };
  }
  return { ok: true };
}

async function resolveUser({ email, userId }) {
  if (userId && isUuid(userId)) return getProfileById(userId);
  if (email) return getProfileByEmail(String(email).toLowerCase().trim());
  return null;
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

function redactArgs(name, args) {
  const out = { ...(args && typeof args === 'object' ? args : {}) };
  if (typeof out.password === 'string') out.password = '***';
  if (name === 'set_user_password') out.password = '***';
  delete out.confirm;
  return out;
}

async function logAction({ admin, tool, args, result }) {
  try {
    const ok = result?.ok !== false && !result?.needsConfirmation;
    const { error } = await getSupabaseAdmin().from('admin_ai_actions').insert({
      admin_id: admin?.id || null,
      admin_email: admin?.email || '',
      tool,
      args: redactArgs(tool, args),
      result: result && typeof result === 'object' ? result : { value: result },
      ok,
    });
    if (error && /admin_ai_actions/i.test(String(error.message || ''))) {
      console.warn('[admin-ai] audit table missing — apply 20260811120000_admin_ai_actions.sql');
    } else if (error) {
      console.warn('[admin-ai] audit insert:', error.message);
    }
  } catch (err) {
    console.warn('[admin-ai] audit:', err?.message || err);
  }
}

async function lookupUser(args) {
  const sb = getSupabaseAdmin();
  const userId = String(args?.userId || '').trim();
  const email = String(args?.email || '').toLowerCase().trim();
  const query = sanitizeIlike(args?.query || args?.q || '');

  if (userId && isUuid(userId)) {
    const profile = await getProfileById(userId);
    return { ok: true, users: profile ? [publicUser(profile)] : [], total: profile ? 1 : 0 };
  }

  if (email && email.includes('@')) {
    const profile = await getProfileByEmail(email);
    return { ok: true, users: profile ? [publicUser(profile)] : [], total: profile ? 1 : 0 };
  }

  if (!query) {
    return { ok: false, message: 'Jepni email, ID, emër ose NIPT.' };
  }

  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .or(
      [
        `email.ilike.%${query}%`,
        `first_name.ilike.%${query}%`,
        `last_name.ilike.%${query}%`,
        `business_name.ilike.%${query}%`,
        `nipt.ilike.%${query}%`,
      ].join(','),
    )
    .in('account_type', ['individual', 'business', 'managed', 'admin'])
    .limit(10);
  if (error) throw error;

  const users = (data || []).map((row) => publicUser(mapProfile(row)));
  return { ok: true, users, total: users.length };
}

async function countListingsForUser(userId) {
  const sb = getSupabaseAdmin();
  const out = {};
  await Promise.all(
    Object.entries(LISTING_KINDS).map(async ([kind, cfg]) => {
      let q = sb.from(cfg.table).select('*', { count: 'exact', head: true }).eq('poster_id', userId);
      if (cfg.extraFilter) {
        for (const [col, val] of Object.entries(cfg.extraFilter)) q = q.eq(col, val);
      }
      const { count, error } = await q;
      if (error) throw error;
      out[kind] = count ?? 0;
    }),
  );
  out.total = Object.values(out).reduce((sum, n) => sum + Number(n || 0), 0);
  return out;
}

async function getUserOverview(args) {
  const profile = await resolveUser(args);
  if (!profile) return { ok: false, message: 'Përdoruesi nuk u gjet.' };

  const sb = getSupabaseAdmin();
  const [listings, subRes, payRes] = await Promise.all([
    countListingsForUser(profile.id),
    sb
      .from('user_subscriptions')
      .select(
        'id, plan_code, contract_title, status, months, starts_at, expires_at, boost_credits_granted, max_car_listings, max_job_listings, max_apartment_listings, max_product_listings, max_premium_listings, max_okazion_listings',
      )
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(3),
    sb
      .from('payments')
      .select('id, type, amount, currency, status, granted, description, created_at')
      .eq('payer_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  if (subRes.error) throw subRes.error;
  if (payRes.error) throw payRes.error;

  const activeSub = (subRes.data || []).find((row) => row.status === 'active') || null;

  return {
    ok: true,
    user: publicUser(profile),
    listings,
    activeSubscription: activeSub,
    recentSubscriptions: subRes.data || [],
    recentPayments: payRes.data || [],
  };
}

async function adjustBoostCredits(args, admin) {
  const profile = await resolveUser(args);
  const gate = assertMutable(profile, admin);
  if (!gate.ok) return gate;

  const hasSetTo = args?.setTo != null && args.setTo !== '';
  const hasDelta = args?.delta != null && args.delta !== '';
  if (!hasSetTo && !hasDelta) {
    return { ok: false, message: 'Jepni delta (p.sh. 100 ose -50) ose setTo.' };
  }

  const current = Number(profile.boostCredits) || 0;
  let next;
  let delta;
  if (hasSetTo) {
    next = Math.floor(Number(args.setTo));
    if (!Number.isFinite(next) || next < 0) {
      return { ok: false, message: 'setTo duhet të jetë një numër ≥ 0.' };
    }
    delta = next - current;
  } else {
    delta = Math.floor(Number(args.delta));
    if (!Number.isFinite(delta) || delta === 0) {
      return { ok: false, message: 'delta duhet të jetë një numër i ndryshëm nga 0.' };
    }
    next = current + delta;
  }

  if (Math.abs(delta) > MAX_BC_DELTA) {
    return { ok: false, message: `Ndryshimi maksimal për një veprim është ${MAX_BC_DELTA} BC.` };
  }
  if (next < 0) next = 0;

  const reason = String(args?.reason || '').trim().slice(0, 200);
  const preview = needsConfirm(args, `Ndrysho BC për ${profile.email}: ${current} → ${next} (${delta >= 0 ? '+' : ''}${delta})${reason ? `. Arsye: ${reason}` : ''}`, {
    email: profile.email,
    userId: profile.id,
    delta,
    setTo: next,
    reason,
  });
  if (preview) return preview;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('profiles')
    .update({ boost_credits: next, updated_at: new Date().toISOString() })
    .eq('id', profile.id)
    .select('boost_credits')
    .single();
  if (error) throw error;

  return {
    ok: true,
    email: profile.email,
    before: current,
    after: Number(data.boost_credits) || 0,
    delta: (Number(data.boost_credits) || 0) - current,
    reason: reason || null,
  };
}

async function setAutoRefreshSlots(args, admin) {
  const profile = await resolveUser(args);
  const gate = assertMutable(profile, admin);
  if (!gate.ok) return gate;

  const hasSetTo = args?.setTo != null && args.setTo !== '';
  const hasDelta = args?.delta != null && args.delta !== '';
  if (!hasSetTo && !hasDelta) {
    return { ok: false, message: 'Jepni delta ose setTo për slotet Auto-Refresh.' };
  }

  const current = Number(profile.autoRefreshSlots) || 0;
  let next;
  if (hasSetTo) {
    next = Math.floor(Number(args.setTo));
  } else {
    next = current + Math.floor(Number(args.delta));
  }
  if (!Number.isFinite(next) || next < 0) {
    return { ok: false, message: 'Numri i slotëve duhet të jetë ≥ 0.' };
  }
  if (next > 10_000) return { ok: false, message: 'Shumë slote (maks 10000).' };

  const preview = needsConfirm(
    args,
    `Ndrysho Auto-Refresh për ${profile.email}: ${current} → ${next} slote.`,
    { email: profile.email, userId: profile.id, setTo: next },
  );
  if (preview) return preview;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('profiles')
    .update({ auto_refresh_slots: next, updated_at: new Date().toISOString() })
    .eq('id', profile.id)
    .select('auto_refresh_slots')
    .single();
  if (error) throw error;

  return {
    ok: true,
    email: profile.email,
    before: current,
    after: Number(data.auto_refresh_slots) || 0,
  };
}

async function setUserPassword(args, admin) {
  const profile = await resolveUser(args);
  const gate = assertMutable(profile, admin);
  if (!gate.ok) return gate;

  const password = String(args?.password || '');
  if (password.length < 6) {
    return { ok: false, message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' };
  }
  if (password.length > MAX_PASSWORD_LEN) {
    return { ok: false, message: 'Fjalëkalimi është shumë i gjatë.' };
  }

  const preview = needsConfirm(args, `Ndrysho fjalëkalimin e ${profile.email}.`, {
    email: profile.email,
    userId: profile.id,
    password,
  });
  if (preview) return preview;

  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(profile.id, { password });
  if (error) throw error;
  return { ok: true, email: profile.email, message: 'Fjalëkalimi u përditësua.' };
}

async function setUserActive(args, admin) {
  const profile = await resolveUser(args);
  const gate = assertMutable(profile, admin);
  if (!gate.ok) return gate;

  const isActive = Boolean(args?.isActive);
  const verb = isActive ? 'aktivizo' : 'çaktivizo';
  const preview = needsConfirm(args, `${verb} llogarinë ${profile.email}.`, {
    email: profile.email,
    userId: profile.id,
    isActive,
  });
  if (preview) return preview;

  profile.isActive = isActive;
  await profile.save();
  return { ok: true, email: profile.email, isActive: profile.isActive };
}

async function deleteUser(args, admin) {
  const profile = await resolveUser(args);
  const gate = assertMutable(profile, admin);
  if (!gate.ok) return gate;

  const confirmEmail = String(args?.confirmEmail || '').toLowerCase().trim();
  if (confirmEmail && confirmEmail !== String(profile.email).toLowerCase()) {
    return { ok: false, message: 'confirmEmail nuk përputhet me emailin e përdoruesit.' };
  }

  const preview = needsConfirm(
    args,
    `FSHI përgjithmonë ${profile.email} (${profile.accountType}). Kjo fshin Auth + profilin (njoftimet varen nga cascade).`,
    { email: profile.email, userId: profile.id, confirmEmail: profile.email },
  );
  if (preview) return preview;

  if (confirmEmail !== String(profile.email).toLowerCase()) {
    return { ok: false, message: 'Për fshirje duhet confirmEmail i saktë.' };
  }

  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(profile.id);
  if (error) throw error;
  return { ok: true, email: profile.email, message: 'Përdoruesi u fshi.' };
}

async function listPendingListings(args) {
  const kind = String(args?.kind || '').trim() || undefined;
  const limit = Math.min(20, Math.max(1, Number(args?.limit) || 12));
  const result = await listAdminListings({ status: 'pending', kind, page: 1, limit });
  return {
    ok: true,
    total: result.total,
    listings: (result.listings || []).map((row) => ({
      id: row.id,
      kind: row.kind,
      kindLabel: row.kindLabel,
      title: row.title,
      cityName: row.cityName,
      createdAt: row.createdAt,
    })),
  };
}

async function reviewListingTool(args, admin) {
  const kind = String(args?.kind || '').trim();
  const listingId = String(args?.listingId || args?.id || '').trim();
  const decision = String(args?.decision || '').trim();
  if (!LISTING_KINDS[kind]) {
    return { ok: false, message: 'kind duhet të jetë real-estate, cars, jobs, marketplace, businesses ose professionals.' };
  }
  if (!isUuid(listingId)) return { ok: false, message: 'listingId e pavlefshme.' };
  if (decision !== 'approve' && decision !== 'reject') {
    return { ok: false, message: 'decision duhet të jetë approve ose reject.' };
  }

  const preview = needsConfirm(
    args,
    `${decision === 'approve' ? 'Aprovo' : 'Refuzo'} njoftimin ${kind} ${listingId}.`,
    { kind, listingId, decision, adminNote: String(args?.adminNote || '').slice(0, 500) },
  );
  if (preview) return preview;

  const result = await reviewListing(kind, listingId, admin, decision, args?.adminNote);
  if (!result.ok) return { ok: false, message: result.message, status: result.status };
  return {
    ok: true,
    listing: {
      id: result.listing.id,
      kind: result.listing.kind,
      title: result.listing.title,
      status: result.listing.status,
    },
  };
}

async function getPlatformStats() {
  const sb = getSupabaseAdmin();
  const [listings, usersResult] = await Promise.all([
    countListingsByStatus(),
    sb.from('profiles').select('account_type').in('account_type', ['managed', 'individual', 'business', 'admin']),
  ]);
  if (usersResult.error) throw usersResult.error;
  const rows = usersResult.data || [];
  const users = {
    admin: rows.filter((r) => r.account_type === 'admin').length,
    managed: rows.filter((r) => r.account_type === 'managed').length,
    individual: rows.filter((r) => r.account_type === 'individual').length,
    business: rows.filter((r) => r.account_type === 'business').length,
  };
  users.total = users.managed + users.individual + users.business;
  const totals = { total: 0, pending: 0, approved: 0, rejected: 0 };
  for (const row of Object.values(listings)) {
    totals.total += row.total;
    totals.pending += row.pending;
    totals.approved += row.approved;
    totals.rejected += row.rejected;
  }
  return { ok: true, listings: { byKind: listings, totals }, users };
}

async function listUserPayments(args) {
  const profile = await resolveUser(args);
  if (!profile) return { ok: false, message: 'Përdoruesi nuk u gjet.' };
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('payments')
    .select('id, type, amount, currency, status, granted, description, created_at, paid_at')
    .eq('payer_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(15);
  if (error) throw error;
  return { ok: true, email: profile.email, payments: data || [] };
}

async function grantSubscription(args, admin) {
  const profile = await resolveUser(args);
  const gate = assertMutable(profile, admin);
  if (!gate.ok) return gate;

  const planCode = String(args?.planCode || args?.plan || '').toLowerCase().trim();
  if (!PLAN_CODES.has(planCode)) {
    return { ok: false, message: 'planCode duhet të jetë free, starter, grow ose elite.' };
  }
  const months = Math.min(24, Math.max(1, Math.floor(Number(args?.months) || 1)));
  const grantBoost = args?.grantBoostCredits !== false;
  const kind = profile.accountType === 'business' ? 'company' : 'agent';

  const preview = needsConfirm(
    args,
    `Jep paketën ${planCode.toUpperCase()} (${months} muaj) te ${profile.email}${grantBoost ? ' + BC nga paketa' : ' pa BC'}.`,
    {
      email: profile.email,
      userId: profile.id,
      planCode,
      months,
      grantBoostCredits: grantBoost,
    },
  );
  if (preview) return preview;

  const sb = getSupabaseAdmin();
  const { data: contract, error: cErr } = await sb
    .from('contracts')
    .select('*')
    .eq('plan_code', planCode)
    .eq('subscriber_kind', kind)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!contract) return { ok: false, message: `Paketa ${planCode} (${kind}) nuk u gjet.` };

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + months);
  const boost = grantBoost && Number.isFinite(Number(contract.boost_credits)) ? Number(contract.boost_credits) : 0;

  await sb
    .from('user_subscriptions')
    .update({ status: 'canceled', updated_at: now.toISOString() })
    .eq('user_id', profile.id)
    .eq('status', 'active');

  const row = {
    user_id: profile.id,
    contract_id: contract.id,
    contract_title: contract.title || planCode.toUpperCase(),
    listing_category_key: contract.listing_category_key ?? null,
    subscriber_kind: contract.subscriber_kind ?? kind,
    months,
    price_eur: Number(contract.price_1_month) || 0,
    refresh_every_hours: contract.refresh_every_hours ?? null,
    glow_badge_enabled: Boolean(contract.glow_badge_enabled),
    boost_credits_granted: boost,
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
  };

  let { data: sub, error: subErr } = await sb.from('user_subscriptions').insert(row).select('id, plan_code, expires_at').single();
  if (subErr && /max_okazion_listings/i.test(String(subErr.message || ''))) {
    const { max_okazion_listings: _omit, ...rest } = row;
    ({ data: sub, error: subErr } = await sb.from('user_subscriptions').insert(rest).select('id, plan_code, expires_at').single());
  }
  if (subErr) throw subErr;

  let boostAfter = Number(profile.boostCredits) || 0;
  if (boost > 0) {
    const { addBoostCredits } = require('./apply-payment');
    await addBoostCredits(profile.id, boost);
    boostAfter += boost;
  }

  return {
    ok: true,
    email: profile.email,
    subscriptionId: sub.id,
    planCode: sub.plan_code,
    expiresAt: sub.expires_at,
    boostCreditsGranted: boost,
    boostCreditsAfter: boostAfter,
  };
}

async function cancelSubscription(args, admin) {
  const profile = await resolveUser(args);
  const gate = assertMutable(profile, admin);
  if (!gate.ok) return gate;

  const preview = needsConfirm(args, `Anulo abonimin aktiv të ${profile.email}.`, {
    email: profile.email,
    userId: profile.id,
  });
  if (preview) return preview;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('user_subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .select('id, plan_code');
  if (error) throw error;
  return { ok: true, email: profile.email, canceled: data || [] };
}

const SCHEMA_PROBES = [
  { table: 'profiles', select: 'id, boost_credits, auto_refresh_slots, avatar_url' },
  { table: 'user_subscriptions', select: 'id, plan_code, status, max_okazion_listings' },
  { table: 'payments', select: 'id, status, granted' },
  { table: 'premium_listing_vouchers', select: 'id, status' },
  { table: 'okazion_listing_vouchers', select: 'id, status' },
  { table: 'addon_packages', select: 'id, kind, active' },
  { table: 'listing_auto_refresh', select: 'listing_id' },
  { table: 'admin_ai_actions', select: 'id, tool' },
  { table: 'real_estate_listings', select: 'id, premium_until, bumped_at' },
  { table: 'user_notifications', select: 'id' },
];

async function diagnoseSchema() {
  const sb = getSupabaseAdmin();
  const checks = [];
  for (const probe of SCHEMA_PROBES) {
    const { error } = await sb.from(probe.table).select(probe.select).limit(1);
    if (!error) {
      checks.push({ table: probe.table, ok: true });
    } else {
      checks.push({ table: probe.table, ok: false, error: error.message });
    }
  }
  const missing = checks.filter((c) => !c.ok);
  return {
    ok: true,
    healthy: missing.length === 0,
    checks,
    missingTablesOrColumns: missing.map((c) => c.table),
    advice:
      missing.length === 0
        ? 'Skema duket e plotë për kolonat e kontrolluara. AI nuk ekzekuton SQL ndreqës.'
        : 'Disa tabela/kolona mungojnë. Aplikoni migrimin përkatës ose backend/scripts/repair-missing-schema.sql në SQL Editor (vetëm ALTER/CREATE IF NOT EXISTS). MOS ekzekutoni init.sql.',
  };
}

async function listRecentAiActions(args, admin) {
  const limit = Math.min(30, Math.max(1, Number(args?.limit) || 12));
  const { data, error } = await getSupabaseAdmin()
    .from('admin_ai_actions')
    .select('id, admin_email, tool, args, ok, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    if (/admin_ai_actions/i.test(String(error.message || ''))) {
      return { ok: false, message: 'Tabela e auditit mungon. Aplikoni migrimin 20260811120000_admin_ai_actions.sql.' };
    }
    throw error;
  }
  return { ok: true, actions: data || [], requestedBy: admin?.email || null };
}

const MUTATING_TOOLS = new Set([
  'adjust_boost_credits',
  'set_auto_refresh_slots',
  'set_user_password',
  'set_user_active',
  'delete_user',
  'review_listing',
  'grant_subscription',
  'cancel_subscription',
]);

const TOOL_HANDLERS = {
  lookup_user: (args) => lookupUser(args),
  get_user_overview: (args) => getUserOverview(args),
  adjust_boost_credits: (args, ctx) => adjustBoostCredits(args, ctx.admin),
  set_auto_refresh_slots: (args, ctx) => setAutoRefreshSlots(args, ctx.admin),
  set_user_password: (args, ctx) => setUserPassword(args, ctx.admin),
  set_user_active: (args, ctx) => setUserActive(args, ctx.admin),
  delete_user: (args, ctx) => deleteUser(args, ctx.admin),
  list_pending_listings: (args) => listPendingListings(args),
  review_listing: (args, ctx) => reviewListingTool(args, ctx.admin),
  get_platform_stats: () => getPlatformStats(),
  list_user_payments: (args) => listUserPayments(args),
  grant_subscription: (args, ctx) => grantSubscription(args, ctx.admin),
  cancel_subscription: (args, ctx) => cancelSubscription(args, ctx.admin),
  diagnose_schema: () => diagnoseSchema(),
  list_recent_ai_actions: (args, ctx) => listRecentAiActions(args, ctx.admin),
};

async function runAdminAiTool(name, rawArgs, { admin, skipConfirm = false } = {}) {
  const handler = TOOL_HANDLERS[name];
  if (!handler) return { ok: false, message: `Mjet i panjohur: ${name}` };
  const args = rawArgs && typeof rawArgs === 'object' ? { ...rawArgs } : {};
  // Model cannot self-confirm mutations — only the admin UI confirm path can.
  args.confirm = skipConfirm === true;
  const result = await handler(args, { admin });
  if (MUTATING_TOOLS.has(name) && !result?.needsConfirmation) {
    await logAction({ admin, tool: name, args, result });
  }
  return result;
}

module.exports = {
  TOOL_HANDLERS,
  MUTATING_TOOLS,
  runAdminAiTool,
  redactArgs,
  publicUser,
};
