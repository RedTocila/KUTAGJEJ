'use client';

import * as React from 'react';
import { alpha, Box, Button, Paper, Typography, useTheme } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Scroll as ScrollIcon } from '@phosphor-icons/react/dist/ssr/Scroll';

export interface ContractsPageHeaderProps {
  loading: boolean;
  contractCount: number;
  onCreate: () => void;
}

export function ContractsPageHeader({ loading, contractCount, onCreate }: ContractsPageHeaderProps) {
  const theme = useTheme();
  const infoMain = theme.palette.info.main;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        background: (t) =>
          `linear-gradient(135deg, ${alpha(t.palette.info.main, t.palette.mode === 'dark' ? 0.14 : 0.1)} 0%, ${alpha(t.palette.info.main, t.palette.mode === 'dark' ? 0.04 : 0.02)} 55%, transparent 100%)`,
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2.5, sm: 3 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2.5,
          alignItems: { xs: 'stretch', md: 'flex-start' },
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: `linear-gradient(145deg, ${infoMain} 0%, ${alpha(infoMain, 0.75)} 100%)`,
              color: theme.palette.info.contrastText,
              boxShadow: `0 8px 24px ${alpha(infoMain, 0.35)}`,
            }}
          >
            {React.createElement(ScrollIcon, { size: 30, weight: 'duotone' })}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
              Kontratat
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 520 }}>
              Plane për kategori (p.sh. real estate) — agjent ose kompani, rifreskim, boost, glow.
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
            alignItems: { xs: 'stretch', sm: 'center' },
            flexShrink: 0,
          }}
        >
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
            size="large"
            startIcon={React.createElement(PlusIcon, { size: 20 })}
            onClick={onCreate}
            sx={{
              px: 2.5,
              borderRadius: 2,
              boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.35)}`,
            }}
          >
            Shto kontratë
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
