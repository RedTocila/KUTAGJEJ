'use strict';

const { getSupabaseAdmin } = require('./supabase');
const {
  roundBc,
  getBoostCredits,
  spendBoostCredits,
  creditBoostCredits,
} = require('./boost-credits');

const COST_AI_BUILD = 1;
const COST_OTHER = 0.5;
const FALLBACK_NOTIF_TYPE = 'ai_usage';

const KINDS = new Set(['ai_build', 'ai_assist', 'ai_menu']);

function aiCosts() {
  return {
    aiBuildPerLink: COST_AI_BUILD,
    other: COST_OTHER,
    aiSearch: 0,
  };
}

function resolveAiListingCharge({ mode, feature, urlCount }) {
  const links = Math.max(0, Math.floor(Number(urlCount) || 0));
  if (links > 0) {
    return {
      kind: 'ai_build',
      units: links,
      cost: roundBc(COST_AI_BUILD * links),
    };
  }
  const isAssist =
    String(mode || '').trim() === 'edit' || String(feature || '').trim().toLowerCase() === 'assist';
  if (isAssist) {
    return { kind: 'ai_assist', units: 1, cost: COST_OTHER };
  }
  return { kind: 'ai_build', units: 1, cost: COST_AI_BUILD };
}

function isMissingRelation(error) {
  const msg = String(error?.message || error || '');
  return /ai_usage_events|schema cache|does not exist|Could not find the table/i.test(msg);
}

function mapEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    costBc: roundBc(row.cost_bc),
    units: Math.max(1, Math.floor(Number(row.units) || 1)),
    sourceLabel: row.source_label || null,
    status: row.status === 'refunded' ? 'refunded' : 'charged',
    createdAt: row.created_at,
  };
}

function mapFallbackNotification(row) {
  if (!row) return null;
  let payload = {};
  try {
    payload = JSON.parse(String(row.message || '')) || {};
  } catch {
    payload = {};
  }
  const kind = KINDS.has(payload.kind) ? payload.kind : KINDS.has(row.title) ? row.title : 'ai_assist';
  return {
    id: String(row.id),
    kind,
    costBc: roundBc(payload.costBc ?? payload.cost_bc ?? 0),
    units: Math.max(1, Math.floor(Number(payload.units) || 1)),
    sourceLabel: payload.sourceLabel || payload.source_label || null,
    status: payload.status === 'refunded' ? 'refunded' : 'charged',
    createdAt: row.created_at,
  };
}

async function insertUsageEvent({ userId, kind, cost, units, sourceLabel }) {
  const safeKind = KINDS.has(kind) ? kind : 'ai_assist';
  const payload = {
    user_id: userId,
    kind: safeKind,
    cost_bc: roundBc(cost),
    units: Math.max(1, Math.floor(Number(units) || 1)),
    source_label: sourceLabel ? String(sourceLabel).slice(0, 400) : null,
    status: 'charged',
  };

  const { data, error } = await getSupabaseAdmin()
    .from('ai_usage_events')
    .insert(payload)
    .select('id, kind, cost_bc, units, source_label, status, created_at')
    .maybeSingle();
  if (!error && data) return { event: mapEvent(data), fallback: false };
  if (error && !isMissingRelation(error)) throw error;

  const now = new Date().toISOString();
  const { data: notif, error: notifErr } = await getSupabaseAdmin()
    .from('user_notifications')
    .insert({
      user_id: userId,
      type: FALLBACK_NOTIF_TYPE,
      title: safeKind,
      message: JSON.stringify({
        kind: safeKind,
        costBc: roundBc(cost),
        units: payload.units,
        sourceLabel: payload.source_label,
        status: 'charged',
      }),
      read_at: now,
      updated_at: now,
    })
    .select('id, title, message, created_at')
    .maybeSingle();
  if (notifErr) throw notifErr;
  return { event: mapFallbackNotification(notif), fallback: true };
}

