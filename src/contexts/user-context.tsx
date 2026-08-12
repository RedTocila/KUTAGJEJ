'use client';

import * as React from 'react';

import type { User } from '@/types/user';
import { authClient } from '@/lib/auth/client';
import { hasStoredAccessToken, readAuthItem, AUTH_USER_KEY } from '@/lib/auth/storage';

export interface UserContextValue {
  user: User | null;
  error: string | null;
  isLoading: boolean;
  checkSession: () => Promise<void>;
}

export const UserContext = React.createContext<UserContextValue | undefined>(undefined);

export interface UserProviderProps {
  children: React.ReactNode;
}

/**
 * User context provider
 * Manages authentication state and user data
 */
export function UserProvider({ children }: UserProviderProps) {
  // Always start with `user: null` so SSR and the first client render match.
  // Seeding from localStorage in useState() caused hydration mismatches that
  // broke App Router soft navigation (cards ending on the 404 page).
  const [state, setState] = React.useState<{ user: User | null; error: string | null; isLoading: boolean }>({
    user: null,
    error: null,
    isLoading: true,
  });

  const checkSession = React.useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await authClient.getUser();
      const hasToken = typeof window !== 'undefined' && hasStoredAccessToken();

      if (error && hasToken) {
        // Keep the existing session on transient API failures.
        setState((prev) => ({
          ...prev,
          error: null,
          isLoading: false,
          user: data ?? prev.user,
        }));
        return;
      }

      if (error) {
        console.error('[UserContext] Error:', error);
        setState((prev) => ({ ...prev, user: null, error: null, isLoading: false }));
        return;
      }

      setState((prev) => ({ ...prev, user: data ?? null, error: null, isLoading: false }));
    } catch (err) {
      console.error('[UserContext] Error:', err);
      setState((prev) => ({ ...prev, error: null, isLoading: false }));
    }
  }, []);

  React.useEffect(() => {
    // After mount, restore cached profile immediately, then refresh from API.
    try {
      const raw = readAuthItem(AUTH_USER_KEY);
      if (hasStoredAccessToken() && raw) {
        const cached = JSON.parse(raw) as User;
        setState((prev) => ({ ...prev, user: cached, error: null, isLoading: true }));
      }
    } catch {
      /* ignore corrupt cache */
    }
    void checkSession();
  }, [checkSession]);

  // Re-fetch profile when the tab is focused so balances (e.g. boost credits)
  // update after grants that happened outside this browser session.
  React.useEffect(() => {
    const onFocus = () => {
      void checkSession();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [checkSession]);

  return <UserContext.Provider value={{ ...state, checkSession }}>{children}</UserContext.Provider>;
}

export const UserConsumer = UserContext.Consumer;
