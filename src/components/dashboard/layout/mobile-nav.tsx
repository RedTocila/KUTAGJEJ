'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Collapse, Divider, Drawer, Stack, Typography } from '@mui/material';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';

import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';
import { isNavItemActive } from '@/lib/is-nav-item-active';

import { BrandLogo } from '@/components/brand/brand-logo';

import { getDashboardNavItemsForAccount } from './config';
import { navIcons } from './nav-icons';
import { useUser } from '@/hooks/use-user';

export interface MobileNavProps {
  onClose?: () => void;
  open?: boolean;
  items?: NavItemConfig[];
}

export function MobileNav({ open, onClose, items: itemsProp }: MobileNavProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const filteredNav = React.useMemo(
    () => getDashboardNavItemsForAccount(user?.accountType, user?.role === 'admin'),
    [user?.accountType, user?.role],
  );
  const navItems = itemsProp ?? filteredNav;

  return (
    <Drawer
      slotProps={{
        paper: {
          sx: {
            '--MobileNav-background': 'var(--mui-palette-background-paper)',
            '--MobileNav-color': 'var(--mui-palette-text-primary)',
            '--NavItem-color': 'var(--mui-palette-text-secondary)',
            '--NavItem-hover-background': 'var(--mui-palette-action-hover)',
            '--NavItem-active-background': 'var(--mui-palette-primary-main)',
            '--NavItem-active-color': 'var(--mui-palette-primary-contrastText)',
            '--NavItem-disabled-color': 'var(--mui-palette-text-disabled)',
            '--NavItem-icon-color': 'var(--mui-palette-text-secondary)',
            '--NavItem-icon-active-color': 'var(--mui-palette-primary-contrastText)',
            '--NavItem-icon-disabled-color': 'var(--mui-palette-text-disabled)',
            bgcolor: 'var(--MobileNav-background)',
            color: 'var(--MobileNav-color)',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '100%',
            scrollbarWidth: 'none',
            width: 'var(--MobileNav-width)',
            zIndex: 'var(--MobileNav-zIndex)',
            borderRight: '1px solid',
            borderColor: 'divider',
            '&::-webkit-scrollbar': { display: 'none' },
          },
        },
      }}
      onClose={onClose}
      open={open}
    >
      <Stack spacing={2} sx={{ p: 3 }}>
        <Box component={RouterLink} href={paths.home} sx={{ display: 'inline-flex' }}>
          <BrandLogo
            height={28}
            showWordmark
            wordmarkSx={{
              color: 'text.primary',
              fontWeight: 700,
              fontSize: '0.95rem',
            }}
          />
        </Box>
      </Stack>
      <Divider />
      <Box component="nav" sx={{ flex: '1 1 auto', p: '12px', overflowY: 'auto' }}>
        {renderNavItems({ pathname, items: navItems })}
      </Box>
      <Divider />
      
    </Drawer>
  );
}

function renderNavItems({ items = [], pathname }: { items?: NavItemConfig[]; pathname: string }) {
  return (
    <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {items.map(({ key, ...item }) => (
        <NavItem key={key} pathname={pathname} itemKey={key} {...item} />
      ))}
    </Stack>
  );
}

interface NavItemProps extends Omit<NavItemConfig, 'key'> {
  pathname: string;
  itemKey: string;
}

function NavItem({ disabled, external, href, icon, matcher, pathname, title, subItems, itemKey: _itemKey }: NavItemProps) {
  const [open, setOpen] = React.useState(false);
  const hasChildren = subItems && subItems.length > 0;
  
  // Check if any child is active to auto-expand the parent
  const isChildActive = hasChildren && subItems.some(child => 
    isNavItemActive({ disabled: child.disabled, external: child.external, href: child.href, matcher: child.matcher, pathname })
  );
  
  // Auto-expand parent if a child is active
  React.useEffect(() => {
    if (isChildActive) {
      setOpen(true);
    }
  }, [isChildActive]);

  const active = isNavItemActive({ disabled, external, href, matcher, pathname }) || isChildActive;
  const IconComponent: React.ElementType | null = icon ? navIcons[icon] : null;

  const handleToggle = () => {
    if (hasChildren) {
      setOpen(!open);
    }
  };

  return (
    <Box component="li" sx={{ display: 'block', listStyle: 'none' }}>
      <Box
        {...(!hasChildren && href
          ? {
              component: external ? 'a' : RouterLink,
              href,
              target: external ? '_blank' : undefined,
              rel: external ? 'noreferrer' : undefined,
            }
          : { role: 'button', onClick: handleToggle })}
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
          ...(disabled && {
            bgcolor: 'var(--NavItem-disabled-background)',
            color: 'var(--NavItem-disabled-color)',
            cursor: 'not-allowed',
          }),
          ...(active && !hasChildren && { bgcolor: 'var(--NavItem-active-background)', color: 'var(--NavItem-active-color)' }),
          ...(active && hasChildren && { color: 'var(--mui-palette-primary-main)', fontWeight: 'bold' }),
          '&:hover': {
            bgcolor: hasChildren ? 'transparent' : 'var(--NavItem-hover-background)',
          },
        }}
      >
        <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', flex: '0 0 auto' }}>
          {IconComponent
            ? React.createElement(IconComponent, {
                fill: active && !hasChildren ? 'var(--NavItem-icon-active-color)' : 'var(--NavItem-icon-color)',
                fontSize: 'var(--icon-fontSize-md)',
                weight: active ? 'fill' : undefined,
              })
            : null}
        </Box>
        <Box sx={{ flex: '1 1 auto' }}>
          <Typography
            component="span"
            sx={{ 
              color: 'inherit', 
              fontSize: '0.875rem', 
              fontWeight: active || hasChildren ? 600 : 500, 
              lineHeight: '28px' 
            }}
          >
            {title}
          </Typography>
        </Box>
        {hasChildren &&
          (open
            ? React.createElement(CaretDownIcon, { fontSize: 'var(--icon-fontSize-sm)' })
            : React.createElement(CaretRightIcon, { fontSize: 'var(--icon-fontSize-sm)' }))}
      </Box>
      
      {/* Render children if any */}
      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Stack 
            component="ul" 
            spacing={0.5} 
            sx={{ 
              listStyle: 'none', 
              m: 0, 
              p: 0,
              pl: 3,
              mt: 0.5,
              mb: 0.5
            }}
          >
            {subItems.map((child) => (
              <NavItem 
                key={child.key} 
                itemKey={child.key}
                pathname={pathname} 
                disabled={child.disabled}
                external={child.external}
                href={child.href}
                icon={child.icon}
                matcher={child.matcher}
                title={child.title}
                subItems={child.subItems}
              />
            ))}
          </Stack>
        </Collapse>
      )}
    </Box>
  );
}
