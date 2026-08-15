import { unstable_noStore as noStore } from 'next/cache';

/** Failed public listing fetches must not be pinned by ISR as a fake empty page. */
export function skipIsrOnFailedBrowse(ok: boolean): void {
  if (!ok) noStore();
}
