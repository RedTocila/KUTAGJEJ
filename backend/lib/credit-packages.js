'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');

/** Total BC granted for a package (base + bonus). */
function totalCredits(doc) {
  return Number(doc.credits || 0) + Number(doc.bonusCredits || doc.bonus_credits || 0);
}

function mapCreditPackage(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    credits: row.credits,
    bonusCredits: Number(row.bonus_credits) || 0,
    priceEur: row.price_eur != null ? Number(row.price_eur) : null,
    labelSq: row.label_sq || '',
    badgeSq: row.badge_sq || '',
    active: Boolean(row.active),
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Shape returned to buyers (and the admin list uses the raw doc directly). */
function formatCreditPackage(doc) {
  return {
    id: String(doc.id || doc._id),
    credits: doc.credits,
    bonusCredits: Number(doc.bonusCredits) || 0,
    priceEur: doc.priceEur,
    labelSq: doc.labelSq,
    badgeSq: doc.badgeSq || undefined,
  };
}

/** Active packages, sorted, for the public store. */
async function listActiveCreditPackages() {
  const sb = getSupabaseAdmin();
  const query = () =>
    sb
      .from('credit_packages')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

  let { data, error } = await query();
  if (error) throw error;

  // Self-heal empty catalogs (e.g. fresh DB before ensure ran, or all rows deactivated).
  if (!data?.length) {
    try {
      const { ensureCreditPackages } = require('./ensure-credit-packages');
      await ensureCreditPackages();
      ({ data, error } = await query());
      if (error) throw error;
    } catch (ensureErr) {
      console.error('listActiveCreditPackages ensure fallback:', ensureErr?.message || ensureErr);
    }
  }

  return (data || []).map(mapCreditPackage).map(formatCreditPackage);
}

/** A single active package by id or labelSq, or null. Used when creating an order. */
async function getActiveCreditPackage(id) {
  const key = String(id || '').trim();
  if (!key) return null;
  const sb = getSupabaseAdmin();

  if (isUuid(key)) {
    const { data, error } = await sb
      .from('credit_packages')
      .select('*')
      .eq('id', key)
      .eq('active', true)
      .maybeSingle();
    if (error) throw error;
    return mapCreditPackage(data);
  }

  const { data, error } = await sb
    .from('credit_packages')
    .select('*')
    .eq('label_sq', key)
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  return mapCreditPackage(data);
}

module.exports = {
  formatCreditPackage,
  listActiveCreditPackages,
  getActiveCreditPackage,
  totalCredits,
  mapCreditPackage,
};
