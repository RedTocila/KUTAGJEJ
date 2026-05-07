import type { Metadata, Viewport } from 'next';
import * as React from 'react';
import Script from 'next/script';

import { brandLogoSrc, config } from '@/config';

import { AppProviders } from './app-providers';

/**
 * Do not set `themeColor` here: Next injects `<meta name="theme-color">` nodes that React owns.
 * Our boot script + `ThemeColorMetaSync` update a single `#kutagjej-theme-color` tag in place.
 * Removing those framework-managed nodes caused React 19 / removeChild (parentNode null) crashes.
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

const THEME_COLOR_BOOT_SCRIPT = `(function(){
  try {
    var KEY = 'kutagjej-color-scheme';
    var dark = true;
    var raw = localStorage.getItem(KEY);
    if (raw != null) {
      var v = raw;
      try {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          if (typeof p.mode === 'string') v = p.mode;
          else if (typeof p.paletteMode === 'string') v = p.paletteMode;
        }
      } catch (e) {}
      if (v === 'light') dark = false;
      else if (v === 'dark') dark = true;
      else if (v === 'system')
        dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    var c = dark ? '#0a0a0a' : '#f7faf4';
    var id = 'kutagjej-theme-color';
    var m = document.getElementById(id);
    if (!m) {
      m = document.createElement('meta');
      m.id = id;
      m.setAttribute('name', 'theme-color');
      document.head.appendChild(m);
    }
    m.setAttribute('content', c);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Use createElement for document nodes so we do not depend on a possibly empty global
  // `JSX.IntrinsicElements` (some TS/editor setups omit `src/**/*.d.ts` from the program).
  return React.createElement(
    'html',
    {
      lang: 'sq-AL',
      // Boot script + ThemeColorMetaSync set color-scheme / theme-color from localStorage before hydrate.
      suppressHydrationWarning: true,
    },
    React.createElement(
      'body',
      null,
      React.createElement(Script, {
        id: 'theme-color-boot',
        strategy: 'beforeInteractive',
        dangerouslySetInnerHTML: { __html: THEME_COLOR_BOOT_SCRIPT },
      }),
      React.createElement(AppProviders, null, children),
    ),
  );
}
