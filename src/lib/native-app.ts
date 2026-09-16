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

export function getNativePlatform(): 'ios' | 'android' | 'web' {
  if (!isNativeApp()) return 'web';
  const platform = String(getCapacitor()?.getPlatform?.() || '').toLowerCase();
  if (platform === 'ios' || platform === 'android') return platform;
  return 'web';
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

/** Register for push when native + plugin configured. No-ops on web / missing Firebase. */
export async function registerNativePush(): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return null;
    await PushNotifications.register();

    return await new Promise((resolve) => {
      const timeout = window.setTimeout(() => resolve(null), 8000);
      void PushNotifications.addListener('registration', (token) => {
        window.clearTimeout(timeout);
        resolve(token.value || null);
      });
      void PushNotifications.addListener('registrationError', () => {
        window.clearTimeout(timeout);
        resolve(null);
      });
    });
  } catch (err) {
    console.warn('[native] push registration skipped', err);
    return null;
  }
}
