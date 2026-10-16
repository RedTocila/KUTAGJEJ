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
  const capturedRaw = readCapturedRaw(order);
  const currency = readOrderCurrency(order);
  return {
    id,
    status,
    currency,
    amount: Number.isFinite(amount) ? amount : null,
    capturedAmount: capturedRaw,
    // Status alone is not enough to grant. confirmAndApplyPayment also checks
    // captured amount and currency against the payment row.
    paid: PAID_STATUSES.has(status),
    raw: order,
  };
}

function readOrderCurrency(order) {
  const raw = order?.raw && typeof order.raw === 'object' ? order.raw : order || {};
  return String(raw.currencyCode || raw.currency || raw.currency_code || order?.currency || '')
    .trim()
    .toUpperCase();
}

/** Captured total from the provider payload. An explicit 0 is kept (not replaced by `amount`). */
function readCapturedRaw(order) {
  const raw = order?.raw && typeof order.raw === 'object' ? order.raw : order || {};
  const capturedKeys = ['capturedAmount', 'captured_amount', 'amountCaptured'];
  for (const key of capturedKeys) {
    if (raw[key] != null && raw[key] !== '') {
      const n = Number(raw[key]);
      if (Number.isFinite(n)) return n;
    }
  }
  if (raw.finalAmount != null && raw.finalAmount !== '') {
    const finalAmount = Number(raw.finalAmount);
    if (Number.isFinite(finalAmount)) return finalAmount;
  }
  const amount = Number(raw.amount ?? order?.amount);
  return Number.isFinite(amount) ? amount : null;
}

function expectedPaymentCents(payment) {
  const minor = Number(payment?.amountMinor ?? payment?.amount_minor);
  if (Number.isFinite(minor) && minor > 0) return Math.round(minor);
  const major = Number(payment?.amount);
  if (Number.isFinite(major) && major > 0) return Math.round(major * 100);
  return null;
}

/**
 * POK's live create-order API takes MAJOR units (45 = 45.00 EUR). Fetches of the
 * same order usually echo that. Some payloads send integer minor units (4500).
 * Fractional values are always major. Integers use major when that lands on the
 * expected cents, otherwise minor when the integer itself is the expected cents.
 */
function centsFromProviderAmount(value, expectedCents) {
  if (!Number.isFinite(value) || !Number.isFinite(expectedCents)) return null;
  const asMajor = Math.round(value * 100);
  const fractional = Math.abs(value - Math.trunc(value)) > 1e-8;
  if (fractional) return asMajor;
  if (Math.abs(asMajor - expectedCents) <= 1) return asMajor;
  const asMinor = Math.round(value);
  if (Math.abs(asMinor - expectedCents) <= 1) return asMinor;
  return asMajor;
}

/**
 * Authoritative check before any entitlement is granted.
 * Requires a captured/paid status, the same currency, and a captured total
 * within 1 cent of the payment row.
 */
function pokCaptureMatchesPayment(payment, order) {
  const status = String(order?.status || order?.raw?.status || order?.raw?.state || '').toUpperCase();
  if (!PAID_STATUSES.has(status)) {
    return { ok: false, reason: 'status', status };
  }
  const currency = readOrderCurrency(order);
  const expectedCurrency = String(payment?.currency || '').trim().toUpperCase();
  if (!currency || !expectedCurrency || currency !== expectedCurrency) {
    return { ok: false, reason: 'currency', currency, expectedCurrency };
  }
  const expected = expectedPaymentCents(payment);
  const capturedRaw = readCapturedRaw(order);
  const capturedCents = centsFromProviderAmount(capturedRaw, expected);
  if (expected == null || capturedCents == null || Math.abs(capturedCents - expected) > 1) {
    return {
      ok: false,
      reason: 'amount',
      expectedCents: expected,
      capturedCents,
      capturedRaw,
    };
  }
  return { ok: true, expectedCents: expected, capturedCents, currency };
}

module.exports = {
  getConfig,
  isConfigured,
  getAccessToken,
  createSdkOrder,
  getSdkOrder,
  PAID_STATUSES,
  pokCaptureMatchesPayment,
  expectedPaymentCents,
  centsFromProviderAmount,
};
