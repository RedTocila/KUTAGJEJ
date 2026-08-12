'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { loadActivePaidSubscription } = require('./listing-quota-convert');
const { calendarDayUtc } = require('./daily-share-reward');

/** Daily AI Build caps by subscription plan. null = unlimited. */
const DAILY_LIMIT_BY_PLAN = {
  free: 1,
  starter: 10,
  grow: null,
  elite: null,
};

function resolvePlanCode(sub) {
  if (!sub) return 'free';
  const code = String(sub.plan_code || '').trim().toLowerCase();
  if (code === 'starter' || code === 'grow' || code === 'elite' || code === 'free') {
    return code;
  }
  const title = String(sub.contract_title || '').toLowerCase();
  if (title.includes('elite')) return 'elite';
  if (title.includes('grow')) return 'grow';
  if (title.includes('starter') || title.includes('started')) return 'starter';
  if (code) return code;
  return 'free';
}

function dailyLimitForPlan(planCode) {
  const key = String(planCode || 'free').toLowerCase();
  if (Object.prototype.hasOwnProperty.call(DAILY_LIMIT_BY_PLAN, key)) {
    return DAILY_LIMIT_BY_PLAN[key];
  }
  return DAILY_LIMIT_BY_PLAN.free;
}

function limitReachedMessage(planCode, limit) {
  if (planCode === 'starter') {
    return `Starter plan allows ${limit} AI Builds per day. Try again tomorrow or upgrade to Grow/Elite for unlimited.`;
  }
  return `Free plan allows ${limit} AI Build per day. Try again tomorrow or upgrade for more.`;
}

function quotaShape({ planCode, limit, used, usedOn }) {
  const unlimited = limit == null;
  return {
    planCode,
    unlimited,
    limit: unlimited ? null : limit,
    used: unlimited ? 0 : used,
    remaining: unlimited ? null : Math.max(0, limit - used),
    usedOn,
  };
}

async function readTodayUseCount(userId, usedOn) {
  const { data, error } = await getSupabaseAdmin()
    .from('ai_import_daily_usage')
    .select('use_count')
    .eq('user_id', userId)
    .eq('used_on', usedOn)
    .maybeSingle();
  if (error) throw error;
  return Math.max(0, Math.floor(Number(data?.use_count) || 0));
}

/**
 * @returns {Promise<{
 *   planCode: string,
 *   unlimited: boolean,
 *   limit: number | null,
 *   used: number,
 *   remaining: number | null,
 *   usedOn: string,
 * }>}
 */
async function getAiImportQuota(userId) {
  const usedOn = calendarDayUtc();
  const sub = await loadActivePaidSubscription(userId);
  const planCode = resolvePlanCode(sub);
  const limit = dailyLimitForPlan(planCode);
  if (limit == null) {
    return quotaShape({ planCode, limit: null, used: 0, usedOn });
  }
  const used = await readTodayUseCount(userId, usedOn);
  return quotaShape({ planCode, limit, used, usedOn });
}

async function tryIncrement(userId, usedOn, expectedCount, limit) {
  const sb = getSupabaseAdmin();
  const next = expectedCount + 1;
  if (next > limit) return null;

  if (expectedCount === 0) {
    const { data, error } = await sb
      .from('ai_import_daily_usage')
      .insert({
        user_id: userId,
        used_on: usedOn,
        use_count: 1,
        updated_at: new Date().toISOString(),
      })
      .select('use_count')
      .maybeSingle();
    if (!error && data) return Math.max(0, Math.floor(Number(data.use_count) || 1));
    if (error && error.code !== '23505') throw error;
    return null;
  }

  const { data, error } = await sb
    .from('ai_import_daily_usage')
    .update({
      use_count: next,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('used_on', usedOn)
    .eq('use_count', expectedCount)
    .select('use_count')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return Math.max(0, Math.floor(Number(data.use_count) || next));
}

/**
 * Reserve one AI Build for today. Call before running OpenAI.
 * @returns {Promise<{ ok: true, quota: object } | { ok: false, status: number, code: string, message: string, quota: object }>}
 */
async function consumeAiImportQuota(userId) {
  const usedOn = calendarDayUtc();
  const sub = await loadActivePaidSubscription(userId);
  const planCode = resolvePlanCode(sub);
  const limit = dailyLimitForPlan(planCode);

  if (limit == null) {
    return { ok: true, quota: quotaShape({ planCode, limit: null, used: 0, usedOn }) };
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const used = await readTodayUseCount(userId, usedOn);
    if (used >= limit) {
      return {
        ok: false,
        status: 403,
        code: 'ai_daily_limit',
        message: limitReachedMessage(planCode, limit),
        quota: quotaShape({ planCode, limit, used, usedOn }),
      };
    }

    const nextUsed = await tryIncrement(userId, usedOn, used, limit);
    if (nextUsed != null) {
      return { ok: true, quota: quotaShape({ planCode, limit, used: nextUsed, usedOn }) };
    }
  }

  const used = await readTodayUseCount(userId, usedOn);
  return {
    ok: false,
    status: 403,
    code: 'ai_daily_limit',
    message: limitReachedMessage(planCode, limit),
    quota: quotaShape({ planCode, limit, used, usedOn }),
  };
}

module.exports = {
  DAILY_LIMIT_BY_PLAN,
  resolvePlanCode,
  dailyLimitForPlan,
  getAiImportQuota,
  consumeAiImportQuota,
};
