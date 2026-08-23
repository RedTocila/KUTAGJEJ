'use strict';

/** After a successful save, never report 0 — the row exists even if COUNT missed it. */
function reportedSaveCount(counted, saved) {
  const n = typeof counted === 'number' && Number.isFinite(counted) ? Math.max(0, Math.trunc(counted)) : 0;
  return saved ? Math.max(n, 1) : n;
}

/**
 * Visible save count across pages.
 * `cached` is the user's last known count (optimistic toggle). Prefer it over stale listing payloads.
 */
function resolveVisibleSaveCount({ initial, saved, cached }) {
  const base = typeof initial === 'number' && Number.isFinite(initial) ? Math.max(0, initial) : 0;
  const held = typeof cached === 'number' && Number.isFinite(cached) ? Math.max(0, cached) : null;
  if (held != null) {
    return saved ? Math.max(held, base, 1) : held;
  }
  return saved ? Math.max(base, 1) : base;
}

function nextSaveCount(current, result) {
  const cur = typeof current === 'number' && Number.isFinite(current) ? Math.max(0, current) : 0;
  if (!result) return cur;
  if (result.stale) return cur;
  if (result.saved) {
    const reported = typeof result.saveCount === 'number' && Number.isFinite(result.saveCount) ? result.saveCount : 0;
    return Math.max(cur, reported, 1);
  }
  if (typeof result.saveCount === 'number' && Number.isFinite(result.saveCount)) {
    return Math.max(0, result.saveCount);
  }
  return cur;
}

module.exports = { reportedSaveCount, nextSaveCount, resolveVisibleSaveCount };
