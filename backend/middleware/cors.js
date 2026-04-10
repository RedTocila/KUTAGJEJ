// CORS middleware configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://ku-ta-gjej.vercel.app',
  'https://ku-ta-gjej-front.vercel.app',
];

const corsHandler = (req, res, next) => {
  const origin = req.headers.origin;

  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    if (!origin || allowedOrigins.includes(origin) || origin.includes('.vercel.app')) {
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
  if (!origin || allowedOrigins.includes(origin) || origin.includes('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
  }

  next();
};

module.exports = corsHandler;

