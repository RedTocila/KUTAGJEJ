'use client';

import * as React from 'react';
import { Alert, Box, Tab, Tabs } from '@mui/material';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';

import { AddonPackagesAdminSection } from '@/components/dashboard/addon-packages/addon-packages-admin-section';
import { ContractDeleteDialog } from '@/components/dashboard/contracts/contract-delete-dialog';
import { ContractFormDialog } from '@/components/dashboard/contracts/contract-form-dialog';
import { ContractsPageHeader } from '@/components/dashboard/contracts/contracts-page-header';
import { ContractsRolesPrerequisite } from '@/components/dashboard/contracts/contracts-roles-prerequisite';
import { ContractsTable } from '@/components/dashboard/contracts/contracts-table';
import { useContractsAdmin } from '@/components/dashboard/contracts/use-contracts-admin';
import { usePlatformAdminGuard } from '@/hooks/use-platform-admin';
import { MOTION } from '@/styles/motion';
import { productPanelSx } from '@/styles/product-sx';
import type { ContractPlanCode } from '@/types/contract';

type PackagesTab = 'main' | 'extra';

const PLATFORM_PLAN_CODES = new Set<ContractPlanCode>(['free', 'starter', 'grow', 'elite']);

function isPlatformMainPackage(c: { planCode: ContractPlanCode | null }): boolean {
  return Boolean(c.planCode && PLATFORM_PLAN_CODES.has(c.planCode));
}

export function ContractsAdminPage() {
  const { user, isPlatformAdmin } = usePlatformAdminGuard();
  const [tab, setTab] = React.useState<PackagesTab>('main');
  const {
    contracts,
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

  const platformContracts = React.useMemo(
    () => contracts.filter(isPlatformMainPackage),
    [contracts],
  );

  React.useEffect(() => {
    if (!user || !isPlatformAdmin) return;
    void refresh();
  }, [user, isPlatformAdmin, refresh]);

  if (!user || !isPlatformAdmin) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <ContractsPageHeader
        loading={loading}
        contractCount={platformContracts.length}
        onCreate={() => setCreateOpen(true)}
        showCreate={tab === 'main'}
      />

      <Box sx={{ ...productPanelSx, px: { xs: 1, sm: 1.5 }, pt: 1 }}>
        <Tabs
          value={tab}
          onChange={(_e, value: PackagesTab) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              minHeight: 48,
              transition: `color ${MOTION.fast} ${MOTION.ease}`,
            },
          }}
        >
          <Tab
            value="main"
            icon={React.createElement(PackageIcon, { size: 18 })}
            iconPosition="start"
            label="Paketat kryesore"
          />
          <Tab
            value="extra"
            icon={React.createElement(SquaresFourIcon, { size: 18 })}
            iconPosition="start"
            label="Paketat shtesë"
          />
        </Tabs>
      </Box>

      {tab === 'main' ? (
        <>
          {roles.length === 0 && !loading ? <ContractsRolesPrerequisite /> : null}

          {loadError ? (
            <Alert severity="error" sx={{ borderRadius: 2.5 }}>
              {loadError}
            </Alert>
          ) : null}

          <ContractsTable
            contracts={platformContracts}
            loading={loading}
            onCreate={() => setCreateOpen(true)}
            onEdit={setEditContract}
            onDelete={setDeleteContractState}
          />

          <ContractFormDialog
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            roles={roles}
            onSaved={async () => {
              setCreateOpen(false);
              await refresh();
            }}
          />

          <ContractFormDialog
            contract={editContract}
            onClose={() => setEditContract(null)}
            roles={roles}
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
        </>
      ) : (
        <AddonPackagesAdminSection />
      )}
    </Box>
  );
}
