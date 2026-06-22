// CORS middleware configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://kutagjej.al',
  'https://www.kutagjej.al',
  'https://ku-ta-gjej.vercel.app',
  'https://ku-ta-gjej-front.vercel.app',
  ...(process.env.CORS_EXTRA_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Preview deployments: only when explicitly enabled (default off in production).
  if (process.env.CORS_ALLOW_VERCEL_PREVIEWS === 'true' && origin.endsWith('.vercel.app')) {
    return true;
  }
  // Local dev: any port on localhost / 127.0.0.1 / *.test (e.g. Laragon)
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
    if (u.hostname.endsWith('.test')) return true;
  } catch {
    /* ignore */
  }
  return false;
}

const corsHandler = (req, res, next) => {
  const origin = req.headers.origin;

  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    if (isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(200).end();
    }
    return res.status(403).end();
  }

  // Handle regular requests
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
  }

  next();
};

module.exports = corsHandler;

