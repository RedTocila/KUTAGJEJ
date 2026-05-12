import type { Metadata, Viewport } from 'next';
import * as React from 'react';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';

import { brandLogoSrc, config } from '@/config';

import { AppProviders } from './app-providers';

/**
 * Do not set `themeColor` here: Next injects `<meta name="theme-color">` nodes that React owns.
 * Our boot script + `ThemeColorMetaSync` update a single `#kutagjej-theme-color` tag in place.
 *
 * `InitColorSchemeScript` runs first and sets `.light` / `.dark` on `<html>` from localStorage
 * (`colorSchemeSelector: 'class'` in `create-theme.ts`).
 *
 * `theme-color-boot.js` runs next for `theme-color` + `color-scheme` without using inline React scripts.
 */
export const viewport = {
  width: 'device-width',
  initialScale: 1,
} satisfies Viewport;

export const metadata = {
  metadataBase: (() => {
    try {
      return new URL(config.site.url);
    } catch {
      return new URL('http://localhost:3000');
    }
  })(),
  title: {
    default: config.site.name,
    template: `%s | ${config.site.name}`,
  },
  description: config.site.description,
  icons: {
    icon: brandLogoSrc,
    apple: brandLogoSrc,
  },
} satisfies Metadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return React.createElement(
    'html',
    {
      lang: 'sq-AL',
      suppressHydrationWarning: true,
    },
    React.createElement(
      'head',
      null,
      React.createElement(InitColorSchemeScript, {
        attribute: 'class',
        defaultMode: 'dark',
        modeStorageKey: 'kutagjej-color-scheme',
      }),
      React.createElement('script', {
        src: '/theme-color-boot.js',
        suppressHydrationWarning: true,
      }),
    ),
    React.createElement('body', { suppressHydrationWarning: true }, React.createElement(AppProviders, null, children)),
  );
}
