'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');

/**
 * Returns true if viewer and target have a direct conversation in the database,
 * or if viewer is the target themselves.
 */
async function hasContactRelationship(viewerId, targetProfileId) {
  const v = String(viewerId || '').trim();
  const t = String(targetProfileId || '').trim();
  if (!v || !t || !isUuid(v) || !isUuid(t)) return false;
  if (v === t) return true;

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('conversations')
      .select('id')
      .or(`and(poster_id.eq.${v},inquirer_id.eq.${t}),and(poster_id.eq.${t},inquirer_id.eq.${v})`)
      .limit(1);

    if (error) {
      console.warn('hasContactRelationship error:', error.message || error);
      return false;
    }
    return Boolean(data && data.length > 0);
  } catch (err) {
    console.warn('hasContactRelationship catch:', err?.message || err);
    return false;
  }
}

/**
 * Batch-returns a Set of targetIds that have a conversation with viewerId (or are the viewer).
 */
async function loadContactedTargetIdSet(viewerId, targetIds) {
  const v = String(viewerId || '').trim();
  const ids = [...new Set((targetIds || []).map((id) => String(id || '').trim()).filter((id) => id && isUuid(id)))];
  if (!v || !isUuid(v) || !ids.length) return new Set();

  const contacted = new Set();
  contacted.add(v);

  try {
    const sb = getSupabaseAdmin();
    const idList = `(${ids.join(',')})`;
    const { data, error } = await sb
      .from('conversations')
      .select('poster_id, inquirer_id')
      .or(`and(poster_id.eq.${v},inquirer_id.in.${idList}),and(inquirer_id.eq.${v},poster_id.in.${idList})`);

    if (error) {
      console.warn('loadContactedTargetIdSet error:', error.message || error);
      return contacted;
    }

    for (const row of data || []) {
      if (String(row.poster_id) === v) contacted.add(String(row.inquirer_id));
      if (String(row.inquirer_id) === v) contacted.add(String(row.poster_id));
    }
  } catch (err) {
    console.warn('loadContactedTargetIdSet catch:', err?.message || err);
  }

  return contacted;
}

module.exports = {
  hasContactRelationship,
  loadContactedTargetIdSet,
};
