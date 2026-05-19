'use client';

import * as React from 'react';
import { CssBaseline } from '@mui/material';
import { CssVarsProvider } from '@mui/material/styles';

import {
  COLOR_SCHEME_STORAGE_KEY,
  DEFAULT_COLOR_SCHEME,
  type ColorScheme,
} from '@/lib/color-scheme';
import { createTheme } from '@/styles/theme/create-theme';

import EmotionCache from './emotion-cache';
import { ThemeColorMetaSync } from './theme-color-meta-sync';

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** From server cookie — must match `theme-color-boot.js` + `localStorage`. */
  initialColorScheme?: ColorScheme;
}

export function ThemeProvider({
  children,
  initialColorScheme = DEFAULT_COLOR_SCHEME,
}: ThemeProviderProps) {
  const theme = React.useMemo(() => createTheme(), []);

  return (
    <EmotionCache options={{ key: 'mui' }}>
      <CssVarsProvider
        theme={theme}
        defaultMode={initialColorScheme}
        modeStorageKey={COLOR_SCHEME_STORAGE_KEY}
      >
        <CssBaseline />
        <ThemeColorMetaSync />
        {children}
      </CssVarsProvider>
    </EmotionCache>
  );
}
