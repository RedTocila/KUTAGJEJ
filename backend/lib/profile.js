'use strict';

/**
 * Map a profiles row to a shape compatible with the old Mongoose user docs
 * (req.admin / formatUser / AuthGuard accountType checks).
 */
const ACCOUNT_TO_MODEL = {
  admin: 'Admin',
  managed: 'ManagedUser',
  individual: 'IndividualUser',
  business: 'BusinessUser',
};

const MODEL_TO_ACCOUNT = {
  Admin: 'admin',
  ManagedUser: 'managed',
  IndividualUser: 'individual',
  BusinessUser: 'business',
};

function wrapProfile(row) {
  if (!row) return null;
  const accountType = row.account_type;
  const modelName = ACCOUNT_TO_MODEL[accountType] || 'IndividualUser';

  const user = {
    id: row.id,
    _id: row.id,
    email: row.email,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    phone: row.phone || '',
    role: row.role || '',
    roleId: row.role_id || null,
    isActive: row.is_active !== false,
    nipt: row.nipt || '',
    businessName: row.business_name || '',
    businessOwner: row.business_owner || '',
    businessCategory: row.business_category || '',
    createdBy: row.created_by || null,
    jobsEmployerVerifiedAt: row.jobs_employer_verified_at || null,
    professionalsVerifiedAt: row.professionals_verified_at || null,
    referralCode: row.referral_code || null,
    referredById: row.referred_by_id || null,
    boostCredits: row.boost_credits ?? 0,
    autoRefreshSlots: row.auto_refresh_slots ?? 0,
    referralTiersClaimed: row.referral_tiers_claimed || [],
    dailyShareClaimedOn: row.daily_share_claimed_on || null,
    loginStreakDays: row.login_streak_days ?? 0,
    loginStreakLastDay: row.login_streak_last_day || null,
    avatarUrl: row.avatar_url || '',
    lastLogin: row.last_login || null,
    lastActive: row.last_active || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    accountType,
    constructor: { modelName },
  };

  return user;
}

function profileUpdateFromCamel(fields) {
  const out = { updated_at: new Date().toISOString() };
  const map = {
    email: 'email',
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    role: 'role',
    roleId: 'role_id',
    isActive: 'is_active',
    nipt: 'nipt',
    businessName: 'business_name',
    businessOwner: 'business_owner',
    businessCategory: 'business_category',
    createdBy: 'created_by',
    jobsEmployerVerifiedAt: 'jobs_employer_verified_at',
    professionalsVerifiedAt: 'professionals_verified_at',
    referralCode: 'referral_code',
    referredById: 'referred_by_id',
    boostCredits: 'boost_credits',
    autoRefreshSlots: 'auto_refresh_slots',
    referralTiersClaimed: 'referral_tiers_claimed',
    dailyShareClaimedOn: 'daily_share_claimed_on',
    loginStreakDays: 'login_streak_days',
    loginStreakLastDay: 'login_streak_last_day',
    avatarUrl: 'avatar_url',
    lastLogin: 'last_login',
    lastActive: 'last_active',
    accountType: 'account_type',
  };
  for (const [camel, snake] of Object.entries(map)) {
    if (fields[camel] !== undefined) out[snake] = fields[camel];
  }
  // Postgres UNIQUE treats '' as a value (NULLs are fine). Never persist blank unique keys.
  for (const key of ['nipt', 'referral_code']) {
    if (out[key] === '') out[key] = null;
  }
  if (out.avatar_url === '') out.avatar_url = null;
  return out;
}

module.exports = {
  ACCOUNT_TO_MODEL,
  MODEL_TO_ACCOUNT,
  wrapProfile,
  profileUpdateFromCamel,
};
