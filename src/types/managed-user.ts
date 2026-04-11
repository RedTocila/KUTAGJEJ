export interface ManagedUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  /** Catalog reference; use with `role` label. */
  roleId?: string | null;
  role: string;
  roleDescription?: string;
  isActive: boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string | null;
}
