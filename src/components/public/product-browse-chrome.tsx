'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Button, IconButton, Typography, type IconButtonProps, type SxProps, type Theme } from '@mui/material';
import type { SystemStyleObject } from '@mui/system';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { paths } from '@/paths';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { useHistoryBackProps } from '@/hooks/use-navigate-back';

/** Shared height for browse search bars, filter buttons, and back buttons. */
export const PRODUCT_BROWSE_CONTROL_HEIGHT = 36;

/** Bare back control — icon only, no circular chrome. */
export const productBackButtonSx = {
  width: 'auto',
  height: 'auto',
  minWidth: 0,
  p: 0.5,
  flexShrink: 0,
  color: 'text.primary',
  border: 'none',
  bgcolor: 'transparent',
  borderRadius: 0,
  boxShadow: 'none',
  overflow: 'visible',
  transition:
    'color 140ms cubic-bezier(0.22, 1, 0.36, 1), transform 140ms cubic-bezier(0.22, 1, 0.36, 1)',
  '&:hover': { bgcolor: 'transparent', color: 'primary.main' },
  '&:active': { transform: 'scale(0.94)' },
} as const;

export function ProductBackButton({
  href,
  onClick,
  'aria-label': ariaLabel = 'Kthehu',
  sx,
  disabled,
  type = 'button',
  'data-hero-control': dataHeroControl,
}: {
  href?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  'aria-label'?: string;
  sx?: SxProps<Theme>;
  disabled?: boolean;
  type?: IconButtonProps['type'];
  'data-hero-control'?: string | boolean;
}) {
  const fallbackHref = href ?? paths.home;
  const historyBack = useHistoryBackProps(fallbackHref);
  const buttonSx = [productBackButtonSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])];
  const heroControl = dataHeroControl ? { 'data-hero-control': dataHeroControl } : null;

  /** Explicit handler without href (in-page UI: messages thread, share overlay). */
  if (onClick && href == null) {
    return (
      <IconButton
        aria-label={ariaLabel}
        onClick={onClick}
        size="small"
        disableRipple
        disableFocusRipple
        sx={buttonSx}
        disabled={disabled}
        type={type}
        {...heroControl}
      >
        <ArrowLeftIcon size={18} weight="bold" />
      </IconButton>
    );
  }

  return (
    <IconButton
      component={RouterLink}
      href={historyBack.href}
      aria-label={ariaLabel}
      size="small"
      disableRipple
      disableFocusRipple
      sx={buttonSx}
      disabled={disabled}
      data-history-back=""
      onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        historyBack.onClick(event);
      }}
      {...heroControl}
    >
      <ArrowLeftIcon size={18} weight="bold" />
    </IconButton>
  );
}

/** Text control that returns to the previous page, with `href` as a cold-landing fallback. */
export function HistoryBackButton({
  href,
  children,
  sx,
}: {
  href: string;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}) {
  const historyBack = useHistoryBackProps(href);
  return (
    <Button
      component={RouterLink}
      variant="text"
      href={historyBack.href}
      onClick={historyBack.onClick}
      data-history-back=""
      sx={[{ fontWeight: 700, textTransform: 'none' }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      {children}
    </Button>
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
    border: 'none',
    bgcolor: active ? accentSoft : '#2a2a2a',
    color: active ? accentColor : 'text.primary',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    fontSize: '0.825rem',
    fontWeight: 700,
    lineHeight: 1.2,
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition:
      'background-color 140ms cubic-bezier(0.22, 1, 0.36, 1), color 140ms cubic-bezier(0.22, 1, 0.36, 1), transform 140ms cubic-bezier(0.22, 1, 0.36, 1)',
    '&:hover': {
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
  bareIcon = false,
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
  bareIcon?: boolean;
  active?: boolean;
  accent?: ProductTagAccent;
  href?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
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
        bareIcon ? (
          <Box component="span" sx={{ display: 'inline-flex', color: accent?.color ?? 'primary.main' }}>
            <Icon size={16} weight="duotone" />
          </Box>
        ) : (
          <Box sx={productTagIconWrapSx(accent)}>
            <Icon size={13} weight="duotone" />
          </Box>
        )
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
export function productSearchBarSx(active = false, accent?: ProductSearchAccent): SystemStyleObject<Theme> {
  const accentSoft = accent?.soft ?? primaryMainAlpha(0.08);
  return {
    height: PRODUCT_BROWSE_CONTROL_HEIGHT,
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    px: 1.25,
    py: 0.75,
    borderRadius: 999,
    border: 'none',
    bgcolor: active ? accentSoft : '#2a2a2a',
    overflow: 'hidden',
    boxSizing: 'border-box',
    textDecoration: 'none',
    color: 'inherit',
    boxShadow: 'none',
    transition: 'background-color 140ms cubic-bezier(0.22, 1, 0.36, 1)',
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
  return <MagnifyingGlassIcon size={14} color={color ?? 'var(--mui-palette-primary-main)'} style={{ flexShrink: 0 }} />;
}

/** Circular filter trigger beside the search bar. */
export function productFilterButtonSx(active = false): SxProps<Theme> {
  return {
    width: PRODUCT_BROWSE_CONTROL_HEIGHT,
    height: PRODUCT_BROWSE_CONTROL_HEIGHT,
    borderRadius: '50%',
    border: 'none',
    color: active ? 'primary.contrastText' : 'text.primary',
    bgcolor: active ? 'primary.main' : '#2a2a2a',
    boxShadow: 'none',
    transition:
      'background-color 140ms cubic-bezier(0.22, 1, 0.36, 1), color 140ms cubic-bezier(0.22, 1, 0.36, 1), transform 140ms cubic-bezier(0.22, 1, 0.36, 1)',
    '&:hover': {
      bgcolor: active ? 'primary.dark' : '#333333',
    },
    '&:active': {
      transform: 'scale(0.94)',
    },
  };
}
