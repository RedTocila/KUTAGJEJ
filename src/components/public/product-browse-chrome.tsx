'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Box,
  IconButton,
  Typography,
  type IconButtonProps,
  type SxProps,
  type Theme,
} from '@mui/material';
import type { SystemStyleObject } from '@mui/system';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { primaryMainAlpha } from '@/lib/css-var-alpha';

/** Shared height for browse search bars, filter buttons, and back buttons. */
export const PRODUCT_BROWSE_CONTROL_HEIGHT = 36;

/** Circular back control — browse headers, detail toolbars. */
export const productBackButtonSx = {
  width: PRODUCT_BROWSE_CONTROL_HEIGHT,
  height: PRODUCT_BROWSE_CONTROL_HEIGHT,
  flexShrink: 0,
  color: 'text.primary',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  borderRadius: '50%',
  transition: 'background-color 140ms cubic-bezier(0.22, 1, 0.36, 1), border-color 140ms cubic-bezier(0.22, 1, 0.36, 1), transform 140ms cubic-bezier(0.22, 1, 0.36, 1)',
  '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
  '&:active': { transform: 'scale(0.94)' },
} as const;

export function ProductBackButton({
  href,
  onClick,
  'aria-label': ariaLabel = 'Kthehu',
  sx,
  ...rest
}: {
  href?: string;
  onClick?: () => void;
  'aria-label'?: string;
  sx?: SxProps<Theme>;
} & Omit<IconButtonProps, 'children' | 'sx'>) {
  const buttonSx = [productBackButtonSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])];

  if (href) {
    return (
      <IconButton
        component={RouterLink}
        href={href}
        aria-label={ariaLabel}
        size="small"
        sx={buttonSx}
        {...rest}
      >
        <ArrowLeftIcon size={18} weight="bold" />
      </IconButton>
    );
  }

  return (
    <IconButton aria-label={ariaLabel} onClick={onClick} size="small" sx={buttonSx} {...rest}>
      <ArrowLeftIcon size={18} weight="bold" />
    </IconButton>
  );
}

export type ProductTagAccent = {
  color: string;
  soft: string;
};

/** Pill tag chrome — subcategory pills, filter chips, service tags. */
export function productTagSx(active = false, accent?: ProductTagAccent): SxProps<Theme> {
  const accentColor = accent?.color ?? 'primary.main';
  const accentSoft = accent?.soft ?? primaryMainAlpha(0.08);
  const hoverSoft = accent?.soft ?? primaryMainAlpha(0.06);
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.75,
    px: 1.25,
    py: 0.75,
    borderRadius: 999,
    border: '1px solid',
    borderColor: active ? accentColor : 'divider',
    bgcolor: active ? accentSoft : 'background.paper',
    color: active ? accentColor : 'text.primary',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    fontSize: '0.825rem',
    fontWeight: 700,
    lineHeight: 1.2,
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition:
      'border-color 140ms cubic-bezier(0.22, 1, 0.36, 1), background-color 140ms cubic-bezier(0.22, 1, 0.36, 1), color 140ms cubic-bezier(0.22, 1, 0.36, 1), transform 140ms cubic-bezier(0.22, 1, 0.36, 1)',
    '&:hover': {
      borderColor: accentColor,
      color: accentColor,
      bgcolor: hoverSoft,
    },
    '&:active': {
      transform: 'scale(0.97)',
    },
  };
}

export function productTagIconWrapSx(accent?: ProductTagAccent): SxProps<Theme> {
  const accentColor = accent?.color ?? 'primary.main';
  return {
    width: 22,
    height: 22,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: accentColor,
    bgcolor: accent?.soft
      ? accent.soft
      : (theme: Theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(var(--mui-palette-primary-mainChannel) / 0.16)'
            : 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)',
  };
}

