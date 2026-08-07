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
  /** Admin-approved account verification. */
  verified?: boolean;

  [key: string]: unknown;
}
