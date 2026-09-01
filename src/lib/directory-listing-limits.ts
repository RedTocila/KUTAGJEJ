/** Accounts allowed unlimited business + professional directory listings. */
const UNLIMITED_DIRECTORY_EMAILS = new Set(['redjan.t13@gmail.com']);

/** Same accounts — listing contact is phone / WhatsApp only (no in-app messages). */
const PHONE_ONLY_CONTACT_EMAILS = UNLIMITED_DIRECTORY_EMAILS;

function normalizeEmail(email: string | null | undefined): string {
  return String(email || '')
    .trim()
    .toLowerCase();
}

/** True when this account may create more than one business / professional listing. */
export function hasUnlimitedDirectoryListings(email: string | null | undefined): boolean {
  return UNLIMITED_DIRECTORY_EMAILS.has(normalizeEmail(email));
}

/** True when listings posted by this account must not offer in-app messaging. */
export function hasPhoneOnlyListingContact(email: string | null | undefined): boolean {
  return PHONE_ONLY_CONTACT_EMAILS.has(normalizeEmail(email));
}
