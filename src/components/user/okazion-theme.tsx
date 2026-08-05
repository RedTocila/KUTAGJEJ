'use client';

import * as React from 'react';
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';

import { OKAZION_RED, OKAZION_RED_DARK, OKAZION_RED_ON } from '@/lib/home-categories';

/**
 * Remaps MUI `primary` + `error` to OKAZION button crimson so CTAs stay
 * crimson (accents use `OKAZION_ACCENT` salmon separately) without touching AI Build.
 */
export function OkazionTheme({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const outer = useTheme();
  const theme = React.useMemo(() => {
    const okazion = {
      main: OKAZION_RED,
      light: '#F96A6E',
      dark: OKAZION_RED_DARK,
      contrastText: OKAZION_RED_ON,
    };
    return createTheme(outer, {
      palette: {
        primary: okazion,
        error: okazion,
      },
    });
  }, [outer]);

  if (!enabled) return <>{children}</>;
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
