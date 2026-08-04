'use strict';

/**
 * Accent-tolerant search helpers for Albanian + common English place names.
 * Used by public listing keyword filters and location matching.
 */

/** Fold Albanian diacritics so "Durrës" ↔ "durres", "Korçë" ↔ "korce". */
function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ë/g, 'e')
    .replace(/ç/g, 'c')
    .replace(/[^\p{L}\p{N}\s./-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * English / colloquial spellings → folded Albanian forms.
 * Keys and values must already be accent-folded lowercase.
 */
const PLACE_ALIASES = {
  tirana: ['tirane'],
  vlora: ['vlore'],
  shkodra: ['shkoder'],
  shkoderi: ['shkoder'],
  korca: ['korce'],
  korcha: ['korce'],
  gjirokastra: ['gjirokaster'],
  argyrokastro: ['gjirokaster'],
  saranda: ['sarande'],
  himara: ['himare'],
  kavaja: ['kavaje'],
  lushnja: ['lushnje'],
  lezha: ['lezhe'],
  kukesi: ['kukes'],
  kamez: ['kamez'],
  kamenza: ['kamez'],
  elbasani: ['elbasan'],
  berati: ['berat'],
  fieri: ['fier'],
  pogradeci: ['pogradec'],
  durresi: ['durres'],
};

function aliasExpansions(folded) {
  const out = new Set([folded]);
  if (PLACE_ALIASES[folded]) {
    for (const alt of PLACE_ALIASES[folded]) out.add(alt);
  }
  for (const [alias, targets] of Object.entries(PLACE_ALIASES)) {
    if (targets.includes(folded)) out.add(alias);
  }
  return out;
}

/**
 * Build ILIKE query variants so ASCII and Albanian diacritic forms both match.
 * Caps combinatorial growth: fold + all-e→ë + all-c→ç + both.
 */
function expandSearchTerms(q) {
  const raw = String(q ?? '').trim();
  if (raw.length < 2 || raw.length > 80) return [];

  const lower = raw.toLowerCase();
  const folded = normalizeSearchText(raw);
  const variants = new Set();

  for (const base of aliasExpansions(folded)) {
    variants.add(base);
    variants.add(base.replace(/e/g, 'ë'));
    variants.add(base.replace(/c/g, 'ç'));
    variants.add(base.replace(/e/g, 'ë').replace(/c/g, 'ç'));
  }

  // Keep the raw lowercase form too (covers already-accented input).
  variants.add(lower);
  variants.add(lower.replace(/e/g, 'ë').replace(/c/g, 'ç'));

  return [...variants].filter((v) => v.length >= 2).slice(0, 12);
}

function namesMatch(query, candidate) {
  const needle = normalizeSearchText(query);
  const hay = normalizeSearchText(candidate);
  if (!needle || !hay) return false;
  if (hay.includes(needle) || needle.includes(hay)) return true;

  for (const alt of aliasExpansions(needle)) {
    if (hay.includes(alt) || alt.includes(hay)) return true;
  }
  for (const alt of aliasExpansions(hay)) {
    if (alt.includes(needle) || needle.includes(alt)) return true;
  }
  return false;
}

module.exports = {
  normalizeSearchText,
  expandSearchTerms,
  namesMatch,
  PLACE_ALIASES,
};
