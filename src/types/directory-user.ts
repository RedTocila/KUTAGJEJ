import type { ManagedUser } from '@/types/managed-user';

export type DirectoryAccountKind = 'individual' | 'business' | 'support';

/** Row from GET /api/admin/users: portal users + staff, with display labels. */
export interface DirectoryUser extends ManagedUser {
  accountKind: DirectoryAccountKind;
  /** Individ / Biznes / Mbështetje */
  roleLabel: string;
  /** Role catalog name when `accountKind === 'support'` */
  staffRoleName: string | null;
  /** Only staff rows use create/edit/delete in this screen */
  manageable: boolean;
  businessName?: string | null;
  nipt?: string | null;
  idNumber?: string | null;
  verified?: boolean;
  verifiedAt?: string | null;
  phone?: string;
  businessOwner?: string | null;
  businessCategory?: string | null;
  basedCityId?: string | null;
  basedCityName?: string;
  avatarUrl?: string;
}
