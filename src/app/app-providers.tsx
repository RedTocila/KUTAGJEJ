'use client';

import * as React from 'react';

import '@/styles/global.css';

import { LanguageProvider } from '@/contexts/language-context';
import { UserProvider } from '@/contexts/user-context';
import { SavedListingsProvider } from '@/contexts/saved-listings-context';
import { SoftNavigateBridge } from '@/components/core/soft-navigate-bridge';
import { SplashScreen } from '@/components/core/splash-screen';
import { SearchOverlayProvider } from '@/contexts/search-overlay-context';
import { MainTabsShell } from '@/components/main-tabs/main-tabs-shell';
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
        <LanguageProvider>
          <SavedListingsProvider>
            <ThemeProvider initialColorScheme={initialColorScheme}>
              <SplashScreen />
              <SearchOverlayProvider>
                <SoftNavigateBridge>
                  <MainTabsShell>{children}</MainTabsShell>
                </SoftNavigateBridge>
              </SearchOverlayProvider>
            </ThemeProvider>
          </SavedListingsProvider>
        </LanguageProvider>
      </UserProvider>
    </AuthProvider>
  );
}
