'use strict';

/** Accounts allowed unlimited business + professional directory listings. */
const UNLIMITED_DIRECTORY_EMAILS = new Set(['redjan.t13@gmail.com']);

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

module.exports = {
  UNLIMITED_DIRECTORY_EMAILS,
  hasUnlimitedDirectoryListings,
};
