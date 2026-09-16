import type { CapacitorConfig } from '@capacitor/core';

/**
 * Hybrid shell: native WebView loads the live Next.js site.
 * Bundled `www/` is only the offline / boot fallback.
 *
 * Dev against local Next: set CAP_SERVER_URL=http://YOUR_LAN_IP:3000
 */
const serverUrl = process.env.CAP_SERVER_URL || 'https://kutagjej.al';

const config: CapacitorConfig = {
  appId: 'al.kutagjej.app',
  appName: 'KuTaGjej',
  webDir: 'www',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    allowNavigation: ['kutagjej.al', 'www.kutagjej.al', '*.kutagjej.al', 'localhost', '127.0.0.1'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#5f9816',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#5f9816',
    },
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
};

export default config;
