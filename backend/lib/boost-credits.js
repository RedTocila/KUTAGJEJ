'use strict';

const { getSupabaseAdmin } = require('./supabase');

/** Boost Coins granted when a new profiles row is created. */
const NEW_ACCOUNT_BOOST_CREDITS = 100;

function roundBc(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 10) / 10;
}

function rpcMissing(error) {
  const msg = String(error?.message || '');
  const code = String(error?.code || '');
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    /spend_boost_credits|credit_boost_credits|could not find the function/i.test(msg)
  );
}

async function getBoostCredits(userId) {
  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('boost_credits')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return roundBc(data?.boost_credits);
}

async function spendWithOptimisticLock(userId, amount) {
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: profile, error } = await sb
      .from('profiles')
      .select('boost_credits')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!profile) {
      return {
        ok: false,
        status: 401,
        code: 'no_profile',
        message: 'Profili nuk u gjet.',
        balance: 0,
        cost: amount,
      };
    }

    const raw = profile.boost_credits;
    const balance = roundBc(raw);
    if (balance < amount) {
      return {
        ok: false,
        status: 403,
        code: 'insufficient_bc',
        message: 'Nuk keni mjaftueshëm Boost Coins.',
        balance,
        cost: amount,
      };
    }

    const next = roundBc(balance - amount);
    const { data: spent, error: spendErr } = await sb
      .from('profiles')
      .update({ boost_credits: next, updated_at: now })
      .eq('id', userId)
      .eq('boost_credits', raw)
      .select('boost_credits')
      .maybeSingle();
    if (spendErr) throw spendErr;
    if (!spent) continue;

    return { ok: true, cost: amount, balance: roundBc(spent.boost_credits) };
  }

  const balance = await getBoostCredits(userId);
  return {
    ok: false,
    status: 403,
    code: 'insufficient_bc',
    message: 'Nuk keni mjaftueshëm Boost Coins.',
    balance,
    cost: amount,
  };
}

/**
 * Atomically subtract Boost Coins.
 * @returns {Promise<
 *   | { ok: true, cost: number, balance: number }
 *   | { ok: false, status: number, code: string, message: string, balance: number, cost: number }
 * >}
 */
async function spendBoostCredits(userId, cost) {
  const amount = roundBc(cost);
  if (amount <= 0) {
    return { ok: true, cost: 0, balance: await getBoostCredits(userId) };
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.rpc('spend_boost_credits', {
    p_user_id: userId,
    p_amount: amount,
  });
  if (!error) {
    if (data == null) {
      const balance = await getBoostCredits(userId);
      return {
        ok: false,
        status: 403,
        code: 'insufficient_bc',
        message: 'Nuk keni mjaftueshëm Boost Coins.',
        balance,
        cost: amount,
      };
    }
    return { ok: true, cost: amount, balance: roundBc(data) };
  }
  if (!rpcMissing(error)) throw error;
  return spendWithOptimisticLock(userId, amount);
}

async function creditBoostCredits(userId, amount) {
  const add = roundBc(amount);
  if (add <= 0) return getBoostCredits(userId);

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.rpc('credit_boost_credits', {
    p_user_id: userId,
    p_amount: add,
  });
  if (!error && data != null) return roundBc(data);
  if (error && !rpcMissing(error)) throw error;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: profile, error: readErr } = await sb
      .from('profiles')
      .select('boost_credits')
      .eq('id', userId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!profile) return 0;

    const raw = profile.boost_credits;
    const next = roundBc(roundBc(raw) + add);
    const { data: credited, error: creditErr } = await sb
      .from('profiles')
      .update({ boost_credits: next, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('boost_credits', raw)
      .select('boost_credits')
      .maybeSingle();
    if (creditErr) throw creditErr;
    if (credited) return roundBc(credited.boost_credits);
  }

  return getBoostCredits(userId);
}

module.exports = {
  roundBc,
  getBoostCredits,
  spendBoostCredits,
  creditBoostCredits,
  NEW_ACCOUNT_BOOST_CREDITS,
};
