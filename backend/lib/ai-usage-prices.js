'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { roundBc } = require('./boost-credits');

const DEFAULT_AI_USAGE_PRICES = {
  aiBuildPerLink: 1,
  other: 0.5,
  aiAssist: 0.5,
  aiMenuPerImage: 1,
  aiSearch: 0,
};

const CACHE_MS = 15_000;
let cache = { at: 0, value: DEFAULT_AI_USAGE_PRICES };

function clampPrice(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return roundBc(fallback);
  return roundBc(Math.min(1000, n));
}

function normalizePrices(row) {
  const aiBuildPerLink = clampPrice(row?.ai_build_per_link ?? row?.aiBuildPerLink, DEFAULT_AI_USAGE_PRICES.aiBuildPerLink);
  const aiAssist = clampPrice(row?.ai_assist ?? row?.aiAssist ?? row?.other, DEFAULT_AI_USAGE_PRICES.aiAssist);
  const aiMenuPerImage = clampPrice(
    row?.ai_menu_per_image ?? row?.aiMenuPerImage,
    DEFAULT_AI_USAGE_PRICES.aiMenuPerImage,
  );
  const aiSearch = clampPrice(row?.ai_search ?? row?.aiSearch, DEFAULT_AI_USAGE_PRICES.aiSearch);
  return {
    aiBuildPerLink,
    other: aiAssist,
    aiAssist,
    aiMenuPerImage,
    aiSearch,
  };
}

function publicCosts(prices) {
  return {
    aiBuildPerLink: prices.aiBuildPerLink,
    other: prices.aiAssist,
    aiAssist: prices.aiAssist,
    aiMenuPerImage: prices.aiMenuPerImage,
    aiSearch: prices.aiSearch,
  };
}

function invalidateAiUsagePricesCache() {
  cache = { at: 0, value: DEFAULT_AI_USAGE_PRICES };
}

async function getAiUsagePrices() {
  if (Date.now() - cache.at < CACHE_MS && cache.value) return cache.value;
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('ai_usage_prices')
      .select('ai_build_per_link, ai_assist, ai_menu_per_image, ai_search')
      .eq('id', 'default')
      .maybeSingle();
    if (error) {
      if (!/ai_usage_prices|schema cache|does not exist/i.test(String(error.message || ''))) {
        console.warn('[ai-usage-prices]', error.message);
      }
      cache = { at: Date.now(), value: DEFAULT_AI_USAGE_PRICES };
      return DEFAULT_AI_USAGE_PRICES;
    }
    const value = data ? normalizePrices(data) : DEFAULT_AI_USAGE_PRICES;
    cache = { at: Date.now(), value };
    return value;
  } catch (err) {
    console.warn('[ai-usage-prices]', err?.message || err);
    return DEFAULT_AI_USAGE_PRICES;
  }
}

function isMissingPricesTable(error) {
  return /ai_usage_prices|schema cache|does not exist|Could not find the table/i.test(String(error?.message || ''));
}

async function saveAiUsagePrices(input, { updatedBy } = {}) {
  const next = normalizePrices({
    aiBuildPerLink: input?.aiBuildPerLink,
    aiAssist: input?.aiAssist ?? input?.other,
    aiMenuPerImage: input?.aiMenuPerImage,
    aiSearch: input?.aiSearch,
  });
  const row = {
    id: 'default',
    ai_build_per_link: next.aiBuildPerLink,
    ai_assist: next.aiAssist,
    ai_menu_per_image: next.aiMenuPerImage,
    ai_search: next.aiSearch,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy || null,
  };

  const upsert = (payload) =>
    getSupabaseAdmin()
      .from('ai_usage_prices')
      .upsert(payload, { onConflict: 'id' })
      .select('ai_build_per_link, ai_assist, ai_menu_per_image, ai_search')
      .single();

  let { data, error } = await upsert(row);
  if (error && row.updated_by && /updated_by|foreign key/i.test(String(error.message || ''))) {
    ({ data, error } = await upsert({ ...row, updated_by: null }));
  }
  if (error) throw error;
  const value = normalizePrices(data);
  cache = { at: Date.now(), value };
  return value;
}

async function ensureAiUsagePricesSchema() {
  const { error } = await getSupabaseAdmin().from('ai_usage_prices').select('id').eq('id', 'default').maybeSingle();
  if (!error) return;
  console.warn(
    '[ai-usage-prices] Missing public.ai_usage_prices. ' +
      'Apply supabase/migrations/20260823150000_ai_usage_prices.sql ' +
      '(or backend/scripts/repair-missing-schema.sql).',
  );
}

module.exports = {
  DEFAULT_AI_USAGE_PRICES,
  publicCosts,
  isMissingPricesTable,
  getAiUsagePrices,
  saveAiUsagePrices,
  invalidateAiUsagePricesCache,
  ensureAiUsagePricesSchema,
};
