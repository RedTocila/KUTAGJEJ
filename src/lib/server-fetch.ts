import { getApiUrl } from '@/lib/api-config';

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Resilient JSON fetch for Server Components.
 * - Short timeout so a stalled API never blocks SSR forever (8s).
 * - ISR-aligned cache (60s) to reduce DB load.
 * - Never throws; returns null on failure.
 */
export async function safeServerJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS) : null;
  try {
    const skipCache = init?.cache === 'no-store';
    const res = await fetch(getApiUrl(path), {
      ...(skipCache ? {} : { next: { revalidate: 60 } }),
      ...init,
      signal: controller?.signal ?? init?.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
