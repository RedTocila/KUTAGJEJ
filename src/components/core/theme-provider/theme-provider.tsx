'use client';

import * as React from 'react';
import { CssBaseline } from '@mui/material';
import { CssVarsProvider } from '@mui/material/styles';

import { createTheme } from '@/styles/theme/create-theme';

import EmotionCache from './emotion-cache';
import { ThemeColorMetaSync } from './theme-color-meta-sync';

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = createTheme();

  return (
    <EmotionCache options={{ key: 'mui' }}>
      <CssVarsProvider theme={theme} defaultMode="dark" modeStorageKey="kutagjej-color-scheme">
        <CssBaseline />
        <ThemeColorMetaSync />
        {children}
      </CssVarsProvider>
    </EmotionCache>
  );
}
