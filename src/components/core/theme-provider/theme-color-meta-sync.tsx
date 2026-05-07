'use client';

import * as React from 'react';
import { useColorScheme } from '@mui/material/styles';

/** Matches `color-schemes.ts` background.default for each mode. */
const THEME_COLOR_LIGHT = '#f7faf4';
const THEME_COLOR_DARK = '#0a0a0a';

const THEME_COLOR_META_ID = 'kutagjej-theme-color';

/**
 * Keeps Safari / Chrome mobile UI (status bar, overscroll) aligned with the **app** theme from MUI,
 * not only `prefers-color-scheme`. Uses one stable `#kutagjej-theme-color` tag (also set in layout boot
 * script). Never `remove()` Next/React-managed `<meta name="theme-color">` — that breaks reconciliation.
 */
export function ThemeColorMetaSync() {
  const { mode, systemMode } = useColorScheme();

  const appliedMode = React.useMemo(() => {
    if (mode === 'system') return systemMode ?? 'light';
    return mode ?? 'light';
  }, [mode, systemMode]);

  React.useLayoutEffect(() => {
    const isDark = appliedMode === 'dark';
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

    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [appliedMode]);

  return null;
}
