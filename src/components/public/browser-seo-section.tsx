'use client';

import * as React from 'react';
import { Box } from '@mui/material';

import { isNativeApp } from '@/lib/native-app';

/**
 * Renders SEO / marketing copy for browsers and crawlers.
 * Hidden inside the Capacitor app shell (keeps the app chrome unchanged).
 *
 * SSR always includes children so Googlebot indexes the HTML. Native hide is:
 * 1) CSS via `html[data-native-app]` (instant), then
 * 2) unmount after hydration when `isNativeApp()` is true.
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
    if (isNativeApp()) setHidden(true);
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
