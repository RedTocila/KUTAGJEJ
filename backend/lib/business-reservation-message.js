'use strict';

/** Must stay in sync with `src/lib/business-reservation-message.ts`. */
const BUSINESS_RESERVATION_MESSAGE_PREFIX = 'Kërkesë rezervimi';

function isReservationMessageBody(body) {
  return String(body || '').trimStart().startsWith(BUSINESS_RESERVATION_MESSAGE_PREFIX);
}

module.exports = {
  BUSINESS_RESERVATION_MESSAGE_PREFIX,
  isReservationMessageBody,
};
