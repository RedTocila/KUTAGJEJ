export interface ContractRoleRef {
  id: string;
  name: string;
}

export interface Contract {
  id: string;
  title: string;
  content: string;
  roles: ContractRoleRef[];
  createdAt?: string;
  updatedAt?: string;
}
