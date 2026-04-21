'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import { alpha, Box, Divider, Stack, Typography } from '@mui/material';

import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';
import { isNavItemActive } from '@/lib/is-nav-item-active';
import { BrandLogo } from '@/components/brand/brand-logo';

import { USER_PORTAL_NAV_ITEMS } from './user-nav-config';
import { userPortalNavIcons } from './user-portal-nav-icons';

export function UserSideNav() {
  const pathname = usePathname();

  return (
    <Box
      sx={{
        '--SideNav-background': 'var(--mui-palette-background-paper)',
        '--SideNav-color': 'var(--mui-palette-text-primary)',
        '--NavItem-color': 'var(--mui-palette-text-secondary)',
        '--NavItem-hover-background': 'var(--mui-palette-action-hover)',
        '--NavItem-active-background': 'var(--mui-palette-primary-main)',
        '--NavItem-active-color': 'var(--mui-palette-primary-contrastText)',
        '--NavItem-icon-color': 'var(--mui-palette-text-secondary)',
        '--NavItem-icon-active-color': 'var(--mui-palette-primary-contrastText)',
        bgcolor: 'var(--SideNav-background)',
        color: 'var(--SideNav-color)',
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        height: '100%',
        left: 0,
        maxWidth: '100%',
        position: 'fixed',
        scrollbarWidth: 'none',
        top: 0,
        width: 'var(--SideNav-width)',
        zIndex: 'var(--SideNav-zIndex)',
        borderRight: '1px solid',
        borderColor: 'divider',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      <Stack spacing={1.5} sx={{ px: 3, pt: 2.5, pb: 2 }}>
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
            wordmarkSx={{ fontSize: '1.125rem' }}
          />
        </Box>
      </Stack>
      <Divider />
      <Box component="nav" sx={{ flex: '1 1 auto', p: '12px', overflowY: 'auto' }}>
        <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {USER_PORTAL_NAV_ITEMS.map((item) => (
            <UserNavRow key={item.key} item={item} pathname={pathname} />
          ))}
        </Stack>
      </Box>
      <Divider />
    </Box>
  );
}

function UserNavRow({ item, pathname }: { item: NavItemConfig; pathname: string }) {
  const { href, icon, title, disabled, external, matcher } = item;
  if (!href) return null;
  const active = isNavItemActive({ disabled, external, href, matcher, pathname });
  const IconComponent = icon ? userPortalNavIcons[icon] : null;

  return (
    <Box component="li" sx={{ display: 'block', listStyle: 'none' }}>
      <Box
        {...{
          component: external ? 'a' : RouterLink,
          href,
          target: external ? '_blank' : undefined,
          rel: external ? 'noreferrer' : undefined,
        }}
        sx={{
          alignItems: 'center',
          borderRadius: 1,
          color: 'var(--NavItem-color)',
          cursor: 'pointer',
          display: 'flex',
          flex: '0 0 auto',
          gap: 1,
          p: '6px 16px',
          position: 'relative',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          ...(active && {
            bgcolor: 'var(--NavItem-active-background)',
            color: 'var(--NavItem-active-color)',
          }),
          '&:hover': { bgcolor: active ? undefined : 'var(--NavItem-hover-background)' },
        }}
      >
        <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', flex: '0 0 auto' }}>
          {IconComponent
            ? React.createElement(IconComponent, {
                fill: active ? 'var(--NavItem-icon-active-color)' : 'var(--NavItem-icon-color)',
                fontSize: 'var(--icon-fontSize-md)',
                weight: active ? 'fill' : undefined,
              })
            : null}
        </Box>
        <Typography component="span" sx={{ color: 'inherit', fontSize: '0.875rem', fontWeight: active ? 600 : 500, lineHeight: '28px' }}>
          {title}
        </Typography>
      </Box>
    </Box>
  );
}
