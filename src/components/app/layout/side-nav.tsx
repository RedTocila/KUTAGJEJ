'use client';

import * as React from 'react';
import type { ElementType } from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { isNavItemActive } from '@/lib/is-nav-item-active';
import { navItems } from './config';
import { BrandLogo } from '@/components/brand/brand-logo';
import { navIcons } from '@/components/dashboard/layout/nav-icons';

export function SideNav() {
  const pathname = usePathname();

  return (
    <Box sx={{ bgcolor: 'white', display: { xs: 'none', lg: 'flex' }, flexDirection: 'column', height: '100%', left: 0, position: 'fixed', top: 0, width: 'var(--SideNav-width)', borderRight: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={2} sx={{ p: 3 }}>
        <Box component={RouterLink} href="/app">
          <BrandLogo
            height={28}
            showWordmark
            wordmarkSx={{ color: 'primary.main', fontWeight: 700, fontSize: '1rem' }}
          />
          <Typography variant="caption" color="text.secondary">
            Workspace
          </Typography>
        </Box>
      </Stack>
      <Divider />
      <Box component="nav" sx={{ flex: '1 1 auto', p: '12px', overflowY: 'auto' }}>
        <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {navItems.map((item) => {
            const active = isNavItemActive({ href: item.href, pathname });
            const IconComponent: ElementType | null = item.icon ? navIcons[item.icon] ?? null : null;
            return (
              <Box component="li" key={item.key} sx={{ display: 'block', listStyle: 'none' }}>
                <Box component={RouterLink} href={item.href} sx={{ alignItems: 'center', borderRadius: 1, color: 'text.secondary', cursor: 'pointer', display: 'flex', gap: 1, p: '6px 16px', textDecoration: 'none', ...(active && { bgcolor: 'primary.main', color: 'primary.contrastText' }), '&:hover': { bgcolor: active ? 'primary.main' : 'action.hover' } }}>
                  {IconComponent
                    ? React.createElement(IconComponent, {
                        fill: active ? 'white' : 'inherit',
                        fontSize: 'var(--icon-fontSize-md)',
                        weight: active ? 'fill' : undefined,
                      })
                    : null}
                  <Typography component="span" sx={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500 }}>{item.title}</Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
