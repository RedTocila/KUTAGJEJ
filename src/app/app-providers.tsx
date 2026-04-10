'use client';

import * as React from 'react';

import '@/styles/global.css';

import { UserProvider } from '@/contexts/user-context';
import { ThemeProvider } from '@/components/core/theme-provider/theme-provider';
import { AuthProvider } from '@/providers/auth-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UserProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </UserProvider>
    </AuthProvider>
  );
}
