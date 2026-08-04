'use client';

import * as React from 'react';
import { alpha, Button, Paper, Typography, useTheme } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Scroll as ScrollIcon } from '@phosphor-icons/react/dist/ssr/Scroll';

import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';

export interface ContractsPageHeaderProps {
  loading: boolean;
  contractCount: number;
  onCreate: () => void;
}

export function ContractsPageHeader({ loading, contractCount, onCreate }: ContractsPageHeaderProps) {
  const theme = useTheme();
  const infoMain = theme.palette.info.main;

  return (
    <AdminPageHeader
      icon={React.createElement(ScrollIcon, { size: 22, weight: 'duotone' })}
      eyebrow="Financa"
      title="Kontratat"
      description="Plane për kategori — agjent ose kompani, rifreskim, boost, glow."
      actions={
        <>
          <Paper
            elevation={0}
            sx={{
              px: 2,
              py: 1,
              borderRadius: 1.5,
              bgcolor: alpha(infoMain, 0.08),
              border: '1px solid',
              borderColor: alpha(infoMain, 0.2),
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Në listë
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'info.main', lineHeight: 1 }}>
              {loading ? '—' : contractCount}
            </Typography>
          </Paper>
          <Button
            variant="contained"
            startIcon={React.createElement(PlusIcon, { size: 20 })}
            onClick={onCreate}
            sx={{
              borderRadius: 2,
              boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.35)}`,
            }}
          >
            Shto kontratë
          </Button>
        </>
      }
    />
  );
}
