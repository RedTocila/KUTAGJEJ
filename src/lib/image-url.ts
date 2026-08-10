/** Browser-only preview URLs — must never be saved to the database. */
export function isEphemeralImageUrl(url: string | null | undefined): boolean {
  const u = String(url || '').trim();
  return /^blob:/i.test(u) || /^data:/i.test(u);
}

/** URL safe to persist on a listing (http(s) or site-relative). */
export function isPersistableImageUrl(url: string | null | undefined): boolean {
  const u = String(url || '').trim();
  if (!u || isEphemeralImageUrl(u)) return false;
  return /^https?:\/\//i.test(u) || u.startsWith('/');
}
