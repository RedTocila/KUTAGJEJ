'use client';

import * as React from 'react';

import type { User } from '@/types/user';
import { authClient } from '@/lib/auth/client';

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
  const [state, setState] = React.useState<{ user: User | null; error: string | null; isLoading: boolean }>(() => {
    if (typeof window === 'undefined') {
      return { user: null, error: null, isLoading: true };
    }
    // Seed from cache so navigating to messages never briefly looks logged-out.
    let cached: User | null = null;
    try {
      const raw = localStorage.getItem('user-data');
      const token = localStorage.getItem('custom-auth-token');
      if (token && raw) cached = JSON.parse(raw) as User;
    } catch {
      cached = null;
    }
    return { user: cached, error: null, isLoading: true };
  });

  const checkSession = React.useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await authClient.getUser();
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;

      if (error && token) {
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
    checkSession();
  }, [checkSession]);

  return <UserContext.Provider value={{ ...state, checkSession }}>{children}</UserContext.Provider>;
}

export const UserConsumer = UserContext.Consumer;