/**
 * Spend BC and record a usage row. Call before OpenAI; refund on failure.
 */
async function chargeAiUsage({ userId, kind, units, cost, sourceLabel }) {
  const spent = await spendBoostCredits(userId, cost);
  if (!spent.ok) return spent;

  try {
    const recorded = await insertUsageEvent({
      userId,
      kind,
      cost: spent.cost,
      units,
      sourceLabel,
    });
    return {
      ok: true,
      cost: spent.cost,
      balance: spent.balance,
      eventId: recorded.event?.id || null,
      event: recorded.event,
      fallback: recorded.fallback,
    };
  } catch (err) {
    console.warn('[ai-usage] ledger insert failed:', err?.message || err);
    return { ok: true, cost: spent.cost, balance: spent.balance, eventId: null, event: null };
  }
}

async function refundAiUsage({ userId, eventId, cost, fallback = false }) {
  const balance = await creditBoostCredits(userId, cost);
  if (!eventId) return { ok: true, balance };

  if (!fallback) {
    const { error } = await getSupabaseAdmin()
      .from('ai_usage_events')
      .update({ status: 'refunded' })
      .eq('id', eventId)
      .eq('user_id', userId)
      .eq('status', 'charged');
    if (error && isMissingRelation(error)) {
      fallback = true;
    } else if (error) {
      console.warn('[ai-usage] refund mark failed:', error.message);
    }
  }

  if (fallback) {
    const { data: row } = await getSupabaseAdmin()
      .from('user_notifications')
      .select('id, message')
      .eq('id', eventId)
      .eq('user_id', userId)
      .eq('type', FALLBACK_NOTIF_TYPE)
      .maybeSingle();
    if (row) {
      let payload = {};
      try {
        payload = JSON.parse(String(row.message || '')) || {};
      } catch {
        payload = {};
      }
      payload.status = 'refunded';
      await getSupabaseAdmin()
        .from('user_notifications')
        .update({ message: JSON.stringify(payload), updated_at: new Date().toISOString() })
        .eq('id', row.id);
    }
  }

  return { ok: true, balance };
}

async function listFromEventsTable(userId, cap) {
  const { data, error } = await getSupabaseAdmin()
    .from('ai_usage_events')
    .select('id, kind, cost_bc, units, source_label, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(cap);
  if (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
  return (data || []).map(mapEvent).filter(Boolean);
}

async function listFromFallbackNotifications(userId, cap) {
  const { data, error } = await getSupabaseAdmin()
    .from('user_notifications')
    .select('id, title, message, created_at')
    .eq('user_id', userId)
    .eq('type', FALLBACK_NOTIF_TYPE)
    .order('created_at', { ascending: false })
    .limit(cap);
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return (data || []).map(mapFallbackNotification).filter(Boolean);
}

async function listAiUsage(userId, { limit = 80 } = {}) {
  const cap = Math.min(200, Math.max(1, Math.floor(Number(limit) || 80)));
  try {
    const fromTable = await listFromEventsTable(userId, cap);
    if (fromTable !== null) return fromTable;
  } catch (err) {
    console.warn('[ai-usage] events table:', err?.message || err);
  }
  try {
    return await listFromFallbackNotifications(userId, cap);
  } catch (err) {
    console.warn('[ai-usage] fallback history:', err?.message || err);
    return [];
  }
}

async function getAiUsageSnapshot(userId) {
  const costs = aiCosts();
  let balance = 0;
  let events = [];
  try {
    balance = await getBoostCredits(userId);
  } catch (err) {
    console.warn('[ai-usage] balance:', err?.message || err);
  }
  events = await listAiUsage(userId);
  return { balance, costs, events };
}

module.exports = {
  COST_AI_BUILD,
  COST_OTHER,
  FALLBACK_NOTIF_TYPE,
  aiCosts,
  resolveAiListingCharge,
  chargeAiUsage,
  refundAiUsage,
  listAiUsage,
  getAiUsageSnapshot,
  getBoostCredits,
};
