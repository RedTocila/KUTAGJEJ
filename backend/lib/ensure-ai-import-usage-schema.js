'use strict';

const { getSupabaseAdmin } = require('./supabase');

async function ensureAiImportUsageSchema() {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from('ai_import_daily_usage').select('user_id').limit(1);
  if (!error) return;
  console.warn(
    '[ai-import] Missing public.ai_import_daily_usage. ' +
      'Apply supabase/migrations/20260812120000_ai_import_daily_usage.sql ' +
      '(or backend/scripts/repair-missing-schema.sql).',
  );
}

module.exports = { ensureAiImportUsageSchema };
