/**
 * Minimal server-side client for the POK Payments REST API (https://docs.pokpay.io).
 *
 * Responsibilities kept on the server ONLY:
 *  - Authenticate with keyId / keySecret to obtain a short-lived access token (cached).
 *  - Create SDK orders (amount in MINOR units, e.g. 1000 = 10.00 EUR).
 *  - Fetch an order to confirm it was actually captured before we grant anything.
 *
 * Credentials must never reach the browser. The browser only ever receives an `orderId`.
 */

const PROD_BASE = 'https://api.pokpay.io';
const STAGING_BASE = 'https://api-staging.pokpay.io';

/** Statuses returned by POK that mean the money was actually taken. */
const PAID_STATUSES = new Set([
  'CAPTURED',
  'PAID',
  'COMPLETED',
  'COMPLETE',
  'SUCCESS',
  'SUCCEEDED',
  'CONFIRMED',
  'SETTLED',
]);

function getConfig() {
  const env = String(process.env.POK_ENV || 'production').trim().toLowerCase();
  const isStaging = env === 'staging' || env === 'sandbox' || env === 'test';
  return {
    env: isStaging ? 'staging' : 'production',
    baseUrl: isStaging ? STAGING_BASE : PROD_BASE,
    merchantId: String(process.env.POK_MERCHANT_ID || '').trim(),
    keyId: String(process.env.POK_KEY_ID || '').trim(),
    keySecret: String(process.env.POK_KEY_SECRET || '').trim(),
  };
}

function isConfigured() {
  const c = getConfig();
  return Boolean(c.merchantId && c.keyId && c.keySecret);
}

/** Small helper so error messages never leak secrets but stay useful in logs. */
async function pokFetch(url, options) {
  const res = await fetch(url, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const message =
      (body && (body.message || body.error)) || `POK request failed (${res.status})`;
    const err = new Error(message);
    err.statusCode = res.status;
    err.pokBody = body;
    throw err;
  }
  return body;
}

// --- Access token cache (module-scoped; fine for a single API instance) ---
let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken({ force = false } = {}) {
  const c = getConfig();
  if (!isConfigured()) {
    throw new Error('POK is not configured (POK_MERCHANT_ID / POK_KEY_ID / POK_KEY_SECRET).');
  }
  const now = Date.now();
  if (!force && cachedToken && now < cachedTokenExpiresAt - 30_000) {
    return cachedToken;
  }
  const body = await pokFetch(`${c.baseUrl}/auth/sdk/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyId: c.keyId, keySecret: c.keySecret }),
  });
  const data = body?.data || {};
  const token = data.accessToken;
  if (!token) throw new Error('POK login did not return an access token.');
  // expiresIn may be seconds or ms depending on env; be defensive.
  let ttlMs = 5 * 60 * 1000;
  const rawExpiresIn = Number(data.expiresIn);
  if (Number.isFinite(rawExpiresIn) && rawExpiresIn > 0) {
    ttlMs = rawExpiresIn > 100_000 ? rawExpiresIn : rawExpiresIn * 1000;
  }
  cachedToken = token;
  cachedTokenExpiresAt = now + ttlMs;
  return token;
}

/** Retry a token-authenticated call once on 401 (expired token). */
async function withAuth(run) {
  let token = await getAccessToken();
  try {
    return await run(token);
  } catch (err) {
    if (err && err.statusCode === 401) {
      token = await getAccessToken({ force: true });
      return await run(token);
    }
    throw err;
  }
}

/** Normalize the order object out of POK's response wrapper. */
function extractOrder(body) {
  const data = body?.data || body || {};
  return data.sdkOrder || data.order || data;
}

/**
 * Create an SDK order. `amountMinor` is an integer in minor units (cents).
 * Returns { id, raw }.
 */
async function createSdkOrder({
  amount: amountMajor,
  currencyCode = 'EUR',
  webhookUrl,
  redirectUrl,
}) {
  const c = getConfig();
  // NOTE: despite the doc's "minor units" wording, POK's live create-order
  // endpoint treats `amount` as MAJOR currency units (e.g. 45 = 45.00 EUR).
  // Sending cents caused "maximum amount of 1000 EUR per transaction was
  // exceeded" for a 45 EUR order (4500 read as 4500 EUR).
  const amount = Math.round(Number(amountMajor) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('createSdkOrder: amount must be a positive number (major units).');
  }
  // Only the fields POK's create-order endpoint accepts. Extra keys (e.g.
  // `reference`, `description`) are rejected with a validation error.
  const payload = {
    amount,
    currencyCode,
    autoCapture: true,
    shippingCost: 0,
  };
  if (webhookUrl) payload.webhookUrl = webhookUrl;
  if (redirectUrl) payload.redirectUrl = redirectUrl;

  const body = await withAuth((token) =>
    pokFetch(`${c.baseUrl}/merchants/${encodeURIComponent(c.merchantId)}/sdk-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }),
  );
  const order = extractOrder(body);
  const id = order?.id || order?._id || order?.sdkOrderId;
  if (!id) throw new Error('POK did not return an order id.');
  return { id: String(id), raw: order };
}

/** Fetch the current state of an SDK order. Returns { id, status, amount, capturedAmount, paid, raw }. */
async function getSdkOrder(orderId) {
  const c = getConfig();
  const id = String(orderId || '').trim();
  if (!id) throw new Error('getSdkOrder: orderId is required.');
  const body = await withAuth((token) =>
    pokFetch(`${c.baseUrl}/sdk-orders/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
  const order = extractOrder(body);
  const status = String(order?.status || order?.state || '').toUpperCase();
  const amount = Number(order?.amount);
  const capturedAmount = Number(order?.capturedAmount);
  const paidByStatus = PAID_STATUSES.has(status);
  const paidByAmount =
    Number.isFinite(capturedAmount) && Number.isFinite(amount) && amount > 0 && capturedAmount >= amount;
  return {
    id,
    status,
    amount: Number.isFinite(amount) ? amount : null,
    capturedAmount: Number.isFinite(capturedAmount) ? capturedAmount : null,
    paid: paidByStatus || paidByAmount,
    raw: order,
  };
}

module.exports = {
  getConfig,
  isConfigured,
  getAccessToken,
  createSdkOrder,
  getSdkOrder,
  PAID_STATUSES,
};
