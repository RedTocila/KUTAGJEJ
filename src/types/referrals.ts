export interface ReferralUserBrief {
  id: string;
  model: 'IndividualUser' | 'BusinessUser';
  email: string;
  displayName: string;
  referralCode: string | null;
  boostCredits: number;
}

export interface ReferralSignupEntry {
  id: string;
  referredUser: ReferralUserBrief | null;
  creditsAwarded: number;
  referralCodeUsed: string;
  createdAt: string;
}

export interface ReferralNextTier {
  level: number;
  title: string;
  referralsRequired: number;
  boostCredits: number;
  remaining: number;
}

export interface MyReferralStats {
  code: string;
  link: string;
  referralCount: number;
  paidReferralCount: number;
  reviewCount: number;
  /** Aggregate star rating from received listing reviews (same pool as Trusted badge). */
  ratingAverage: number | null;
  boostCredits: number;
  tiersClaimed: number[];
  nextTier: ReferralNextTier | null;
  referredBy: ReferralUserBrief | null;
  referredUsers: ReferralSignupEntry[];
  loginStreakDays?: number;
  loginStreakDaysRequired?: number;
  loginStreakBoostCredits?: number;
  loginStreakCheckedInToday?: boolean;
  loginStreakAwarded?: boolean;
}

export interface AdminReferralOverview {
  totalSignups: number;
  totalCreditsAwarded: number;
  uniqueReferrers: number;
  usersReferred: number;
}

export interface AdminReferralSignupRow {
  id: string;
  referrer: ReferralUserBrief | null;
  referredUser: ReferralUserBrief | null;
  creditsAwarded: number;
  referralCodeUsed: string;
  createdAt: string;
}

export interface AdminReferralUserRow {
  id: string;
  accountKind: 'individual' | 'business';
  email: string;
  displayName: string;
  referralCode: string | null;
  referralLink: string | null;
  referralCount: number;
  boostCredits: number;
  referredBy: ReferralUserBrief | null;
  createdAt: string;
}
