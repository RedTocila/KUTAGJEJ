'use strict';

const { getProfileById } = require('./profiles');

/** Accounts allowed unlimited business + professional directory listings. */
const UNLIMITED_DIRECTORY_EMAILS = new Set(['redjan.t13@gmail.com']);

/** Same accounts — listing contact is phone / WhatsApp only (no in-app messages). */
const PHONE_ONLY_CONTACT_EMAILS = UNLIMITED_DIRECTORY_EMAILS;

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

/** True when this account may create more than one business / professional listing. */
function hasUnlimitedDirectoryListings(userOrEmail) {
  const email =
    typeof userOrEmail === 'string' ? userOrEmail : userOrEmail?.email;
  return UNLIMITED_DIRECTORY_EMAILS.has(normalizeEmail(email));
}

/** True when listings posted by this account must not offer in-app messaging. */
function hasPhoneOnlyListingContact(userOrEmail) {
  const email =
    typeof userOrEmail === 'string' ? userOrEmail : userOrEmail?.email;
  return PHONE_ONLY_CONTACT_EMAILS.has(normalizeEmail(email));
}

/** Resolve phone-only contact from a poster profile id. */
async function phoneOnlyContactForPosterId(posterId) {
  const id = String(posterId || '').trim();
  if (!id) return false;
  const profile = await getProfileById(id);
  return hasPhoneOnlyListingContact(profile?.email);
}

module.exports = {
  UNLIMITED_DIRECTORY_EMAILS,
  PHONE_ONLY_CONTACT_EMAILS,
  hasUnlimitedDirectoryListings,
  hasPhoneOnlyListingContact,
  phoneOnlyContactForPosterId,
};
