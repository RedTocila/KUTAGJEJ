'use strict';

const { getSupabaseAdmin } = require('./supabase');

async function ensureAiImportUsageSchema() {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from('ai_usage_events').select('id').limit(1);
  if (!error) return;
  console.warn(
    '[ai-usage] Missing public.ai_usage_events or profiles.boost_credits is not numeric. ' +
      'Apply supabase/migrations/20260823120000_ai_usage_boost_coins.sql ' +
      '(or backend/scripts/repair-missing-schema.sql).',
  );
}

module.exports = { ensureAiImportUsageSchema };
