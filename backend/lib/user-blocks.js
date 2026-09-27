'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');

/** Table may not exist until the migration is applied — treat as "no blocks". */
function isMissingTableError(error) {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');
  return code === '42P01' || code === 'PGRST205' || /relation .* does not exist|schema cache/i.test(msg);
}

/** IDs the given user has blocked. */
async function loadBlockedUserIds(userId) {
  if (!isUuid(userId)) return [];
  const { data, error } = await getSupabaseAdmin()
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', userId);
  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return (data || []).map((row) => String(row.blocked_id));
}

/** True when either user has blocked the other. */
async function isBlockedBetween(userIdA, userIdB) {
  if (!isUuid(userIdA) || !isUuid(userIdB)) return false;
  const { data, error } = await getSupabaseAdmin()
    .from('user_blocks')
    .select('blocker_id')
    .or(
      `and(blocker_id.eq.${userIdA},blocked_id.eq.${userIdB}),and(blocker_id.eq.${userIdB},blocked_id.eq.${userIdA})`,
    )
    .limit(1);
  if (error) {
    if (isMissingTableError(error)) return false;
    throw error;
  }
  return Boolean(data?.length);
}

async function blockUser(blockerId, blockedId) {
  const { error } = await getSupabaseAdmin()
    .from('user_blocks')
    .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true });
  if (error) throw error;
}

async function unblockUser(blockerId, blockedId) {
  const { error } = await getSupabaseAdmin()
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}

const BLOCKED_MESSAGE = 'Nuk mund të komunikoni me këtë përdorues.';

module.exports = {
  BLOCKED_MESSAGE,
  isMissingTableError,
  loadBlockedUserIds,
  isBlockedBetween,
  blockUser,
  unblockUser,
};
