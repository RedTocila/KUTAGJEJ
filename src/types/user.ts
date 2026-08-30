import type { UserRole } from '@/lib/permissions';

export type AccountType = 'admin' | 'managed' | 'business' | 'individual';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  /** From API after login /me — drives dashboard access and nav visibility. */
  accountType?: AccountType;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
  lastLogin?: string;
  /** Business portal (`accountType === 'business'`) */
  nipt?: string;
  businessName?: string;
  businessOwner?: string;
  businessCategory?: string;
  /** Optional; used for listings contact and profile. */
  phone?: string;
  /** Home / “based in” city — prefills listing forms. */
  basedCityId?: string | null;
  basedCityName?: string | null;
  /** Viewer's accent on shared / saved listing images (not shown to other users). */
  shareThemeColor?: string | null;
  /** Optional public social profile links shown on the member profile banner. */
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  /** Admin-approved account verification. */
  verified?: boolean;
  /** Whether the account profile is private. */
  isPrivate?: boolean;

  [key: string]: unknown;
}
