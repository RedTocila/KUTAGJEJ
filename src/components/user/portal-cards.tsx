'use client';

import * as React from 'react';
import { alpha } from '@mui/material/styles';
import { Box, Chip, Divider, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { hardNavigate } from '@/lib/hard-navigate';

/** Shared surface used by portal link rows and content sections. */
export const portalCardSx = {
  borderRadius: 3.5,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  overflow: 'hidden',
} as const;

export function PortalIconBox({
  children,
  size = 44,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 2.25,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        bgcolor: (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.16 : 0.12),
        color: 'primary.main',
      }}
    >
      {children}
    </Box>
  );
}

/** Full-width navigation row — standalone card, or row inside `PortalLinkGroup`. */
export function PortalLinkCard({
  href,
  title,
  description,
  icon: Icon,
  badge,
  badgeColor,
  grouped = false,
}: {
  href: string;
  title: string;
  description: string;
  icon: PhosphorIcon;
  badge?: string;
  /** Optional accent for the badge chip (hex / CSS color). */
  badgeColor?: string;
  /** When true, omit outer card chrome (use inside `PortalLinkGroup`). */
  grouped?: boolean;
}) {
  return (
    <Box
      component="a"
      href={href}
      onClick={(event) => hardNavigate(href, event)}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        p: { xs: 2.25, sm: 2.75 },
        ...(grouped ? null : portalCardSx),
        transition: grouped
          ? 'background-color 0.15s ease'
          : 'border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease',
        '&:hover': {
          ...(grouped
            ? {
                bgcolor: (t: Theme) =>
                  t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'action.hover',
              }
            : {
                borderColor: (t: Theme) => alpha(t.palette.primary.main, 0.45),
                bgcolor: (t: Theme) =>
                  t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'action.hover',
                transform: 'translateY(-1px)',
              }),
        },
        '&:active': grouped ? undefined : { transform: 'translateY(0)' },
      }}
    >
      <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
        <PortalIconBox>{React.createElement(Icon, { size: 24, weight: 'duotone' })}</PortalIconBox>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, lineHeight: 1.45 }}>
            {description}
          </Typography>
          {badge ? (
            <Chip
              label={badge}
              size="small"
              sx={{
                mt: 1.15,
                height: 24,
                fontWeight: 800,
                fontSize: '0.68rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                border: 'none',
                '& .MuiChip-label': { px: 1.25 },
                ...(badgeColor
                  ? {
                      bgcolor: (t) => alpha(badgeColor, t.palette.mode === 'dark' ? 0.22 : 0.14),
                      color: badgeColor,
                    }
                  : {
                      bgcolor: (t) =>
                        t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      color: 'text.primary',
                    }),
              }}
            />
          ) : null}
        </Box>
        <Box sx={{ color: 'text.secondary', display: 'flex', flexShrink: 0, opacity: 0.7 }}>
          <CaretRightIcon size={20} weight="bold" />
        </Box>
      </Stack>
    </Box>
  );
}

/** Single bordered list of `PortalLinkCard` rows separated by dividers. */
export function PortalLinkGroup({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <Box sx={portalCardSx}>
      {items.map((child, index) => (
        <React.Fragment key={React.isValidElement(child) && child.key != null ? child.key : index}>
          {index > 0 ? <Divider /> : null}
          {child}
        </React.Fragment>
      ))}
    </Box>
  );
}

/** Content section with icon header — profile, payments, referral, etc. */
export function PortalSectionCard({
  title,
  description,
  icon,
  children,
  headerExtra,
  noDivider = false,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  noDivider?: boolean;
}) {
  return (
    <Box sx={portalCardSx}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: 'flex-start',
          px: { xs: 2.25, sm: 2.75 },
          pt: { xs: 2.25, sm: 2.5 },
          pb: 1.75,
        }}
      >
        {icon ? <PortalIconBox size={40}>{icon}</PortalIconBox> : null}
        <Box sx={{ minWidth: 0, flex: 1, pt: 0.2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
              {title}
            </Typography>
            {headerExtra}
          </Stack>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, lineHeight: 1.45 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
      </Stack>
      {noDivider ? null : <Divider />}
      <Box sx={{ px: { xs: 2.25, sm: 2.75 }, py: { xs: 2.25, sm: 2.5 } }}>{children}</Box>
    </Box>
  );
}

/** Simple bordered surface without a header — for tables, lists, hero blocks. */
export function PortalSurface({
  children,
  sx,
}: {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}) {
  return <Box sx={[portalCardSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>{children}</Box>;
}
