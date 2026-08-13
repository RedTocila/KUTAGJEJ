/** Accounts allowed unlimited business + professional directory listings. */
const UNLIMITED_DIRECTORY_EMAILS = new Set(['redjan.t13@gmail.com']);

function normalizeEmail(email: string | null | undefined): string {
  return String(email || '')
    .trim()
    .toLowerCase();
}

/** True when this account may create more than one business / professional listing. */
export function hasUnlimitedDirectoryListings(email: string | null | undefined): boolean {
  return UNLIMITED_DIRECTORY_EMAILS.has(normalizeEmail(email));
}
