'use client';

import * as React from 'react';
import { useColorScheme } from '@mui/material/styles';

import { setColorSchemeCookie } from '@/lib/color-scheme';

/** Matches `color-schemes.ts` background.default for each mode. */
const THEME_COLOR_LIGHT = '#f2f6ec';
const THEME_COLOR_DARK = '#0a0a0a';

const THEME_COLOR_META_ID = 'kutagjej-theme-color';

/**
 * Syncs `#kutagjej-theme-color`, `<meta name="color-scheme">`, and `documentElement` class + `colorScheme`
 * from the **resolved** MUI color scheme. MUI also toggles `.light`/`.dark`, but we mirror it so CSS
 * variables always match `localStorage` (avoids stuck `:root` light tokens when the library effect lags).
 */
export function ThemeColorMetaSync() {
  const { colorScheme } = useColorScheme();

  React.useLayoutEffect(() => {
    if (colorScheme !== 'light' && colorScheme !== 'dark') {
      return;
    }

    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(colorScheme);

    const isDark = colorScheme === 'dark';
    const color = isDark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;

    let meta = document.getElementById(THEME_COLOR_META_ID);
    if (!meta) {
      meta = document.createElement('meta');
      meta.id = THEME_COLOR_META_ID;
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);

    let schemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (!schemeMeta) {
      schemeMeta = document.createElement('meta');
      schemeMeta.setAttribute('name', 'color-scheme');
      document.head.appendChild(schemeMeta);
    }
    schemeMeta.setAttribute('content', isDark ? 'dark' : 'light');

    root.style.colorScheme = isDark ? 'dark' : 'light';
    setColorSchemeCookie(colorScheme);
  }, [colorScheme]);

  return null;
}
