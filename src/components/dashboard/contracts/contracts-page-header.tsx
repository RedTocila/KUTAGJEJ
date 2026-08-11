'use client';

import * as React from 'react';
import { Button, Chip } from '@mui/material';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import { productButtonSx } from '@/styles/product-sx';

export interface ContractsPageHeaderProps {
  loading: boolean;
  contractCount: number;
  onCreate?: () => void;
  showCreate?: boolean;
}

export function ContractsPageHeader({
  loading,
  contractCount,
  onCreate,
  showCreate = true,
}: ContractsPageHeaderProps) {
  return (
    <AdminPageHeader
      icon={React.createElement(PackageIcon, { size: 22, weight: 'duotone' })}
      eyebrow="Financa"
      title="Paketat"
      description="Planet kryesore (FREE–ELITE) dhe paketat shtesë (Premium, Auto-Refresh, OKAZION) — të njëjtat që shfaqen te dyqani i përdoruesit."
      actions={
        <>
          <Chip
            size="small"
            label={loading ? '…' : `${contractCount} ${contractCount === 1 ? 'plan' : 'plane'} kryesore`}
            sx={{ fontWeight: 700, height: 28, display: { xs: 'none', sm: 'inline-flex' } }}
          />
          {showCreate && onCreate ? (
            <Button
              variant="contained"
              startIcon={React.createElement(PlusIcon, { size: 20 })}
              onClick={onCreate}
              sx={productButtonSx}
            >
              Shto plan
            </Button>
          ) : null}
        </>
      }
    />
  );
}
