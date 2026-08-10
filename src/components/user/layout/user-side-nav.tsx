'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge, alpha, Box, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { SignOut as SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';

import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';
import { isNavItemActive } from '@/lib/is-nav-item-active';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ThemeModeToggle } from '@/components/dashboard/layout/theme-mode-toggle';
import { HeaderLanguageToggle } from '@/components/user/header-language-toggle';
import { UserNotificationsMenu } from '@/components/user/layout/user-notifications-menu';
import { authClient } from '@/lib/auth/client';

import { getLocalizedUserPortalNavItems } from './user-nav-config';
import { userPortalNavIcons } from './user-portal-nav-icons';
import { useCopy } from '@/hooks/use-copy';
import { useUnreadMessagesCount } from '@/hooks/use-unread-messages-count';
import { useUser } from '@/hooks/use-user';
import { useOptionalAddListingPicker } from '@/components/user/add-listing-picker-context';

export function UserSideNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const t = useCopy();
  const unreadMessages = useUnreadMessagesCount();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Keep SSR + first client paint identical (overview + profile only), then expand.
  const navItems = React.useMemo(() => {
    if (!mounted) {
      return getLocalizedUserPortalNavItems(null, t);
    }
    return getLocalizedUserPortalNavItems(user ?? null, t);
  }, [mounted, user, t]);

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
      <Stack spacing={1.5} sx={{ px: 3, pt: 0, pb: 2 }}>
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
            height={28}
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
          {navItems.map((item) => (
            <UserNavRow key={item.key} item={item} pathname={pathname} unreadMessages={unreadMessages} />
          ))}
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ px: 1.5, py: 1.25, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.75 }}>
        <UserNotificationsMenu />
        <HeaderLanguageToggle />
        <ThemeModeToggle />
        <Tooltip title={t.nav.signOut}>
          <IconButton
            size="large"
            aria-label={t.nav.signOut}
            onClick={() => {
              void authClient.signOut();
            }}
            sx={{ color: 'text.secondary' }}
          >
            <SignOutIcon size={22} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

function UserNavRow({
  item,
  pathname,
  unreadMessages,
}: {
  item: NavItemConfig;
  pathname: string;
  unreadMessages: number;
}) {
  const { href, icon, title, disabled, external, matcher, key } = item;
  const addListingPicker = useOptionalAddListingPicker();
  if (!href) return null;
  const active = isNavItemActive({ disabled, external, href, matcher, pathname });
  const IconComponent = icon ? userPortalNavIcons[icon] : null;
  const opensPicker = key === 'real-estate';
  const isMessages = key === 'messages';

  return (
    <Box component="li" sx={{ display: 'block', listStyle: 'none' }}>
      <Box
        component={opensPicker || external ? 'a' : RouterLink}
        href={opensPicker ? '#' : href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        onClick={
          opensPicker
            ? (event: React.MouseEvent) => {
                event.preventDefault();
                addListingPicker?.openAddListingPicker();
              }
            : undefined
        }
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
          transition:
            'background-color 140ms cubic-bezier(0.22, 1, 0.36, 1), color 140ms cubic-bezier(0.22, 1, 0.36, 1), transform 140ms cubic-bezier(0.22, 1, 0.36, 1)',
          ...(active && {
            bgcolor: 'var(--NavItem-active-background)',
            color: 'var(--NavItem-active-color)',
          }),
          '&:hover': { bgcolor: active ? undefined : 'var(--NavItem-hover-background)' },
          '&:active': { transform: 'scale(0.985)' },
        }}
      >
        <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', flex: '0 0 auto' }}>
          {IconComponent ? (
            <Badge
              color="error"
              badgeContent={unreadMessages > 99 ? '99+' : unreadMessages}
              invisible={!isMessages || unreadMessages <= 0}
              overlap="circular"
            >
              {React.createElement(IconComponent, {
                fill: active ? 'var(--NavItem-icon-active-color)' : 'var(--NavItem-icon-color)',
                fontSize: 'var(--icon-fontSize-md)',
                weight: active ? 'fill' : undefined,
              })}
            </Badge>
          ) : null}
        </Box>
        <Typography
          component="span"
          sx={{ color: 'inherit', fontSize: '0.875rem', fontWeight: active ? 600 : 500, lineHeight: '28px' }}
        >
          {title}
        </Typography>
      </Box>
    </Box>
  );
}
