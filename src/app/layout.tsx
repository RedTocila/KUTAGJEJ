import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import Script from 'next/script';

import { brandLogoSrc, config } from '@/config';
import { DEFAULT_COLOR_SCHEME } from '@/lib/color-scheme';

import { AppProviders } from './app-providers';

const brandWordmarkFont = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-kutagjej-wordmark',
});

/**
 * Do not set `themeColor` here: Next injects `<meta name="theme-color">` nodes that React owns.
 * Our boot script + `ThemeColorMetaSync` update a single `#kutagjej-theme-color` tag in place.
 *
 * `theme-color-boot.js` (beforeInteractive) sets `.light` / `.dark` on `<html>`, theme-color meta,
 * and `color-scheme` from localStorage — no inline React scripts (React 19 safe).
 *
 * Avoid `cookies()` / other dynamic APIs here: Next.js 16.2 soft-nav can fail with
 * "router state header was sent but could not be parsed" when the root layout is dynamic.
 * Theme is applied before paint by the boot script + CssVarsProvider `modeStorageKey`.
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
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: brandLogoSrc, type: 'image/png', sizes: '1024x1024' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: brandLogoSrc,
  },
} satisfies Metadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sq-AL" className={`${DEFAULT_COLOR_SCHEME} ${brandWordmarkFont.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script src="/theme-color-boot.js" strategy="beforeInteractive" />
        <AppProviders initialColorScheme={DEFAULT_COLOR_SCHEME}>{children}</AppProviders>
      </body>
    </html>
  );
}
