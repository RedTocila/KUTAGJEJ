'use strict';

const crypto = require('crypto');
const http2 = require('http2');

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');

const APNS_HOSTS = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
};

/** APNs auth tokens are valid for 1h; refresh a bit earlier. */
const JWT_TTL_MS = 50 * 60 * 1000;

let cachedJwt = null;

function apnsConfig() {
  const key = String(process.env.APNS_KEY_P8 || '').replace(/\\n/g, '\n').trim();
  const keyId = String(process.env.APNS_KEY_ID || '').trim();
  const teamId = String(process.env.APNS_TEAM_ID || '').trim();
  if (!key || !keyId || !teamId) return null;
  return {
    key,
    keyId,
    teamId,
    bundleId: String(process.env.APNS_BUNDLE_ID || 'al.kutagjej.app').trim(),
    env: String(process.env.APNS_ENV || 'production').trim() === 'sandbox' ? 'sandbox' : 'production',
  };
}

function isPushConfigured() {
  return apnsConfig() != null;
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function apnsJwt(cfg) {
  const now = Date.now();
  if (cachedJwt && cachedJwt.keyId === cfg.keyId && now - cachedJwt.issuedAt < JWT_TTL_MS) {
    return cachedJwt.token;
  }
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: cfg.keyId }));
  const claims = base64url(JSON.stringify({ iss: cfg.teamId, iat: Math.floor(now / 1000) }));
  const signature = crypto.sign('sha256', Buffer.from(`${header}.${claims}`), {
    key: cfg.key,
    dsaEncoding: 'ieee-p1363',
  });
  const token = `${header}.${claims}.${base64url(signature)}`;
  cachedJwt = { token, keyId: cfg.keyId, issuedAt: now };
  return token;
}

function sendToApns(host, cfg, deviceToken, payload) {
  return new Promise((resolve) => {
    let client;
    try {
      client = http2.connect(host);
    } catch (err) {
      resolve({ status: 0, reason: err?.message || 'connect failed' });
      return;
    }
    client.on('error', (err) => resolve({ status: 0, reason: err?.message || 'connection error' }));

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${apnsJwt(cfg)}`,
      'apns-topic': cfg.bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    });
    req.setTimeout(10000, () => req.close(http2.constants.NGHTTP2_CANCEL));

    let status = 0;
    let body = '';
    req.on('response', (headers) => {
      status = Number(headers[':status']) || 0;
    });
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('close', () => {
      client.close();
      let reason = '';
      try {
        reason = body ? JSON.parse(body).reason || '' : '';
      } catch {
        reason = body.slice(0, 120);
      }
      resolve({ status, reason });
    });
    req.on('error', (err) => {
      client.close();
      resolve({ status: 0, reason: err?.message || 'request error' });
    });
    req.end(JSON.stringify(payload));
  });
}

async function removePushToken(token, userId) {
  const value = String(token || '').trim();
  if (!value) return;
  let q = getSupabaseAdmin().from('push_device_tokens').delete().eq('token', value);
  if (userId) q = q.eq('user_id', String(userId));
  const { error } = await q;
  if (error && !/relation .* does not exist|Could not find the table/i.test(String(error.message || ''))) {
    throw error;
  }
}

async function registerPushToken({ userId, token, platform }) {
  const id = String(userId || '').trim();
  const value = String(token || '').trim();
  if (!isUuid(id) || !/^[A-Za-z0-9:_-]{32,512}$/.test(value)) {
    return { ok: false, status: 400, message: 'Invalid push token' };
  }
  const { error } = await getSupabaseAdmin()
    .from('push_device_tokens')
    .upsert(
      {
        token: value,
        user_id: id,
        platform: platform === 'android' ? 'android' : 'ios',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );
  if (error) throw error;
  return { ok: true };
}

/**
 * Sends an alert push to every iOS device of a user. No-op until APNS_* env vars are set.
 * Never throws — notification flows must keep working when push fails.
 */
async function sendPushToUser(userId, { title, body, href }) {
  try {
    const cfg = apnsConfig();
    const id = String(userId || '').trim();
    if (!cfg || !isUuid(id) || !title) return;

    const { data: rows, error } = await getSupabaseAdmin()
      .from('push_device_tokens')
      .select('token')
      .eq('user_id', id)
      .eq('platform', 'ios');
    if (error) {
      if (/relation .* does not exist|Could not find the table/i.test(String(error.message || ''))) return;
      throw error;
    }
    if (!rows?.length) return;

    const payload = {
      aps: {
        alert: { title: String(title).slice(0, 120), body: String(body || '').slice(0, 240) },
        sound: 'default',
      },
      href: href ? String(href).slice(0, 500) : '/',
    };

    const primary = APNS_HOSTS[cfg.env];
    const fallback = cfg.env === 'production' ? APNS_HOSTS.sandbox : APNS_HOSTS.production;

    await Promise.all(
      rows.map(async ({ token }) => {
        let result = await sendToApns(primary, cfg, token, payload);
        // Xcode debug builds get sandbox tokens; App Store / TestFlight builds get production ones.
        if (result.status === 400 && result.reason === 'BadDeviceToken') {
          result = await sendToApns(fallback, cfg, token, payload);
        }
        if (result.status === 410 || (result.status === 400 && result.reason === 'BadDeviceToken')) {
          await removePushToken(token);
        } else if (result.status !== 200) {
          console.warn('[push] APNs rejected:', result.status, result.reason);
        }
      }),
    );
  } catch (err) {
    console.warn('[push] sendPushToUser:', err?.message || err);
  }
}

module.exports = {
  isPushConfigured,
  registerPushToken,
  removePushToken,
  sendPushToUser,
};
