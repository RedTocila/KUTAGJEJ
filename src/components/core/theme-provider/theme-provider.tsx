'use client';

import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { CssVarsProvider } from '@mui/material/styles';

import { createTheme } from '@/styles/theme/create-theme';

import EmotionCache from './emotion-cache';

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = createTheme();

  return (
    <EmotionCache options={{ key: 'mui' }}>
      <CssVarsProvider theme={theme} defaultMode="dark" modeStorageKey="kutagjej-color-scheme">
        <CssBaseline />
        {children}
      </CssVarsProvider>
    </EmotionCache>
  );
}
