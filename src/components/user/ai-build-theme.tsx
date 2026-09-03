'use client';

import * as React from 'react';
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';

import {
  AI_SEARCH_BLUE,
  AI_SEARCH_BLUE_HOVER,
  AI_SEARCH_BLUE_ON,
} from '@/lib/home-categories';

/** Light-mode AI panel fill — strong enough to read on the white page. */
export const AI_BUILD_PANEL_BG_LIGHT = '#ddd4f7';
/** Nested input / field surface on AI panels. */
export const AI_BUILD_INPUT_BG_LIGHT = '#ffffff';
/** Placeholder / muted copy on light AI surfaces. */
export const AI_BUILD_MUTED_TEXT_LIGHT = '#5a5378';

/**
 * Remaps MUI `primary` for AI Build. Panel fills use explicit hex in sx —
 * CssVarsProvider does not pick up nested palette.paper overrides.
 */
export function AiBuildTheme({ children }: { children: React.ReactNode }) {
  const outer = useTheme();
  const theme = React.useMemo(() => {
    const aiPrimary = {
      main: AI_SEARCH_BLUE_HOVER,
      light: AI_SEARCH_BLUE,
      dark: '#7C3AED',
      contrastText: AI_SEARCH_BLUE_ON,
    };
    return createTheme(outer, {
      palette: {
        primary: aiPrimary,
      },
    });
  }, [outer]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
