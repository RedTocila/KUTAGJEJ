'use client';

import * as React from 'react';
import { Box } from '@mui/material';

/**
 * Renders SEO / marketing copy for crawlers in SSR HTML.
 * Hidden in the live UI (web + Capacitor) so the product chrome stays clean
 * for users and App Store screenshots.
 *
 * SSR always includes children so Googlebot indexes the HTML. Client hide is:
 * 1) CSS `[data-browser-seo] { display: none }` (instant), then
 * 2) unmount after hydration.
 */
export function BrowserSeoSection({
  children,
  component = 'section',
  sx,
  ...rest
}: {
  children: React.ReactNode;
  component?: React.ElementType;
  sx?: object;
} & React.ComponentPropsWithoutRef<'section'>) {
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    // Always unmount after hydration (native app or browser).
    setHidden(true);
  }, []);

  if (hidden) return null;

  return (
    <Box
      component={component}
      data-browser-seo=""
      sx={{
        display: 'block',
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}
