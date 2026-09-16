/**
 * Native shell helpers for the Capacitor WebView.
 * The live site can detect Capacitor via window.Capacitor and call these later.
 */
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

async function boot(): Promise<void> {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    // Web / unsupported platform
  }

  try {
    await SplashScreen.hide();
  } catch {
    // ignore
  }

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  App.addListener('appUrlOpen', ({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'kutagjej.al' || parsed.hostname === 'www.kutagjej.al') {
        window.location.href = parsed.toString();
      }
    } catch {
      // ignore malformed deep links
    }
  });

  Network.addListener('networkStatusChange', (status) => {
    if (!status.connected && !window.location.hostname.includes('kutagjej')) {
      window.location.href = '/index.html';
    }
  });
}

void boot();
