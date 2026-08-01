'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Box, Stack, Typography } from '@mui/material';

import { primaryMainAlpha } from '@/lib/css-var-alpha';

import { HOME_SUBCATEGORIES } from '@/lib/home-subcategories';
import type { HomeVerticalId } from '@/lib/home-categories';

/**
 * Horizontally-scrollable strip of subcategory pills shown beneath each
 * section header. On mobile the row scrolls; on desktop it wraps onto a
 * single line that the user can flick through with a swipe / wheel.
 */
export function SubcategoryPills({ verticalId }: { verticalId: HomeVerticalId }) {
  const items = HOME_SUBCATEGORIES[verticalId];
  const searchParams = useSearchParams();

  const isPillActive = React.useCallback(
    (href: string) => {
      const [, query = ''] = href.split('?');
      if (!query) return searchParams.toString() === '';
      const target = new URLSearchParams(query);
      for (const [key, value] of target.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    },
    [searchParams],
  );

  if (!items || items.length === 0) return null;

  return (
    <Box
      role="navigation"
      aria-label="Nënkategoritë"
      sx={{
        mt: { xs: 1.5, md: 2 },
        mb: 1.5,
        // Allow horizontal scroll on small screens; trim the scrollbar so it stays clean.
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        // Fade the trailing edge slightly so the user knows the row continues offscreen.
        maskImage:
          'linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ pr: 3, width: 'max-content' }}>
        {items.map((item) => {
          const Icon = item.Icon;
          const active = isPillActive(item.href);
          return (
            <Box
              key={`${item.href}-${item.label}`}
              component={RouterLink}
              href={item.href}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.25,
                py: 0.75,
                borderRadius: 999,
                border: '1px solid',
                borderColor: active ? 'primary.main' : 'divider',
                bgcolor: active ? primaryMainAlpha(0.08) : 'background.paper',
                color: active ? 'primary.main' : 'text.primary',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                fontSize: '0.825rem',
                fontWeight: 600,
                lineHeight: 1.2,
                transition: 'border-color 0.15s, background-color 0.15s, color 0.15s',
                '&:hover': {
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  bgcolor: primaryMainAlpha(0.06),
                },
              }}
            >
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.main',
                  bgcolor: primaryMainAlpha(0.1),
                }}
              >
                <Icon size={13} weight="duotone" />
              </Box>
              <Typography
                component="span"
                sx={{ fontSize: 'inherit', fontWeight: 'inherit', lineHeight: 'inherit' }}
              >
                {item.label}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
