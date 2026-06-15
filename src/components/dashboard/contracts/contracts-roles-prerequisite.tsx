'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { alpha, Box, Paper, Typography, useTheme } from '@mui/material';
import { Shield as ShieldIcon } from '@phosphor-icons/react/dist/ssr/Shield';

import { paths } from '@/paths';

export function ContractsRolesPrerequisite() {
  const theme = useTheme();
  const infoMain = theme.palette.info.main;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1.5,
          bgcolor: alpha(infoMain, 0.15),
          color: 'info.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {React.createElement(ShieldIcon, { size: 22, weight: 'duotone' })}
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Së pari krijoni role
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Nuk ka ende role në katalog.{' '}
          <Box
            component={RouterLink}
            href={paths.dashboard.roles}
            sx={{ fontWeight: 700, color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Kaloni te Rolet
          </Box>{' '}
          përpara se të lidhni kontrata me përdorues.
        </Typography>
      </Box>
    </Paper>
  );
}
