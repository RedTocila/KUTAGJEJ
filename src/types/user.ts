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

  [key: string]: unknown;
}
