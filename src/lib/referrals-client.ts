'use client';

import { clientFetch } from '@/lib/api-client';
import type { ReferralProgram } from '@/types/referral-program';
import type {
  AdminReferralOverview,
  AdminReferralSignupRow,
  AdminReferralUserRow,
  MyReferralStats,
  ReferralUserBrief,
} from '@/types/referrals';

export async function fetchMyReferralStats(): Promise<{
  referral?: MyReferralStats;
  program?: ReferralProgram;
  error?: string;
}> {
  const res = await clientFetch<{ referral: MyReferralStats; program: ReferralProgram }>('/referrals/me');
  if (!res.ok) return { error: res.error ?? 'Nuk u ngarkuan të dhënat e referimit.' };
  return { referral: res.data?.referral, program: res.data?.program };
}

export async function fetchAdminReferralOverview(): Promise<{ overview?: AdminReferralOverview; error?: string }> {
  const res = await clientFetch<{ overview: AdminReferralOverview }>('/admin/referrals/overview');
  if (!res.ok) return { error: res.error ?? 'Nuk u ngarkua përmbledhja.' };
  return { overview: res.data?.overview };
}

export async function fetchAdminReferralSignups(
  page = 1,
  limit = 30,
): Promise<{ signups?: AdminReferralSignupRow[]; total?: number; error?: string }> {
  const res = await clientFetch<{ signups: AdminReferralSignupRow[]; total: number }>(
    `/admin/referrals/signups?page=${page}&limit=${limit}`,
  );
  if (!res.ok) return { error: res.error ?? 'Nuk u ngarkuan regjistrimet.' };
  return { signups: res.data?.signups, total: res.data?.total };
}

export async function fetchAdminReferralUsers(
  page = 1,
  limit = 30,
  filter: 'all' | 'referrers' | 'referred' = 'all',
): Promise<{ users?: AdminReferralUserRow[]; total?: number; error?: string }> {
  const res = await clientFetch<{ users: AdminReferralUserRow[]; total: number }>(
    `/admin/referrals/users?page=${page}&limit=${limit}&filter=${filter}`,
  );
  if (!res.ok) return { error: res.error ?? 'Nuk u ngarkuan përdoruesit.' };
  return { users: res.data?.users, total: res.data?.total };
}

export async function fetchAdminReferralUserDetail(userId: string): Promise<{
  user?: AdminReferralUserRow & {
    tiersClaimed: number[];
    referredUsers: { id: string; user: ReferralUserBrief | null; creditsAwarded: number; createdAt: string }[];
  };
  error?: string;
}> {
  const res = await clientFetch<{ user: AdminReferralUserRow & { tiersClaimed: number[]; referredUsers: unknown[] } }>(
    `/admin/referrals/users/${userId}`,
  );
  if (!res.ok) return { error: res.error ?? 'Përdoruesi nuk u gjet.' };
  return { user: res.data?.user as never };
}
