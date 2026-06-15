'use client';

import * as React from 'react';
import { Alert, Box } from '@mui/material';

import { ContractDeleteDialog } from '@/components/dashboard/contracts/contract-delete-dialog';
import { ContractFormDialog } from '@/components/dashboard/contracts/contract-form-dialog';
import { ContractsPageHeader } from '@/components/dashboard/contracts/contracts-page-header';
import { ContractsRolesPrerequisite } from '@/components/dashboard/contracts/contracts-roles-prerequisite';
import { ContractsTable } from '@/components/dashboard/contracts/contracts-table';
import { useContractsAdmin } from '@/components/dashboard/contracts/use-contracts-admin';
import { usePlatformAdminGuard } from '@/hooks/use-platform-admin';

export function ContractsAdminPage() {
  const { user, isPlatformAdmin } = usePlatformAdminGuard();
  const {
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
  } = useContractsAdmin();

  React.useEffect(() => {
    if (!user || !isPlatformAdmin) return;
    void refresh();
  }, [user, isPlatformAdmin, refresh]);

  if (!user || !isPlatformAdmin) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <ContractsPageHeader
        loading={loading}
        contractCount={contracts.length}
        onCreate={() => setCreateOpen(true)}
      />

      {roles.length === 0 && !loading ? <ContractsRolesPrerequisite /> : null}

      {loadError ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {loadError}
        </Alert>
      ) : null}

      <ContractsTable
        contracts={contracts}
        loading={loading}
        onCreate={() => setCreateOpen(true)}
        onEdit={setEditContract}
        onDelete={setDeleteContractState}
      />

      <ContractFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        roles={roles}
        categories={categories}
        onSaved={async () => {
          setCreateOpen(false);
          await refresh();
        }}
      />

      <ContractFormDialog
        contract={editContract}
        onClose={() => setEditContract(null)}
        roles={roles}
        categories={categories}
        onSaved={async () => {
          setEditContract(null);
          await refresh();
        }}
      />

      <ContractDeleteDialog
        contract={deleteContractState}
        onClose={() => setDeleteContractState(null)}
        onDeleted={async () => {
          setDeleteContractState(null);
          await refresh();
        }}
      />
    </Box>
  );
}
