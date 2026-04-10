import type { UserRole } from '@/lib/permissions';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
  lastLogin?: string;

  [key: string]: unknown;
}
