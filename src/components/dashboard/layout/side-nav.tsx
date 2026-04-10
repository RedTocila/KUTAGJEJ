'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import { ArrowSquareUpRight as ArrowSquareUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowSquareUpRight';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';

import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';
import { isNavItemActive } from '@/lib/is-nav-item-active';

import { BrandLogo } from '@/components/brand/brand-logo';

import { navItems } from './config';
import { navIcons } from './nav-icons';

export function SideNav() {
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
        '--NavItem-disabled-color': 'var(--mui-palette-text-disabled)',
        '--NavItem-icon-color': 'var(--mui-palette-text-secondary)',
        '--NavItem-icon-active-color': 'var(--mui-palette-primary-contrastText)',
        '--NavItem-icon-disabled-color': 'var(--mui-palette-text-disabled)',
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
      <Stack spacing={2} sx={{ p: 3 }}>
        <Box component={RouterLink} href={paths.home} sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <BrandLogo
            height={28}
            showWordmark
            wordmarkSx={{
              color: 'var(--mui-palette-primary-main)',
              fontSize: '1.05rem',
            }}
          />
        </Box>
      </Stack>
      <Divider />
      <Box component="nav" sx={{ flex: '1 1 auto', p: '12px', overflowY: 'auto' }}>
        {renderNavItems({ pathname, items: navItems })}
      </Box>
      <Divider />
    </Box>
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

function NavItem({ disabled, external, href, icon, matcher, pathname, title, children, itemKey }: NavItemProps) {
  const [open, setOpen] = React.useState(false);
  const hasChildren = children && children.length > 0;
  
  // Check if any child is active to auto-expand the parent
  const isChildActive = hasChildren && children.some(child => 
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
            {children.map((child) => (
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
              />
            ))}
          </Stack>
        </Collapse>
      )}
    </Box>
  );
}
