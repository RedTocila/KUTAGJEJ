/**
 * Lightweight in-memory rate limiter for auth endpoints.
 * Resets per IP within a sliding window — no external deps required.
 */
function rateLimit({ windowMs = 60_000, max = 20, message = 'Shumë kërkesa. Provoni përsëri më vonë.' } = {}) {
  const buckets = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    let bucket = buckets.get(ip);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }

    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ message });
    }

    next();
  };
}

module.exports = rateLimit;
