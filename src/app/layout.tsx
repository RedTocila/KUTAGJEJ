import type { Metadata, Viewport } from 'next';
import * as React from 'react';

import { brandLogoSrc, config } from '@/config';

import { AppProviders } from './app-providers';

export const viewport = { width: 'device-width', initialScale: 1 } satisfies Viewport;

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
  // Use createElement for document nodes so we do not depend on a possibly empty global
  // `JSX.IntrinsicElements` (some TS/editor setups omit `src/**/*.d.ts` from the program).
  return React.createElement(
    'html',
    { lang: 'sq-AL' },
    React.createElement('body', null, React.createElement(AppProviders, null, children)),
  );
}
