'use strict';

const { getSupabaseAdmin } = require('./supabase');

/**
 * Best-effort schema check so DBs that only ran the old init get a clear warning
 * until `20260803010000_member_reviews.sql` is applied.
 */
async function ensureMemberReviewsSchema() {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from('member_reviews').select('id').limit(1);
  if (!error) return;
  console.warn(
    '[member-reviews] Missing member_reviews table. ' +
      'Apply supabase/migrations/20260803010000_member_reviews.sql before leaving profile reviews.',
  );
}

module.exports = { ensureMemberReviewsSchema };
