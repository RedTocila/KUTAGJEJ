'use strict';

const { getSupabaseAdmin } = require('./supabase');

const COST_BUILD_PER_LINK = 1;
const COST_OTHER = 0.5;

function roundBc(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

function clampUnits(value) {
  const n = Math.floor(Number(value) || 1);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(50, n);
}

function costForKind(kind, units) {
  const u = clampUnits(units);
  if (kind === 'build') return roundBc(COST_BUILD_PER_LINK * u);
  return roundBc(COST_OTHER);
}

/**
 * @param {{ product?: string, mode?: string, currentListing?: object | null, urlCount?: number }} input
 */
function resolveAiKind(input) {
  const urlCount = Math.max(0, Math.floor(Number(input?.urlCount) || 0));
  if (urlCount > 1) return 'build';
  const product = String(input?.product || '').trim().toLowerCase();
  if (product === 'menu') return 'menu';
  if (product === 'assist' || product === 'other') return 'assist';
  if (String(input?.mode || '').trim() === 'edit') return 'assist';
  if (input?.currentListing && typeof input.currentListing === 'object') return 'assist';
  return 'build';
}

function walletPayload(balance) {
  return {
    balance: roundBc(balance),
    costs: {
      build: COST_BUILD_PER_LINK,
      other: COST_OTHER,
      search: 0,
    },
  };
}

async function readBalance(userId) {
  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('boost_credits')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return roundBc(data?.boost_credits);
}

/**
 * Debit BC and insert an ai_usage row. Call refundAiUsage if OpenAI fails.
 * @returns {Promise<
 *   | { ok: true, cost: number, balance: number, usageId: string | null, previousBalance: number }
 *   | { ok: false, status: number, code: string, message: string, cost: number, balance: number }
 * >}
 */
async function spendAiUsage({ userId, kind, units, sourceLabel }) {
  const resolvedKind = kind === 'menu' || kind === 'assist' ? kind : 'build';
  const unitCount = resolvedKind === 'build' ? clampUnits(units) : 1;
  const cost = costForKind(resolvedKind, unitCount);
  const sb = getSupabaseAdmin();

  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('id, boost_credits')
    .eq('id', userId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!profile) {
    return {
      ok: false,
      status: 401,
      code: 'auth',
      message: 'Profili nuk u gjet.',
      cost,
      balance: 0,
    };
  }

  const previousBalance = roundBc(profile.boost_credits);
  if (previousBalance < cost) {
    return {
      ok: false,
      status: 400,
      code: 'ai_insufficient_bc',
      message: `Nuk keni mjaftueshëm Boost Coins. Duhet ${cost} BC.`,
      cost,
      balance: previousBalance,
    };
  }

  const now = new Date().toISOString();
  const next = roundBc(previousBalance - cost);
  const { data: spent, error: spendErr } = await sb
    .from('profiles')
    .update({ boost_credits: next, updated_at: now })
    .eq('id', userId)
    .gte('boost_credits', cost)
    .select('boost_credits')
    .maybeSingle();
  if (spendErr) throw spendErr;
  if (!spent) {
    return {
      ok: false,
      status: 400,
      code: 'ai_insufficient_bc',
      message: `Nuk keni mjaftueshëm Boost Coins. Duhet ${cost} BC.`,
      cost,
      balance: previousBalance,
    };
  }

  const { data: row, error: logErr } = await sb
    .from('ai_usage')
    .insert({
      user_id: userId,
      kind: resolvedKind,
      units: unitCount,
      cost_bc: cost,
      source_label: sourceLabel ? String(sourceLabel).slice(0, 300) : null,
    })
    .select('id')
    .maybeSingle();

  if (logErr) {
    const missing = /ai_usage|schema cache|does not exist/i.test(String(logErr.message || ''));
    if (!missing) {
      await sb
        .from('profiles')
        .update({ boost_credits: previousBalance, updated_at: new Date().toISOString() })
        .eq('id', userId);
      throw logErr;
    }
    console.warn('[ai-usage] Missing public.ai_usage; charged without ledger:', logErr.message);
  }

  return {
    ok: true,
    cost,
    balance: roundBc(spent.boost_credits),
    usageId: row?.id || null,
    previousBalance,
  };
}

async function refundAiUsage({ userId, usageId, previousBalance }) {
  const sb = getSupabaseAdmin();
  if (usageId) {
    await sb.from('ai_usage').delete().eq('id', usageId).eq('user_id', userId);
  }
  const restored = roundBc(previousBalance);
  await sb
    .from('profiles')
    .update({ boost_credits: restored, updated_at: new Date().toISOString() })
    .eq('id', userId);
}

async function listAiUsage(userId, { limit = 80 } = {}) {
  const sb = getSupabaseAdmin();
  const balance = await readBalance(userId);
  const cap = Math.min(100, Math.max(1, Math.floor(Number(limit) || 80)));
  const { data, error } = await sb
    .from('ai_usage')
    .select('id, kind, units, cost_bc, source_label, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(cap);
  if (error) {
    const missing = /ai_usage|schema cache|does not exist/i.test(String(error.message || ''));
    if (missing) {
      return { ...walletPayload(balance), rows: [] };
    }
    throw error;
  }
  return {
    ...walletPayload(balance),
    rows: (data || []).map((row) => ({
      id: row.id,
      kind: row.kind,
      units: Math.max(1, Math.floor(Number(row.units) || 1)),
      costBc: roundBc(row.cost_bc),
      sourceLabel: row.source_label || null,
      createdAt: row.created_at,
    })),
  };
}

module.exports = {
  COST_BUILD_PER_LINK,
  COST_OTHER,
  roundBc,
  costForKind,
  resolveAiKind,
  walletPayload,
  readBalance,
  spendAiUsage,
  refundAiUsage,
  listAiUsage,
};
