import { clientFetch } from '@/lib/api-client';

/** Permanently delete the signed-in portal account (App Store compliance). */
export async function deleteOwnAccount(
  confirmPhrase: string
): Promise<{ ok?: boolean; error?: string; message?: string }> {
  const res = await clientFetch<{ ok?: boolean; message?: string }>('/account/delete', {
    method: 'POST',
    body: JSON.stringify({ confirmPhrase }),
  });
  if (!res.ok) {
    return { error: res.error || 'Fshirja e llogarisë dështoi.' };
  }
  return { ok: true, message: res.data?.message || 'Llogaria u fshi.' };
}
