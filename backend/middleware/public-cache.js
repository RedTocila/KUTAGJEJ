/** Sets CDN-friendly cache headers on public read responses. */
module.exports = function publicCache(maxAgeSeconds = 60) {
  return (_req, res, next) => {
    res.set('Cache-Control', `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`);
    next();
  };
};
