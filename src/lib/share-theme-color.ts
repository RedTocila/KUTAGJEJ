/** Default KuTaGjej lime — used when the profile has no custom share color. */
export const DEFAULT_SHARE_THEME_COLOR = '#76ba1b';

/**
 * Palette shown on the profile form. Keep in sync with
 * `backend/lib/share-theme-color.js`.
 */
export const SHARE_THEME_COLORS = [
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
  '#a1a1aa',
  '#1e40af',
  '#ea580c',
] as const;

export type ShareThemeColor = (typeof SHARE_THEME_COLORS)[number];

const SHARE_THEME_COLOR_SET = new Set<string>(SHARE_THEME_COLORS);

export function isShareThemeColor(value: unknown): value is ShareThemeColor {
  return typeof value === 'string' && SHARE_THEME_COLOR_SET.has(value.toLowerCase());
}

/** Returns a palette hex, or the brand default when the value is missing / invalid. */
export function normalizeShareThemeColor(raw: unknown): string {
  const value = String(raw || '')
    .trim()
    .toLowerCase();
  return isShareThemeColor(value) ? value : DEFAULT_SHARE_THEME_COLOR;
}

/** Palette hex or `null` (meaning “use default”). Invalid input is ignored. */
export function parseShareThemeColorInput(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const value = String(raw).trim().toLowerCase();
  if (!value) return null;
  return isShareThemeColor(value) ? value : undefined;
}

export function shareThemeToRgba(hex: string, alpha: number): string {
  const n = normalizeShareThemeColor(hex).slice(1);
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function shareThemeContrastText(hex: string): '#0a0a0a' | '#ffffff' {
  const n = normalizeShareThemeColor(hex).slice(1);
  const channel = (offset: number) => {
    const c = Number.parseInt(n.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.42 ? '#0a0a0a' : '#ffffff';
}

export function lightenShareThemeColor(hex: string, amount = 0.1): string {
  const n = normalizeShareThemeColor(hex).slice(1);
  const bump = (offset: number) => {
    const c = Number.parseInt(n.slice(offset, offset + 2), 16);
    return Math.min(255, Math.round(c + (255 - c) * amount))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${bump(0)}${bump(2)}${bump(4)}`;
}
