'use strict';

/**
 * Keep serverless work alive after the HTTP response is sent (Vercel waitUntil).
 * Locally / non-Vercel: just runs the promise (caller may still await).
 */
function runAfterResponse(task) {
  const promise = Promise.resolve()
    .then(() => task())
    .catch((err) => {
      console.error('runAfterResponse:', err?.message || err);
    });

  if (process.env.VERCEL) {
    try {
      // Lazy require so local/dev without the package still works if install lagged.
      const { waitUntil } = require('@vercel/functions');
      if (typeof waitUntil === 'function') {
        waitUntil(promise);
      }
    } catch (err) {
      console.warn('waitUntil unavailable:', err?.message || err);
    }
  }

  return promise;
}

module.exports = { runAfterResponse };
