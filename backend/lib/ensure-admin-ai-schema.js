'use strict';

const { getSupabaseAdmin } = require('./supabase');

async function ensureAdminAiSchema() {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from('admin_ai_actions').select('id').limit(1);
  if (!error) return;
  console.warn(
    '[admin-ai] Missing public.admin_ai_actions. ' +
      'Apply supabase/migrations/20260811120000_admin_ai_actions.sql ' +
      '(or backend/scripts/repair-missing-schema.sql).',
  );
}

module.exports = { ensureAdminAiSchema };