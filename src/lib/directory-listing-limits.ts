/** Accounts allowed unlimited business + professional directory listings. */
const UNLIMITED_DIRECTORY_EMAILS = new Set([
  'redjan.t13@gmail.com',
  'meisreve@gmail.com',
]);

/** Same accounts — listing contact is phone / WhatsApp only (no in-app messages). */
const PHONE_ONLY_CONTACT_EMAILS = UNLIMITED_DIRECTORY_EMAILS;

/**
 * Public profile shows marketplace (products) only — hide homes, cars, jobs,
 * businesses, and professionals.
 */
const MARKETPLACE_ONLY_PROFILE_EMAILS = new Set(['meisreve@gmail.com']);

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

/** True when the public profile should only expose marketplace listings. */
export function hasMarketplaceOnlyProfileListings(email: string | null | undefined): boolean {
  return MARKETPLACE_ONLY_PROFILE_EMAILS.has(normalizeEmail(email));
}
