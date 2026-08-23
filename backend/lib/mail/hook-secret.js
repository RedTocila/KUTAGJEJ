'use strict';

const crypto = require('crypto');

function hookSecret() {
  return String(
    process.env.SUPABASE_SEND_EMAIL_HOOK_SECRET || process.env.SEND_EMAIL_HOOK_SECRET || '',
  ).trim();
}

function standardWebhookKey(secret) {
  const raw = String(secret || '');
  const part = raw.includes('whsec_')
    ? raw.split(',').find((p) => p.includes('whsec_')) || raw
    : raw;
  const b64 = part.replace(/^whsec_/, '');
  try {
    return Buffer.from(b64, 'base64');
  } catch {
    return Buffer.from(b64);
  }
}

function verifyStandardWebhook(rawBody, headers, secret) {
  if (!secret) return false;
  const id = headers['webhook-id'] || headers['Webhook-Id'];
  const ts = headers['webhook-timestamp'] || headers['Webhook-Timestamp'];
  const sigHeader = headers['webhook-signature'] || headers['Webhook-Signature'] || '';
  if (!id || !ts || !sigHeader) return false;
  const key = standardWebhookKey(secret);
  const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${rawBody}`).digest('base64');
  return String(sigHeader)
    .split(' ')
    .some((piece) => {
      const value = piece.replace(/^v1[,=]/, '').replace(/^v1,/, '');
      const a = Buffer.from(value);
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    });
}

function verifySendEmailHook(req) {
  const secret = hookSecret();
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (secret && bearer && bearer === secret) return true;
  if (secret && req.rawBody) {
    return verifyStandardWebhook(String(req.rawBody), req.headers, secret);
  }
  // Allow unsigned only when no secret is configured (local wiring).
  return !secret;
}

module.exports = {
  hookSecret,
  verifySendEmailHook,
};
