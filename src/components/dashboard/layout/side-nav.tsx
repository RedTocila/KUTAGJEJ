'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { alpha, Box, Chip, Divider, Stack, Typography } from '@mui/material';

import { paths } from '@/paths';
import { BrandLogo } from '@/components/brand/brand-logo';

import { AdminNavContent } from './admin-nav-content';

export function SideNav() {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        height: '100%',
        left: 0,
        maxWidth: '100%',
        position: 'fixed',
        scrollbarWidth: 'thin',
        top: 0,
        width: 'var(--SideNav-width)',
        zIndex: 'var(--SideNav-zIndex)',
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack spacing={1} sx={{ px: 2.5, pt: 2, pb: 1.75 }}>
        <Box
          component={RouterLink}
          href={paths.home}
          sx={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            alignSelf: 'flex-start',
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
            height={36}
            showWordmark
            wordmarkPresentation="brand"
            markSx={{
              borderRadius: 2,
              p: 0.75,
              bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08),
            }}
            wordmarkSx={{
              fontSize: '1.125rem',
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
            letterSpacing: '0.02em',
          }}
        />
      </Stack>
      <Divider />
      <Box sx={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <AdminNavContent />
      </Box>
      <Divider />
      <Box sx={{ px: 2.5, py: 1.5 }}>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', lineHeight: 1.4 }}>
          KuTaGjej · Administrim
        </Typography>
      </Box>
    </Box>
  );
}
