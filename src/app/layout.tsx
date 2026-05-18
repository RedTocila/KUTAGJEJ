import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

import { brandLogoSrc, config } from '@/config';

import { AppProviders } from './app-providers';

/**
 * Do not set `themeColor` here: Next injects `<meta name="theme-color">` nodes that React owns.
 * Our boot script + `ThemeColorMetaSync` update a single `#kutagjej-theme-color` tag in place.
 *
 * `theme-color-boot.js` (beforeInteractive) sets `.light` / `.dark` on `<html>`, theme-color meta,
 * and `color-scheme` from localStorage — no inline React scripts (React 19 safe).
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
  return (
    <html lang="sq-AL" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script src="/theme-color-boot.js" strategy="beforeInteractive" />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
