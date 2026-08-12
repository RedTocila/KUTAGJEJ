'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Box,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';

import type { NavItemConfig, NavSectionConfig } from '@/types/nav';
import { isNavItemActive } from '@/lib/is-nav-item-active';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { MOTION } from '@/styles/motion';
import { productFieldSx } from '@/styles/product-sx';

import { getDashboardNavSectionsForAccount } from './config';
import { navIcons } from './nav-icons';
import { useDisplayPathname } from '@/hooks/use-navigation-pending';
import { useUser } from '@/hooks/use-user';

export function useAdminNavSections(): NavSectionConfig[] {
  const { user } = useUser();
  return React.useMemo(
    () => getDashboardNavSectionsForAccount(user?.accountType, user?.role === 'admin'),
    [user?.accountType, user?.role],
  );
}

function itemMatchesQuery(item: NavItemConfig, sectionTitle: string | null | undefined, q: string): boolean {
  const title = (item.title ?? '').toLowerCase();
  const section = (sectionTitle ?? '').toLowerCase();
  if (title.includes(q) || section.includes(q)) return true;
  return Boolean(item.subItems?.some((child) => itemMatchesQuery(child, sectionTitle, q)));
}

function filterSections(sections: NavSectionConfig[], query: string): NavSectionConfig[] {
  const q = query.trim().toLowerCase();
  if (!q) return sections;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => itemMatchesQuery(item, section.title, q)),
    }))
    .filter((section) => section.items.length > 0);
}

export function AdminNavContent({
  onNavigate,
  sections: sectionsProp,
}: {
  onNavigate?: () => void;
  sections?: NavSectionConfig[];
}) {
  const pathname = useDisplayPathname();
  const defaultSections = useAdminNavSections();
  const sections = sectionsProp ?? defaultSections;
  const [query, setQuery] = React.useState('');

  const visible = React.useMemo(() => filterSections(sections, query), [sections, query]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
        <TextField
          size="small"
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtro menynë…"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  {React.createElement(MagnifyingGlassIcon, { size: 16 })}
                </InputAdornment>
              ),
            },
          }}
          sx={{
            ...productFieldSx,
            '& .MuiOutlinedInput-root': {
              ...productFieldSx['& .MuiOutlinedInput-root'],
              borderRadius: 2.25,
              bgcolor: 'action.hover',
              fontSize: '0.8125rem',
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: 'divider' },
            },
          }}
        />
      </Box>

      <Box component="nav" sx={{ flex: '1 1 auto', px: 1.25, pb: 1.5, overflowY: 'auto', minHeight: 0 }}>
        <Stack spacing={2} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {visible.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, py: 1 }}>
              Nuk u gjet asnjë faqe.
            </Typography>
          ) : (
            visible.map((section) => (
              <Box key={section.key} component="section">
                {section.title ? (
                  <Typography
                    variant="overline"
                    sx={{
                      display: 'block',
                      px: 1.5,
                      mb: 0.75,
                      fontSize: '0.65rem',
                      letterSpacing: '0.1em',
                      fontWeight: 700,
                      color: 'text.disabled',
                      lineHeight: 1.2,
                    }}
                  >
                    {section.title}
                  </Typography>
                ) : null}
                <Stack component="ul" spacing={0.25} sx={{ listStyle: 'none', m: 0, p: 0 }}>
                  {section.items.map(({ key, ...item }) => (
                    <NavItem
                      key={key}
                      pathname={pathname}
                      itemKey={key}
                      onNavigate={onNavigate}
                      {...item}
                    />
                  ))}
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Box>
    </Box>
  );
}

interface NavItemProps extends Omit<NavItemConfig, 'key'> {
  pathname: string;
  itemKey: string;
  onNavigate?: () => void;
}

function NavItem({
  disabled,
  external,
  href,
  icon,
  matcher,
  pathname,
  title,
  subItems,
  onNavigate,
}: NavItemProps) {
  const hasChildren = Boolean(subItems && subItems.length > 0);

  const isChildActive =
    hasChildren &&
    subItems!.some((child) =>
      isNavItemActive({
        disabled: child.disabled,
        external: child.external,
        href: child.href,
        matcher: child.matcher,
        pathname,
      }),
    );

  const active = isNavItemActive({ disabled, external, href, matcher, pathname }) || isChildActive;
  const IconComponent: React.ElementType | null = icon ? navIcons[icon] : null;
  const leafActive = active && !hasChildren;
  const isLink = Boolean(href) && !disabled;

  return (
    <Box component="li" sx={{ display: 'block', listStyle: 'none' }}>
      <Box
        {...(isLink
          ? {
              component: external ? 'a' : RouterLink,
              href,
              target: external ? '_blank' : undefined,
              rel: external ? 'noreferrer' : undefined,
              onClick: onNavigate,
            }
          : {
              role: 'button',
            })}
        sx={{
          alignItems: 'center',
          borderRadius: 1.5,
          color: leafActive || (active && hasChildren) ? 'primary.main' : 'text.secondary',
          cursor: disabled ? 'not-allowed' : isLink ? 'pointer' : 'default',
          display: 'flex',
          gap: 1.25,
          px: 1.25,
          py: 0.85,
          position: 'relative',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          transition: `background-color ${MOTION.fast} ${MOTION.ease}, color ${MOTION.fast} ${MOTION.ease}, transform ${MOTION.fast} ${MOTION.ease}`,
          bgcolor: leafActive ? primaryMainAlpha(0.12) : 'transparent',
          fontWeight: leafActive || hasChildren ? 700 : 500,
          ...(disabled && { opacity: 0.45 }),
          '&:hover': {
            bgcolor: leafActive ? primaryMainAlpha(0.16) : 'action.hover',
            color: leafActive || isLink ? 'primary.main' : 'text.primary',
          },
          '&:active': { transform: disabled || !isLink ? undefined : 'scale(0.99)' },
        }}
      >
        <Box
          sx={{
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'center',
            flex: '0 0 auto',
            width: 22,
            color: 'inherit',
          }}
        >
          {IconComponent
            ? React.createElement(IconComponent, {
                fontSize: 'var(--icon-fontSize-md)',
                weight: leafActive ? 'fill' : 'regular',
              })
            : null}
        </Box>
        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <Typography
            component="span"
            sx={{
              color: 'inherit',
              fontSize: '0.8125rem',
              fontWeight: 'inherit',
              lineHeight: 1.35,
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </Typography>
        </Box>
        {hasChildren ? (
          <Box sx={{ display: 'inline-flex', opacity: 0.45, color: 'inherit' }}>
            {React.createElement(CaretDownIcon, { fontSize: 'var(--icon-fontSize-sm)' })}
          </Box>
        ) : null}
      </Box>

      {hasChildren ? (
        <Stack
          component="ul"
          spacing={0.25}
          sx={{ listStyle: 'none', m: 0, p: 0, pl: 2.5, mt: 0.25, mb: 0.25 }}
        >
          {subItems!.map((child) => (
            <NavItem
              key={child.key}
              itemKey={child.key}
              pathname={pathname}
              onNavigate={onNavigate}
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
      ) : null}
    </Box>
  );
}
