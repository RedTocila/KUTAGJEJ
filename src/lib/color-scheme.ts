export const COLOR_SCHEME_STORAGE_KEY = 'kutagjej-color-scheme';
export const COLOR_SCHEME_COOKIE_NAME = 'kutagjej-color-scheme';

export type ColorScheme = 'light' | 'dark';

export const DEFAULT_COLOR_SCHEME: ColorScheme = 'dark';

export function parseColorScheme(value: string | undefined | null): ColorScheme {
  if (value === 'light') return 'light';
  if (value === 'dark') return 'dark';
  return DEFAULT_COLOR_SCHEME;
}

/** Mirror resolved mode to a cookie so SSR matches client `localStorage`. */
export function setColorSchemeCookie(mode: ColorScheme): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COLOR_SCHEME_COOKIE_NAME}=${mode};path=/;max-age=31536000;SameSite=Lax`;
}
