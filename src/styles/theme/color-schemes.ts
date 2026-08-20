import type { ColorSystemOptions } from '@mui/material/styles';

import {
  california,
  iAgentGold,
  kepple,
  neonBlue,
  neutralInk,
  redOrange,
  shakespeare,
  stormGrey,
} from './colors';
import type { ColorScheme } from './types';

export const colorSchemes = {
  dark: {
    palette: {
      action: { disabledBackground: 'rgba(0, 0, 0, 0.2)' },
      background: {
        default: 'var(--mui-palette-neutral-950)',
        defaultChannel: '10 10 10',
        paper: 'var(--mui-palette-neutral-900)',
        paperChannel: '23 23 23',
        level1: 'var(--mui-palette-neutral-800)',
        level2: 'var(--mui-palette-neutral-700)',
        level3: 'var(--mui-palette-neutral-600)',
      },
      common: { black: '#000000', white: '#ffffff' },
      divider: 'var(--mui-palette-neutral-700)',
      dividerChannel: '64 64 64',
      error: {
        ...redOrange,
        light: redOrange[300],
        main: redOrange[400],
        dark: redOrange[500],
        contrastText: 'var(--mui-palette-common-black)',
      },
      info: {
        ...shakespeare,
        light: shakespeare[300],
        main: shakespeare[400],
        dark: shakespeare[500],
        contrastText: 'var(--mui-palette-common-black)',
      },
      neutral: { ...neutralInk },
      primary: {
        ...iAgentGold,
        light: iAgentGold[300],
        main: iAgentGold[500],
        dark: iAgentGold[800],
        contrastText: 'var(--mui-palette-common-black)',
      },
      secondary: {
        ...neonBlue,
        light: neonBlue[300],
        main: neonBlue[500],
        dark: neonBlue[700],
        contrastText: 'var(--mui-palette-common-white)',
      },
      success: {
        ...kepple,
        light: kepple[300],
        main: kepple[400],
        dark: kepple[600],
        contrastText: 'var(--mui-palette-common-black)',
      },
      text: {
        primary: 'var(--mui-palette-neutral-50)',
        primaryChannel: '250 250 250',
        secondary: 'var(--mui-palette-neutral-300)',
        secondaryChannel: '212 212 212',
        disabled: 'var(--mui-palette-neutral-600)',
      },
      warning: {
        ...california,
        light: california[300],
        main: california[400],
        dark: california[500],
        contrastText: 'var(--mui-palette-common-black)',
      },
    },
  },
  light: {
    palette: {
      action: { disabledBackground: 'rgba(43, 84, 10, 0.08)' },
      background: {
        default: '#ffffff',
        defaultChannel: '255 255 255',
        paper: '#f2f6ec',
        paperChannel: '242 246 236',
        level1: 'var(--mui-palette-neutral-50)',
        level2: 'var(--mui-palette-neutral-100)',
        level3: 'var(--mui-palette-neutral-200)',
      },
      common: { black: '#000000', white: '#ffffff' },
      // Stronger sage border so cards / inputs read clearly on the white page.
      divider: 'var(--mui-palette-neutral-300)',
      dividerChannel: '163 188 143',
      error: {
        ...redOrange,
        light: redOrange[400],
        main: redOrange[500],
        dark: redOrange[600],
        contrastText: 'var(--mui-palette-common-white)',
      },
      info: {
        ...shakespeare,
        light: shakespeare[400],
        main: shakespeare[500],
        dark: shakespeare[600],
        contrastText: 'var(--mui-palette-common-white)',
      },
      neutral: { ...stormGrey },
      primary: {
        ...iAgentGold,
        // Punchier brand green on light surfaces (was 600 / washed on white).
        light: iAgentGold[500],
        main: iAgentGold[700],
        dark: iAgentGold[800],
        contrastText: 'var(--mui-palette-common-white)',
      },
      secondary: {
        ...neonBlue,
        light: neonBlue[400],
        main: neonBlue[600],
        dark: neonBlue[800],
        contrastText: 'var(--mui-palette-common-white)',
      },
      success: {
        ...kepple,
        light: kepple[400],
        main: kepple[600],
        dark: kepple[700],
        contrastText: 'var(--mui-palette-common-white)',
      },
      text: {
        primary: 'var(--mui-palette-neutral-900)',
        primaryChannel: '20 26 17',
        secondary: 'var(--mui-palette-neutral-700)',
        secondaryChannel: '50 64 41',
        disabled: 'var(--mui-palette-neutral-400)',
      },
      warning: {
        ...california,
        light: california[400],
        main: california[500],
        dark: california[600],
        contrastText: 'var(--mui-palette-common-white)',
      },
    },
  },
} as unknown as Partial<Record<ColorScheme, ColorSystemOptions>>;
