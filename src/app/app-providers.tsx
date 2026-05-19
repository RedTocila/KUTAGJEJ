'use client';

import * as React from 'react';

import '@/styles/global.css';

import { UserProvider } from '@/contexts/user-context';
import { ThemeProvider } from '@/components/core/theme-provider/theme-provider';
import type { ColorScheme } from '@/lib/color-scheme';
import { AuthProvider } from '@/providers/auth-provider';

export function AppProviders({
  children,
  initialColorScheme,
}: {
  children: React.ReactNode;
  initialColorScheme?: ColorScheme;
}) {
  return (
    <AuthProvider>
      <UserProvider>
        <ThemeProvider initialColorScheme={initialColorScheme}>{children}</ThemeProvider>
      </UserProvider>
    </AuthProvider>
  );
}
