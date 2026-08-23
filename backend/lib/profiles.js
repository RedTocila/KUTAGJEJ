'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { wrapProfile, profileUpdateFromCamel, ACCOUNT_TO_MODEL } = require('./profile');
const { NEW_ACCOUNT_BOOST_CREDITS } = require('./boost-credits');

function snakeToCamelKey(key) {
  return String(key).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Map a Postgres row (snake_case) to camelCase plain object. */
function camelizeRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamelKey(k)] = v;
  }
  if (out.id != null && out._id == null) out._id = out.id;
  return out;
}

function camelizeRows(rows) {
  return (rows || []).map(camelizeRow);
}

function modelNameFromAccount(accountType) {
  if (!accountType) return null;
  return ACCOUNT_TO_MODEL[accountType] || null;
}

function mapProfile(row) {
  const user = wrapProfile(row);
  if (!user) return null;

  user.save = async function saveProfile() {
    const patch = profileUpdateFromCamel({
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      role: this.role,
      roleId: this.roleId,
      isActive: this.isActive,
      nipt: this.nipt,
      businessName: this.businessName,
      businessOwner: this.businessOwner,
      businessCategory: this.businessCategory,
      basedCityId: this.basedCityId,
      basedCityName: this.basedCityName,
      shareThemeColor: this.shareThemeColor,
      createdBy: this.createdBy,
      jobsEmployerVerifiedAt: this.jobsEmployerVerifiedAt,
      professionalsVerifiedAt: this.professionalsVerifiedAt,
      referralCode: this.referralCode,
      referredById: this.referredById,
      boostCredits: this.boostCredits,
      autoRefreshSlots: this.autoRefreshSlots,
      referralTiersClaimed: this.referralTiersClaimed,
      dailyShareClaimedOn: this.dailyShareClaimedOn,
      loginStreakDays: this.loginStreakDays,
      loginStreakLastDay: this.loginStreakLastDay,
      avatarUrl: this.avatarUrl,
      lastLogin: this.lastLogin,
      lastActive: this.lastActive,
      accountType: this.accountType,
    });
    const { data, error } = await getSupabaseAdmin()
      .from('profiles')
      .update(patch)
      .eq('id', this.id)
      .select('*')
      .single();
    if (error) throw error;
    const next = mapProfile(data);
    Object.assign(this, next);
    this.save = saveProfile.bind(this);
    return this;
  };

  return user;
}

async function getProfileById(id) {
  if (!id) return null;
  const { data, error } = await getSupabaseAdmin().from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return mapProfile(data);
}

async function getProfileByEmail(email) {
  const emailNorm = String(email || '').toLowerCase().trim();
  if (!emailNorm) return null;
  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('*')
    .eq('email', emailNorm)
    .maybeSingle();
  if (error) throw error;
  return mapProfile(data);
}

function roleForAccountType(accountType) {
  if (accountType === 'admin') return 'admin';
  if (accountType === 'business') return 'business-user';
  if (accountType === 'managed') return 'managed-user';
  return 'individual-user';
}

/**
 * Rebuild a profiles row for an auth.users account that lost its profile
 * (e.g. after re-running the init migration which drops public.profiles).
 */
async function ensureProfileForAuthUser(authUser) {
  if (!authUser?.id) return null;
  const existing = await getProfileById(authUser.id);
  if (existing) return existing;

  const meta = authUser.user_metadata || {};
  const email = String(authUser.email || meta.email || '')
    .toLowerCase()
    .trim();
  if (!email) return null;

  let accountType = String(meta.account_type || '').toLowerCase().trim();
  if (!['admin', 'managed', 'individual', 'business'].includes(accountType)) {
    accountType = meta.business_name || meta.nipt ? 'business' : 'individual';
  }

  const firstName = String(meta.first_name || meta.firstName || '').trim();
  const lastName = String(meta.last_name || meta.lastName || '').trim();
  const businessName = String(meta.business_name || meta.businessName || '').trim();
  const businessOwner = String(meta.business_owner || meta.businessOwner || '').trim();
  const businessCategory = String(meta.business_category || meta.businessCategory || '').trim();
  const nipt = String(meta.nipt || '').trim() || null;
  const phone = String(meta.phone || '').trim().slice(0, 40);

  const row = {
    id: authUser.id,
    email,
    first_name: firstName || (businessName ? businessName.split(/\s+/)[0] : '') || email.split('@')[0],
    last_name: lastName,
    phone: phone || '',
    account_type: accountType,
    role: roleForAccountType(accountType),
    is_active: true,
    boost_credits: NEW_ACCOUNT_BOOST_CREDITS,
  };

  if (accountType === 'business') {
    row.business_name = businessName || null;
    row.business_owner = businessOwner || [firstName, lastName].filter(Boolean).join(' ') || null;
    row.business_category = businessCategory || null;
    row.nipt = nipt;
  }

  try {
    return await insertProfile(row);
  } catch (err) {
    // Race: another request may have inserted the same id/email.
    const again = await getProfileById(authUser.id);
    if (again) return again;
    throw err;
  }
}

/** Re-create profiles for every auth user that has no profiles row. */
async function backfillOrphanProfiles() {
  const sb = getSupabaseAdmin();
  let created = 0;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users || [];
    for (const authUser of users) {
      const existing = await getProfileById(authUser.id);
      if (existing) continue;
      await ensureProfileForAuthUser(authUser);
      created += 1;
      console.log('[profiles] Restored orphan profile for', authUser.email);
    }
    if (users.length < 200) break;
  }
  return created;
}

async function insertProfile(row) {
  const payload = { ...row };
  if (payload.boost_credits == null) {
    payload.boost_credits = NEW_ACCOUNT_BOOST_CREDITS;
  }
  const { data, error } = await getSupabaseAdmin().from('profiles').insert(payload).select('*').single();
  if (error) throw error;
  return mapProfile(data);
}

/** Insert a profiles row for an already-created auth.users id (admin/user creation). */
async function createProfileForAuthUser(userId, fields) {
  const patch = profileUpdateFromCamel({
    email: fields.email,
    firstName: fields.firstName,
    lastName: fields.lastName,
    phone: fields.phone,
    role: fields.role,
    roleId: fields.roleId,
    isActive: fields.isActive !== false,
    nipt: fields.nipt,
    businessName: fields.businessName,
    businessOwner: fields.businessOwner,
    businessCategory: fields.businessCategory,
    createdBy: fields.createdBy,
    referralCode: fields.referralCode,
    boostCredits: fields.boostCredits,
  });
  delete patch.updated_at;
  return insertProfile({
    id: userId,
    account_type: fields.accountType,
    email: fields.email,
    first_name: patch.first_name ?? '',
    last_name: patch.last_name ?? '',
    phone: patch.phone ?? '',
    role: patch.role ?? '',
    role_id: patch.role_id ?? null,
    is_active: patch.is_active !== false,
    nipt: patch.nipt ?? null,
    business_name: patch.business_name ?? null,
    business_owner: patch.business_owner ?? null,
    business_category: patch.business_category ?? null,
    created_by: patch.created_by ?? null,
    referral_code: patch.referral_code ?? null,
    boost_credits: patch.boost_credits ?? NEW_ACCOUNT_BOOST_CREDITS,
  });
}

module.exports = {
  mapProfile,
  getProfileById,
  getProfileByEmail,
  insertProfile,
  createProfileForAuthUser,
  ensureProfileForAuthUser,
  backfillOrphanProfiles,
  camelizeRow,
  camelizeRows,
  modelNameFromAccount,
};
