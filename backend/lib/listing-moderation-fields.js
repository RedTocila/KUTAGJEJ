'use strict';

/** Shared moderation status values for all public listing tables. */
const LISTING_STATUSES = ['pending', 'approved', 'rejected'];

/** FilterSpec fragment: only approved listings are publicly visible. */
const PUBLIC_LISTING_STATUS_FILTER = { eq: { status: 'approved' } };

module.exports = {
  LISTING_STATUSES,
  PUBLIC_LISTING_STATUS_FILTER,
};
