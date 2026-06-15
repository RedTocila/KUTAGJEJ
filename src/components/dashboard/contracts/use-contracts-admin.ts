'use client';

import * as React from 'react';

import type { Contract } from '@/types/contract';
import type { ListingCategory } from '@/types/listing-category';
import type { Role } from '@/types/role';
import { listContracts } from '@/lib/admin-contracts-client';
import { listCategoriesAdmin } from '@/lib/admin-categories-client';
import { listRoles } from '@/lib/admin-roles-client';

export function useContractsAdmin() {
  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [categories, setCategories] = React.useState<ListingCategory[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editContract, setEditContract] = React.useState<Contract | null>(null);
  const [deleteContractState, setDeleteContractState] = React.useState<Contract | null>(null);

  const refresh = React.useCallback(async () => {
    setLoadError(null);
    const [contractsRes, rolesRes, categoriesRes] = await Promise.all([
      listContracts(),
      listRoles(),
      listCategoriesAdmin(),
    ]);
    if (contractsRes.error) {
      setLoadError(contractsRes.error);
      setContracts([]);
    } else {
      setContracts(contractsRes.contracts ?? []);
    }
    if (!rolesRes.error) {
      setRoles(rolesRes.roles ?? []);
    }
    if (!categoriesRes.error) {
      setCategories(categoriesRes.categories ?? []);
    }
    setLoading(false);
  }, []);

  return {
    contracts,
    categories,
    roles,
    loadError,
    loading,
    createOpen,
    setCreateOpen,
    editContract,
    setEditContract,
    deleteContractState,
    setDeleteContractState,
    refresh,
  };
}
