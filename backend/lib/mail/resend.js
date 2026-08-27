'use strict';

function resendApiKey() {
  return String(process.env.RESEND_API_KEY || '').trim();
}

function resendFrom() {
  return String(process.env.RESEND_FROM || 'KuTaGjej <noreply@kutagjej.al>').trim();
}

function isResendConfigured() {
  return Boolean(resendApiKey());
}

const RESEND_TIMEOUT_MS = 10_000;

async function sendResendEmail({ to, subject, html, replyTo }) {
  const key = resendApiKey();
  if (!key) {
    const err = new Error('RESEND_API_KEY is not set');
    err.code = 'RESEND_NOT_CONFIGURED';
    throw err;
  }
  const recipients = Array.isArray(to) ? to : [to];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);
  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFrom(),
        to: recipients.filter(Boolean),
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeout = new Error('Resend request timed out');
      timeout.code = 'RESEND_TIMEOUT';
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `Resend HTTP ${res.status}`);
    err.code = 'RESEND_FAILED';
    err.details = data;
    throw err;
  }
  return data;
}

module.exports = {
  isResendConfigured,
  sendResendEmail,
  resendFrom,
};
