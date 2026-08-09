/** Sets CDN-friendly cache headers on public read responses. */
module.exports = function publicCache(maxAgeSeconds = 60) {
  return (_req, res, next) => {
    // Avoid long stale-while-revalidate windows — they made announcements/reviews
    // linger 1–2+ minutes after writes. Keep a short fresh window only.
    const ttl = Math.max(0, Number(maxAgeSeconds) || 0);
    if (ttl <= 0) {
      res.set('Cache-Control', 'private, no-store');
    } else {
      res.set('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=${Math.min(ttl, 15)}`);
    }
    next();
  };
};

/** Force uncached responses (listing detail, post-write freshness). */
module.exports.publicNoStore = function publicNoStore() {
  return (_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  };
};
