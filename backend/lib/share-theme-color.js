'use strict';

/** Keep in sync with `src/lib/share-theme-color.ts`. */
const DEFAULT_SHARE_THEME_COLOR = '#76ba1b';

const SHARE_THEME_COLORS = [
  '#76ba1b',
  '#84cc16',
  '#4ade80',
  '#34d399',
  '#2dd4bf',
  '#22d3ee',
  '#38bdf8',
  '#60a5fa',
  '#3b82f6',
  '#818cf8',
  '#a78bfa',
  '#c084fc',
  '#e879f9',
  '#f472b6',
  '#fb7185',
  '#f43f5e',
  '#ef4444',
  '#fb923c',
  '#fbbf24',
  '#facc15',
  '#f5f5f5',
];

const SHARE_THEME_COLOR_SET = new Set(SHARE_THEME_COLORS);

function normalizeShareThemeColor(raw) {
  const value = String(raw || '')
    .trim()
    .toLowerCase();
  return SHARE_THEME_COLOR_SET.has(value) ? value : DEFAULT_SHARE_THEME_COLOR;
}

/**
 * Parse a profile payload value.
 * - `undefined` → field omitted
 * - `null` / blank → store null (default brand green)
 * - valid palette hex → lowercase hex
 * - anything else → `false` (invalid)
 */
function sanitizeShareThemeColor(raw) {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const value = String(raw).trim().toLowerCase();
  if (!value) return null;
  if (!SHARE_THEME_COLOR_SET.has(value)) return false;
  return value;
}

module.exports = {
  DEFAULT_SHARE_THEME_COLOR,
  SHARE_THEME_COLORS,
  normalizeShareThemeColor,
  sanitizeShareThemeColor,
};
