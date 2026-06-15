'use client';

import * as React from 'react';

import '@/styles/global.css';

import { UserProvider } from '@/contexts/user-context';
import { SavedListingsProvider } from '@/contexts/saved-listings-context';
import { ThemeProvider } from '@/components/core/theme-provider/theme-provider';
import type { ColorScheme } from '@/lib/color-scheme';
import { AuthProvider } from '@/providers/auth-provider';
import { getVisitorId } from '@/lib/listing-metrics';

export function AppProviders({
  children,
  initialColorScheme,
}: {
  children: React.ReactNode;
  initialColorScheme?: ColorScheme;
}) {
  React.useEffect(() => {
    getVisitorId();
  }, []);

  return (
    <AuthProvider>
      <UserProvider>
        <SavedListingsProvider>
          <ThemeProvider initialColorScheme={initialColorScheme}>{children}</ThemeProvider>
        </SavedListingsProvider>
      </UserProvider>
    </AuthProvider>
  );
}
