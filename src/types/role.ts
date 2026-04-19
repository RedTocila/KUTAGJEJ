export interface Role {
  id: string;
  name: string;
  description: string;
  /** Platform main roles: Individual, Biznes — seeded by the server; name cannot be changed or deleted. */
  isCore?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
