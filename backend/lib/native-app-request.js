'use strict';

/** Header the website sends when it runs inside the Capacitor iOS/Android shell. */
const NATIVE_APP_HEADER = 'x-kutagjej-app';

/**
 * True when the request comes from the native app shell.
 * The App Store build sells nothing (Guideline 3.1.1), so Boost Coin actions are free there.
 */
function isNativeAppRequest(req) {
  const value = String(req?.get?.(NATIVE_APP_HEADER) || '').trim().toLowerCase();
  return value === 'ios' || value === 'android' || value === '1';
}

module.exports = { NATIVE_APP_HEADER, isNativeAppRequest };
