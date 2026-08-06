/**
 * Optional compare-at ("was") price next to the live listing price/salary.
 * Empty → null (clears). When set, must be a finite number greater than the current amount.
 *
 * @param {unknown} raw
 * @param {number | null | undefined} currentAmount
 * @param {{ label?: string }} [opts]
 * @returns {{ ok: true, value: number | null } | { ok: false, message: string }}
 */
function parseComparePrice(raw, currentAmount, opts = {}) {
  const label = opts.label || 'Çmimi i mëparshëm';
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { ok: true, value: null };
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, message: `${label} duhet të jetë një numër pozitiv.` };
  }
  if (currentAmount === null || currentAmount === undefined || !Number.isFinite(Number(currentAmount))) {
    return { ok: false, message: `${label} mund të vendoset vetëm kur ka çmim aktual.` };
  }
  if (n <= Number(currentAmount)) {
    return { ok: false, message: `${label} duhet të jetë më i lartë se çmimi aktual.` };
  }
  return { ok: true, value: n };
}

/** Normalize DB value for public/mine JSON. */
function comparePriceFromDoc(doc, camelKey, snakeKey) {
  const raw = doc?.[camelKey] ?? doc?.[snakeKey];
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

module.exports = { parseComparePrice, comparePriceFromDoc };
