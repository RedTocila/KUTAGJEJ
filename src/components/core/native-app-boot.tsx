'use client';

import * as React from 'react';

import { isNativeApp, registerNativePush } from '@/lib/native-app';

/**
 * Boots native-only behaviors when the site runs inside the Capacitor shell.
 * Harmless on mobile/desktop browsers.
 */
export function NativeAppBoot(): null {
  React.useEffect(() => {
    if (!isNativeApp()) return;

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

      if (!cancelled) {
        const token = await registerNativePush();
        if (token) {
          // Token persistence / FCM wiring comes after Firebase project setup.
          console.info('[native] push token received');
        }
      }
    })();

    document.documentElement.dataset.nativeApp = '1';

    return () => {
      cancelled = true;
      delete document.documentElement.dataset.nativeApp;
      for (const fn of cleanups) fn();
    };
  }, []);

  return null;
}
