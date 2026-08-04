'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { wrapProfile, profileUpdateFromCamel, ACCOUNT_TO_MODEL } = require('./profile');

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

async function insertProfile(row) {
  const { data, error } = await getSupabaseAdmin().from('profiles').insert(row).select('*').single();
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
    boost_credits: patch.boost_credits ?? 0,
  });
}

module.exports = {
  mapProfile,
  getProfileById,
  getProfileByEmail,
  insertProfile,
  createProfileForAuthUser,
  camelizeRow,
  camelizeRows,
  modelNameFromAccount,
};
