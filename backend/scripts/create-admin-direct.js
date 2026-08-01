'use strict';

/**
 * Create the first platform admin in Supabase Auth + profiles.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='secret' ADMIN_FIRST_NAME=Admin ADMIN_LAST_NAME=User \
 *     node scripts/create-admin-direct.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabase');
const { getProfileByEmail, insertProfile } = require('../lib/profiles');

async function main() {
  if (!isSupabaseConfigured()) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  }

  const email = String(process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = String(process.env.ADMIN_PASSWORD || '');
  const firstName = String(process.env.ADMIN_FIRST_NAME || 'Admin').trim();
  const lastName = String(process.env.ADMIN_LAST_NAME || 'User').trim();

  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD');
  }
  if (password.length < 6) {
    throw new Error('ADMIN_PASSWORD must be at least 6 characters');
  }

  const existing = await getProfileByEmail(email);
  if (existing) {
    console.log('Admin profile already exists:', existing.id, existing.email);
    return;
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { account_type: 'admin', first_name: firstName, last_name: lastName },
  });
  if (error) throw error;

  const profile = await insertProfile({
    id: data.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    account_type: 'admin',
    role: 'admin',
    is_active: true,
  });

  console.log('Created admin:', profile.id, profile.email);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
