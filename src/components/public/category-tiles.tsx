'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Grid, Stack, Typography } from '@mui/material';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { HOME_VERTICALS, type HomeVerticalId } from '@/lib/home-categories';

import { VerticalIcon } from './vertical-icon';

export interface CategoryTilesProps {
  totals?: Partial<Record<HomeVerticalId, number>>;
}

export function CategoryTiles({ totals }: CategoryTilesProps) {
  return (
    <Grid container spacing={{ xs: 1.25, md: 2 }}>
      {HOME_VERTICALS.map((vertical) => {
        const total = totals?.[vertical.id] ?? 0;
        return (
          <Grid key={vertical.id} size={{ xs: 6, md: 3 }}>
            <Box
              component={RouterLink}
              href={vertical.href}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'border-color 0.15s, background-color 0.15s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: primaryMainAlpha(0.04),
                },
              }}
            >
              <VerticalIcon verticalId={vertical.id} size={46} decorative />
              <Stack spacing={0.1} sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  sx={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.25, color: 'text.primary' }}
                  noWrap
                >
                  {vertical.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {total > 0 ? `${total.toLocaleString('en-GB')} njoftime` : 'Asnjë njoftim ende'}
                </Typography>
              </Stack>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
