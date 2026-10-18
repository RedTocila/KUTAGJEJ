/**
 * Capacitor / native-shell helpers for the live website.
 * Safe on web: all calls no-op or fall back when not running inside the app WebView.
 */

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function getCapacitor(): CapacitorBridge | null {
  if (typeof window === 'undefined') return null;
  return (window as Window & { Capacitor?: CapacitorBridge }).Capacitor ?? null;
}

export function isNativeApp(): boolean {
  try {
    return Boolean(getCapacitor()?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/** White status-bar icons on the dark theme, dark icons on the light theme. */
export async function syncNativeStatusBar(isDark: boolean): Promise<void> {
  if (!isNativeApp()) return;
  const { StatusBar, Style } = await import('@capacitor/status-bar');
  await StatusBar.setOverlaysWebView({ overlay: true });
  // Capacitor's Dark style is light text, for a dark page.
  await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
}

export function getNativePlatform(): 'ios' | 'android' | 'web' {
  if (!isNativeApp()) return 'web';
  const platform = String(getCapacitor()?.getPlatform?.() || '').toLowerCase();
  if (platform === 'ios' || platform === 'android') return platform;
  return 'web';
}

/** Lets the API skip Boost Coin charges for app users (the store build sells nothing). */
export function nativeAppHeaders(): Record<string, string> {
  if (!isNativeApp()) return {};
  const platform = getNativePlatform();
  return { 'X-KuTaGjej-App': platform === 'web' ? '1' : platform };
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const type = blob.type || 'image/jpeg';
  return new File([blob], filename, { type });
}

async function webPathToFile(path: string, filename: string): Promise<File> {
  const res = await fetch(path);
  const blob = await res.blob();
  const type = blob.type || 'image/jpeg';
  return new File([blob], filename, { type });
}

/**
 * Prefer native camera/gallery inside the Capacitor shell.
 * Returns null when not native or the user cancels — caller should fall back to `<input type="file">`.
 */
export async function pickNativeImages(opts: {
  limit?: number;
}): Promise<File[] | null> {
  if (!isNativeApp()) return null;

  const limit = Math.max(1, Math.min(20, opts.limit ?? 1));

  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

    if (limit > 1 && typeof (Camera as { pickImages?: unknown }).pickImages === 'function') {
      const result = await Camera.pickImages({
        quality: 85,
        limit,
      });
      const files: File[] = [];
      for (const [index, photo] of (result.photos || []).entries()) {
        if (!photo.webPath) continue;
        files.push(await webPathToFile(photo.webPath, `photo-${Date.now()}-${index}.jpg`));
      }
      return files.length ? files : null;
    }

    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      correctOrientation: true,
    });

    if (photo.dataUrl) {
      return [await dataUrlToFile(photo.dataUrl, `photo-${Date.now()}.jpg`)];
    }
    if (photo.webPath) {
      return [await webPathToFile(photo.webPath, `photo-${Date.now()}.jpg`)];
    }
    return null;
  } catch (err) {
    // User cancel is normal; other errors fall back to file input.
    const message = err instanceof Error ? err.message : String(err);
    if (/cancel|dismiss|user cancelled/i.test(message)) return [];
    console.warn('[native] camera unavailable, falling back to file input', err);
    return null;
  }
}

/** Native share sheet when available; returns false if caller should use web share/clipboard. */
export async function shareNative(opts: {
  title: string;
  text?: string;
  url: string;
}): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { Share } = await import('@capacitor/share');
    await Share.share({
      title: opts.title,
      text: opts.text || opts.title,
      url: opts.url,
      dialogTitle: opts.title,
    });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/cancel|dismiss|abort/i.test(message)) return true; // treated as handled (no web fallback spam)
    console.warn('[native] share unavailable', err);
    return false;
  }
}

export type NativePushPermission = 'granted' | 'denied' | 'prompt' | 'unavailable';

export type NativePushRegistration =
  | { status: 'token'; token: string }
  | { status: 'denied' }
  | { status: 'unavailable' }
  | { status: 'skipped' };

type PushListenerHandle = { remove: () => Promise<void> };

/** Reads the current permission. Does not prompt. */
export async function readNativePushPermission(): Promise<NativePushPermission> {
  if (!isNativeApp()) return 'unavailable';
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const current = await PushNotifications.checkPermissions();
    if (current.receive === 'granted') return 'granted';
    if (current.receive === 'denied') return 'denied';
    return 'prompt';
  } catch (err) {
    console.warn('[native] push permission unavailable', err);
    return 'unavailable';
  }
}

/**
 * Register for push when the plugin and APNs are configured.
 * Listeners are attached before `register()` and removed on token, error, timeout, or throw.
 * Permission is requested only when `requestPermission` is true.
 */
export async function registerNativePush(options?: {
  requestPermission?: boolean;
}): Promise<NativePushRegistration> {
  if (!isNativeApp()) return { status: 'skipped' };
  const handles: PushListenerHandle[] = [];
  let timeout = 0;
  const removeHandles = async () => {
    if (timeout) window.clearTimeout(timeout);
    timeout = 0;
    await Promise.all(handles.splice(0).map((handle) => handle.remove().catch(() => undefined)));
  };

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const current = await PushNotifications.checkPermissions();
    let receive = current.receive;
    if (receive !== 'granted') {
      if (!options?.requestPermission || receive === 'denied') {
        return receive === 'denied' ? { status: 'denied' } : { status: 'skipped' };
      }
      const next = await PushNotifications.requestPermissions();
      receive = next.receive;
      if (receive !== 'granted') return { status: 'denied' };
    }

    const token = await new Promise<string | null>((resolve) => {
      let settled = false;
      const finish = (value: string | null) => {
        if (settled) return;
        settled = true;
        void removeHandles().finally(() => resolve(value));
      };
      timeout = window.setTimeout(() => finish(null), 8000);
      void (async () => {
        try {
          handles.push(
            await PushNotifications.addListener('registration', (registered) => {
              finish(registered.value || null);
            }),
          );
          handles.push(
            await PushNotifications.addListener('registrationError', () => {
              finish(null);
            }),
          );
          await PushNotifications.register();
        } catch {
          finish(null);
        }
      })();
    });

    await removeHandles();
    if (!token) return { status: 'unavailable' };
    return { status: 'token', token };
  } catch (err) {
    await removeHandles();
    console.warn('[native] push registration skipped', err);
    return { status: 'unavailable' };
  }
}
