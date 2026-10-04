'use client';

import * as React from 'react';

import { isNativeApp, registerNativePush } from '@/lib/native-app';
import { rememberNativePushToken, syncNativePushToken } from '@/lib/native-push-client';
import { useUser } from '@/hooks/use-user';

/** Same-origin path from a push payload; anything else falls back to home. */
function pushHref(data: unknown): string {
  const href = data && typeof data === 'object' ? (data as { href?: unknown }).href : null;
  return typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') ? href : '/';
}

function markNativeDocument(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.nativeApp = '1';
}

/**
 * Boots native-only behaviors when the site runs inside the Capacitor shell.
 * Harmless on mobile/desktop browsers.
 */
export function NativeAppBoot(): null {
  const { user } = useUser();
  const userId = user?.id ?? null;
  const [pushToken, setPushToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId || !pushToken) return;
    void syncNativePushToken();
  }, [userId, pushToken]);

  // Mark ASAP so CSS can hide browser SEO / footer before paint settles.
  React.useLayoutEffect(() => {
    if (!isNativeApp()) return;
    markNativeDocument();
  }, []);

  React.useEffect(() => {
    if (!isNativeApp()) return;

    markNativeDocument();

    let cancelled = false;
    const cleanups: Array<() => void> = [];

    void (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const back = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
            return;
          }
          void App.exitApp();
        });
        cleanups.push(() => {
          void back.remove();
        });

        const open = await App.addListener('appUrlOpen', ({ url }) => {
          try {
            const parsed = new URL(url);
            if (parsed.hostname === 'kutagjej.al' || parsed.hostname === 'www.kutagjej.al') {
              const next = `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
              if (window.location.pathname + window.location.search + window.location.hash !== next) {
                window.location.assign(parsed.toString());
              }
            }
          } catch {
            // ignore
          }
        });
        cleanups.push(() => {
          void open.remove();
        });
      } catch (err) {
        console.warn('[native] App listeners unavailable', err);
      }

      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
      } catch {
        // optional
      }

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
      } catch {
        // optional
      }

      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const tapped = await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
          const next = pushHref(notification?.data);
          if (window.location.pathname + window.location.search !== next) {
            window.location.assign(next);
          }
        });
        cleanups.push(() => {
          void tapped.remove();
        });
      } catch {
        // optional
      }

      if (!cancelled) {
        const token = await registerNativePush();
        if (token && !cancelled) {
          rememberNativePushToken(token);
          setPushToken(token);
        }
      }
    })();

    return () => {
      cancelled = true;
      delete document.documentElement.dataset.nativeApp;
      for (const fn of cleanups) fn();
    };
  }, []);

  return null;
}
