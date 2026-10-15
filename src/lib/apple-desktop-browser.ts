import { isNativeApp } from '@/lib/native-app';

/** Matches the theme `md` breakpoint — desktop layout, not a phone-width window. */
const DESKTOP_MQ = '(min-width: 900px)';

/**
 * macOS (or other Apple desktop) visitors in a normal browser.
 * Skips the native app, iPhone/iPad, and viewports below the desktop layout.
 */
export function isAppleDesktopBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  if (isNativeApp()) return false;
  if (!window.matchMedia(DESKTOP_MQ).matches) return false;

  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return false;

  const platform = navigator.platform || '';
  const uaPlatform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    '';
  const mac =
    /Mac/i.test(platform) || /Macintosh|Mac OS X/i.test(ua) || /macOS/i.test(uaPlatform);

  // iPadOS “desktop site” reports a Mac platform and has a touch screen.
  if (mac && navigator.maxTouchPoints > 1) return false;

  return mac;
}

/**
 * iPhone visitors in Safari, Chrome, Firefox, Edge, Opera, and in-app browsers.
 * Every iOS browser is WebKit and keeps “iPhone” in the user agent (Chrome adds
 * CriOS, Firefox FxiOS, Edge EdgiOS, Opera OPiOS). Skips the native app and iPad.
 */
export function isIphoneMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  if (isNativeApp()) return false;

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  if (/iPad|iPod/i.test(ua) || platform === 'iPad') return false;
  if (/iPhone/i.test(ua) || platform === 'iPhone') return true;
  // Engine tokens used when a browser shortens the device name but is still iOS.
  return /(?:CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)\//i.test(ua);
}
