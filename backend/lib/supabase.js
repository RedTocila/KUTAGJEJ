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

module.exports = {
  getSupabaseAdmin,
  createAuthPasswordClient,
  isSupabaseConfigured,
};
