/** Matches augmented `PaletteRange` in `src/mui-augment.d.ts`. */
type PaletteRange = Record<
  '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950',
  string
>;

export const california = {
  50: '#fffaea',
  100: '#fff3c6',
  200: '#ffe587',
  300: '#ffd049',
  400: '#ffbb1f',
  500: '#fb9c0c',
  600: '#de7101',
  700: '#b84d05',
  800: '#953b0b',
  900: '#7b310c',
  950: '#471701',
} satisfies PaletteRange;

export const kepple = {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e',
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
  950: '#052e16',
} satisfies PaletteRange;

export const neonBlue = {
  50: '#ecfdf5',
  100: '#d1fae5',
  200: '#a7f3d0',
  300: '#6ee7b7',
  400: '#34d399',
  500: '#10b981',
  600: '#059669',
  700: '#047857',
  800: '#065f46',
  900: '#064e3b',
  950: '#022c22',
} satisfies PaletteRange;

/** Light UI neutrals — soft sage / warm grey (logo glow + paper). */
export const stormGrey = {
  50: '#f7faf4',
  100: '#ecf2e6',
  200: '#d9e4d0',
  300: '#b8c9ad',
  400: '#8fa382',
  500: '#637558',
  600: '#4d5d46',
  700: '#3d4a38',
  800: '#2a3326',
  900: '#1a2118',
  950: '#0f140d',
} satisfies PaletteRange;

/** Dark UI neutrals — forest charcoal (logo deep greens). */
export const nevada = {
  50: '#e8f5e4',
  100: '#c8e4bf',
  200: '#9ccf8f',
  300: '#6fb35f',
  400: '#4f9442',
  500: '#3a7530',
  600: '#2d5c26',
  700: '#254a20',
  800: '#1a3618',
  900: '#0f2210',
  950: '#050d06',
} satisfies PaletteRange;

export const redOrange = {
  50: '#fef3f2',
  100: '#fee4e2',
  200: '#ffcdc9',
  300: '#fdaaa4',
  400: '#f97970',
  500: '#f04438',
  600: '#de3024',
  700: '#bb241a',
  800: '#9a221a',
  900: '#80231c',
  950: '#460d09',
} satisfies PaletteRange;

/** Info / accent teal — reads clearly on green UI without fighting the brand. */
export const shakespeare = {
  50: '#ecfeff',
  100: '#cffafe',
  200: '#a5f3fc',
  300: '#67e8f9',
  400: '#22d3ee',
  500: '#06b6d4',
  600: '#0891b2',
  700: '#0e7490',
  800: '#155e75',
  900: '#164e63',
  950: '#083344',
} satisfies PaletteRange;

/**
 * Primary brand greens from the app logo (lime body, forest shadow, glow highlights).
 */
export const logoGreen = {
  50: '#f4fce9',
  100: '#e2f7c8',
  200: '#c8ef98',
  300: '#c0ff3e',
  400: '#a6e22e',
  500: '#82c91e',
  600: '#76ba1b',
  700: '#5f9816',
  800: '#2b540a',
  900: '#1a4301',
  950: '#0d2201',
} satisfies PaletteRange;

/** @deprecated Use `logoGreen`; kept so older imports keep working. */
export const iAgentGold = logoGreen;
