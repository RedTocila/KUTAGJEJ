import { getApiUrl } from '@/lib/api-config';

const DEFAULT_TIMEOUT_MS = 8000;
const DETAIL_TIMEOUT_MS = 8_000;

export type SafeJsonResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; data: null; status: number | null };

/**
 * Resilient JSON fetch for Server Components.
 * Distinguishes HTTP status (incl. 404) from network/timeout failures.
 */
export async function safeServerJsonResult<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<SafeJsonResult<T>> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const restInit: RequestInit = { ...(init ?? {}) };
  delete (restInit as { timeoutMs?: number }).timeoutMs;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const skipCache = restInit.cache === 'no-store';
    const res = await fetch(getApiUrl(path), {
      ...(skipCache ? {} : { next: { revalidate: 60 } }),
      ...restInit,
      signal: controller?.signal ?? restInit.signal,
    });
    if (!res.ok) return { ok: false, data: null, status: res.status };
    return { ok: true, data: (await res.json()) as T, status: res.status };
  } catch {
    return { ok: false, data: null, status: null };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Never throws; returns null on any failure (legacy callers). */
export async function safeServerJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  const result = await safeServerJsonResult<T>(path, init);
  return result.ok ? result.data : null;
}

export type PublicEntityLoadResult<T> = {
  data: T | null;
  /**
   * True when the API timed out, returned 5xx, or the network failed.
   * False when the entity is genuinely missing (HTTP 404) or loaded successfully.
   */
  unavailable: boolean;
};

/**
 * Load a public detail entity.
 * Retries once on HTTP 5xx (cold start). Timeouts are not retried.
 */
export async function loadPublicEntity<T>(
  path: string,
  pick: (payload: unknown) => T | null,
  init?: RequestInit & { timeoutMs?: number }
): Promise<PublicEntityLoadResult<T>> {
  const run = () =>
    safeServerJsonResult<unknown>(path, {
      timeoutMs: DETAIL_TIMEOUT_MS,
      ...init,
    });

  let result = await run();
  // Retry only transient HTTP 5xx (cold start). Timeouts already waited `timeoutMs`.
  if (!result.ok && result.status != null && result.status >= 500) {
    result = await run();
  }

  if (!result.ok) {
    if (result.status === 404) return { data: null, unavailable: false };
    return { data: null, unavailable: true };
  }

  const data = pick(result.data);
  return { data, unavailable: false };
}
