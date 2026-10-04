'use client';

import { authHeaders, authHeadersAsync } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';
import { getNativePlatform, isNativeApp } from '@/lib/native-app';

const PUSH_TOKEN_KEY = 'kt-native-push-token';

function readNativePushToken(): string | null {
  try {
    return window.localStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function rememberNativePushToken(token: string): void {
  try {
    window.localStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch {
    // private mode / storage full — push still works for this session's sync
  }
}

/** Links this device to the logged-in user so messages and approvals arrive as push alerts. */
export async function syncNativePushToken(): Promise<void> {
  if (!isNativeApp()) return;
  const token = readNativePushToken();
  if (!token) return;
  try {
    await fetch(getApiUrl('/user-notifications/push-token'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify({ token, platform: getNativePlatform() }),
    });
  } catch {
    // retried on next launch / login
  }
}

/** Call before the session is cleared so the device stops receiving the old account's alerts. */
export function unlinkNativePushToken(): void {
  if (!isNativeApp()) return;
  const token = readNativePushToken();
  if (!token) return;
  void fetch(getApiUrl('/user-notifications/push-token'), {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ token }),
    keepalive: true,
  }).catch(() => {});
}