export function ProductTag({
  label,
  icon: Icon,
  active = false,
  accent,
  href,
  onClick,
  onDelete,
  component,
  sx,
}: {
  label: React.ReactNode;
  icon?: PhosphorIcon;
  active?: boolean;
  accent?: ProductTagAccent;
  href?: string;
  onClick?: () => void;
  onDelete?: () => void;
  component?: React.ElementType;
  sx?: SxProps<Theme>;
}) {
  const resolvedComponent = component ?? (href ? RouterLink : onClick ? 'button' : 'span');
  const isButton = resolvedComponent === 'button';

  return (
    <Box
      component={resolvedComponent}
      href={href}
      onClick={onClick}
      type={isButton ? 'button' : undefined}
      sx={[productTagSx(active, accent), ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      {Icon ? (
        <Box sx={productTagIconWrapSx(accent)}>
          <Icon size={13} weight="duotone" />
        </Box>
      ) : null}
      <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'inherit', lineHeight: 'inherit' }}>
        {label}
      </Typography>
      {onDelete ? (
        <Box
          component="button"
          type="button"
          aria-label="Hiq"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 0,
            m: 0,
            ml: 0.15,
            border: 'none',
            bgcolor: 'transparent',
            color: 'inherit',
            opacity: 0.72,
            cursor: 'pointer',
            fontFamily: 'inherit',
            '&:hover': { opacity: 1 },
          }}
        >
          <XIcon size={12} weight="bold" />
        </Box>
      ) : null}
    </Box>
  );
}

export type ProductSearchAccent = {
  /** Border / icon color when active or focused. */
  color: string;
  /** Soft fill when active or focused. */
  soft: string;
};

/** Pill search bar shell — keyword search, mobile header search. */
export function productSearchBarSx(
  active = false,
  accent?: ProductSearchAccent,
): SystemStyleObject<Theme> {
  const accentColor = accent?.color ?? 'primary.main';
  const accentSoft = accent?.soft ?? primaryMainAlpha(0.08);
  return {
    height: PRODUCT_BROWSE_CONTROL_HEIGHT,
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    px: 1.25,
    py: 0.75,
    borderRadius: 999,
    border: '1px solid',
    borderColor: active ? accentColor : 'divider',
    bgcolor: active ? accentSoft : 'background.paper',
    overflow: 'hidden',
    boxSizing: 'border-box',
    textDecoration: 'none',
    color: 'inherit',
    transition:
      'border-color 140ms cubic-bezier(0.22, 1, 0.36, 1), background-color 140ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 140ms cubic-bezier(0.22, 1, 0.36, 1)',
  };
}

export const productSearchFieldSx = {
  flex: 1,
  minWidth: 0,
  fontSize: '0.825rem',
  fontWeight: 600,
  py: 0,
  '& input': { padding: 0 },
  '& input::placeholder': {
    opacity: 0.72,
    fontWeight: 500,
  },
} as const;

export function ProductSearchIcon({ color }: { color?: string } = {}) {
  return (
    <MagnifyingGlassIcon
      size={14}
      color={color ?? 'var(--mui-palette-primary-main)'}
      style={{ flexShrink: 0 }}
    />
  );
}

/** Circular filter trigger beside the search bar. */
export function productFilterButtonSx(active = false): SxProps<Theme> {
  return {
    width: PRODUCT_BROWSE_CONTROL_HEIGHT,
    height: PRODUCT_BROWSE_CONTROL_HEIGHT,
    borderRadius: '50%',
    border: '1px solid',
    borderColor: active ? 'primary.main' : 'divider',
    color: active ? 'primary.contrastText' : 'text.primary',
    bgcolor: active ? 'primary.main' : 'background.paper',
    boxShadow: active ? `0 2px 10px ${primaryMainAlpha(0.4)}` : 'none',
    transition:
      'background-color 140ms cubic-bezier(0.22, 1, 0.36, 1), border-color 140ms cubic-bezier(0.22, 1, 0.36, 1), color 140ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 140ms cubic-bezier(0.22, 1, 0.36, 1), transform 140ms cubic-bezier(0.22, 1, 0.36, 1)',
    '&:hover': {
      bgcolor: active ? 'primary.dark' : primaryMainAlpha(0.1),
      borderColor: 'primary.main',
    },
    '&:active': {
      transform: 'scale(0.94)',
    },
  };
}
