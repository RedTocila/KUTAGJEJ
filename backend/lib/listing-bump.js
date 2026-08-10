'use strict';

const { hasBumpedAtColumn } = require('./ensure-bumped-at-schema');

/**
 * Field used to reorder a listing in public “newest” feeds.
 * Prefer bumped_at; fall back to created_at until the migration is applied.
 */
function bumpTimestampPatch(isoNow) {
  if (hasBumpedAtColumn() === false) {
    return { created_at: isoNow };
  }
  return { bumped_at: isoNow };
}

/**
 * Apply a bump update; if bumped_at is missing on live DB, retry with created_at.
 */
async function applyListingBump(sb, table, listingId, extraPatch, isoNow) {
  const bump = bumpTimestampPatch(isoNow);
  const first = { ...extraPatch, ...bump };
  let { error } = await sb.from(table).update(first).eq('id', listingId);
  if (
    error &&
    bump.bumped_at != null &&
    /bumped_at/i.test(String(error.message || ''))
  ) {
    ({ error } = await sb
      .from(table)
      .update({ ...extraPatch, created_at: isoNow })
      .eq('id', listingId));
  }
  if (error) throw error;
}

module.exports = { bumpTimestampPatch, applyListingBump };
