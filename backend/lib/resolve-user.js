'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { getProfileById, getProfileByEmail, mapProfile } = require('./profiles');
const { profileUpdateFromCamel } = require('./profile');

/**
 * Resolve profile from a Supabase access token (Authorization Bearer).
 */
async function resolveUserFromAccessToken(token) {
  if (!token) return null;
  const admin = getSupabaseAdmin();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData?.user?.id) return null;
  return getProfileById(authData.user.id);
}

function isUserInactive(user) {
  if (!user) return true;
  const model = user.constructor?.modelName;
  return (model === 'ManagedUser' || model === 'IndividualUser') && user.isActive === false;
}

const LAST_ACTIVE_INTERVAL_MS = 5 * 60 * 1000;

async function touchLastActive(user) {
  if (!user?.id) return;
  const last = user.lastActive ? new Date(user.lastActive).getTime() : 0;
  if (Date.now() - last < LAST_ACTIVE_INTERVAL_MS) return;
  const now = new Date().toISOString();
  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({ last_active: now, updated_at: now })
    .eq('id', user.id);
  if (!error) user.lastActive = now;
}

async function updateProfile(userId, camelFields) {
  const patch = profileUpdateFromCamel(camelFields);
  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return mapProfile(data);
}

module.exports = {
  resolveUserFromToken: resolveUserFromAccessToken,
  resolveUserFromAccessToken,
  getProfileById,
  getProfileByEmail,
  isUserInactive,
  touchLastActive,
  updateProfile,
  USER_MODELS: {},
};
