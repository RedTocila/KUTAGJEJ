'use strict';

const { createClient } = require('@supabase/supabase-js');

let _admin;

function requireEnv(name) {
  const v = String(process.env[name] || '').trim();
  if (!v) {
    throw new Error(`Missing ${name}. Set it in backend/.env (see backend/.env.example).`);
  }
  return v;
}

function createServiceClient() {
  const url = requireEnv('SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Service-role client — bypasses RLS. Use only on the Express server.
 * Never call auth.signIn* on this singleton (it would attach a user JWT and break RLS bypass).
 */
function getSupabaseAdmin() {
  if (_admin) return _admin;
  _admin = createServiceClient();
  return _admin;
}

/**
 * Fresh client for password sign-in only. Do not reuse getSupabaseAdmin() for signIn —
 * that pollutes the shared client session and subsequent DB calls fail under RLS.
 */
function createAuthPasswordClient() {
  return createServiceClient();
}

function isSupabaseConfigured() {
  return Boolean(
    String(process.env.SUPABASE_URL || '').trim() &&
      String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  );
}

/** Exact email match on auth.users (profiles.email can be missing/stale). */
async function findAuthUserByEmail(email) {
  const emailNorm = String(email || '').toLowerCase().trim();
  if (!emailNorm || !isSupabaseConfigured()) return null;
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(
      `${url}/auth/v1/admin/users?page=1&per_page=50&email=${encodeURIComponent(emailNorm)}`,
      {
        headers: { Authorization: `Bearer ${key}`, apikey: key },
        signal: controller.signal,
      },
    );
    const data = await res.json().catch(() => ({}));
    const users = Array.isArray(data?.users) ? data.users : [];
    return users.find((u) => String(u.email || '').toLowerCase() === emailNorm) || null;
  } catch (err) {
    console.error('findAuthUserByEmail:', err?.message || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  getSupabaseAdmin,
  createAuthPasswordClient,
  isSupabaseConfigured,
  findAuthUserByEmail,
};
