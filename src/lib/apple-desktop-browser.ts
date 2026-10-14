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
