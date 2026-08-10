'use client';

import * as React from 'react';
import { Alert, Box, Tab, Tabs } from '@mui/material';
import { ArrowClockwise as ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';

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

type PackagesTab = 'main' | 'auto-refresh' | 'premium' | 'okazion';

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
        onCreate={tab === 'main' ? () => setCreateOpen(true) : undefined}
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
            label="Kryesore"
          />
          <Tab
            value="auto-refresh"
            icon={React.createElement(ArrowClockwiseIcon, { size: 18 })}
            iconPosition="start"
            label="Auto-Refresh"
          />
          <Tab
            value="premium"
            icon={React.createElement(SparkleIcon, { size: 18 })}
            iconPosition="start"
            label="Premium"
          />
          <Tab
            value="okazion"
            icon={React.createElement(SealPercentIcon, { size: 18 })}
            iconPosition="start"
            label="OKAZION"
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
        <AddonPackagesAdminSection kind={tab} />
      )}
    </Box>
  );
}
