import type { UserRole } from '@/lib/permissions';

export type AccountType = 'admin' | 'managed' | 'business';

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

  [key: string]: unknown;
}
