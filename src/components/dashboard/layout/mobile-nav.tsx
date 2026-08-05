'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { alpha, Box, Chip, Divider, Drawer, Stack } from '@mui/material';

import type { NavSectionConfig } from '@/types/nav';
import { paths } from '@/paths';
import { BrandLogo } from '@/components/brand/brand-logo';

import { AdminNavContent, useAdminNavSections } from './admin-nav-content';

export interface MobileNavProps {
  onClose?: () => void;
  open?: boolean;
  sections?: NavSectionConfig[];
}

export function MobileNav({ open, onClose, sections: sectionsProp }: MobileNavProps) {
  const filteredSections = useAdminNavSections();
  const sections = sectionsProp ?? filteredSections;

  return (
    <Drawer
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '100%',
            width: 'var(--MobileNav-width)',
            zIndex: 'var(--MobileNav-zIndex)',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        },
      }}
      onClose={onClose}
      open={open}
    >
      <Stack spacing={1} sx={{ px: 2.5, pt: 2, pb: 1.75 }}>
        <Box
          component={RouterLink}
          href={paths.home}
          onClick={onClose}
          sx={{
            display: 'inline-flex',
            textDecoration: 'none',
            color: 'inherit',
            borderRadius: 2,
            outline: 'none',
            transition: 'opacity 0.15s ease',
            '&:visited': { color: 'inherit' },
            '&:hover': { opacity: 0.9 },
            '&:focus-visible': {
              boxShadow: (theme) => `0 0 0 2px ${alpha(theme.palette.primary.main, 0.45)}`,
            },
          }}
        >
          <BrandLogo
            height={28}
            showWordmark
            wordmarkPresentation="brand"
            markSx={{
              borderRadius: 2,
              p: 0.75,
              bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08),
            }}
            wordmarkSx={{
              fontSize: '1.05rem',
            }}
          />
        </Box>
        <Chip
          size="small"
          label="Panel admin"
          color="primary"
          variant="outlined"
          sx={{
            alignSelf: 'flex-start',
            height: 22,
            fontWeight: 700,
            fontSize: '0.7rem',
          }}
        />
      </Stack>
      <Divider />
      <Box sx={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <AdminNavContent sections={sections} onNavigate={onClose} />
      </Box>
    </Drawer>
  );
}
