'use client';

import * as React from 'react';
import { alpha, type Theme } from '@mui/material/styles';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

/** Theme palette key or raw CSS color (hex / rgb). */
export type PlanAccent = 'primary' | 'warning' | 'error' | 'success' | 'info' | (string & {});

const THEME_ACCENT_KEYS = new Set(['primary', 'warning', 'error', 'success', 'info']);

export function resolveAccent(theme: Theme, accent: PlanAccent = 'primary'): string {
  if (THEME_ACCENT_KEYS.has(accent)) {
    const key = accent as 'primary' | 'warning' | 'error' | 'success' | 'info';
    return theme.palette[key].main;
  }
  return accent;
}

/** FREE blue · STARTER mint · GROW orange · ELITE red */
export const PLAN_ACCENT_BY_CODE: Record<string, PlanAccent> = {
  free: '#3b82f6',
  starter: '#2dd4bf',
  grow: '#f97316',
  elite: '#ef4444',
};

export function planAccentForCode(planCode: string | null | undefined): PlanAccent {
  const code = (planCode || 'free').toLowerCase();
  return PLAN_ACCENT_BY_CODE[code] ?? PLAN_ACCENT_BY_CODE.free;
}

export function formatEur(n: number) {
  const v = Number(n) || 0;
  return `€${v.toFixed(2).replace(/\.00$/, '')}`;
}

export function formatBc(n: number) {
  return new Intl.NumberFormat('en-US').format(Number(n) || 0);
}

/** Shared shell for a sellable plan / pack card. */
export function PlanCard({
  children,
  highlighted = false,
  accent = 'primary',
  compact = false,
}: {
  children: React.ReactNode;
  highlighted?: boolean;
  accent?: PlanAccent;
  compact?: boolean;
}) {
  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: compact ? { xs: 1.5, sm: 1.75 } : { xs: 2.25, sm: 2.5 },
        borderRadius: compact ? 2.5 : 3.5,
        border: '1px solid',
        borderColor: highlighted
          ? (t) => alpha(resolveAccent(t, accent), 0.55)
          : 'divider',
        bgcolor: 'background.paper',
        boxShadow: highlighted
          ? (t) => `0 10px 28px ${alpha(resolveAccent(t, accent), 0.14)}`
          : 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (t) => `0 12px 28px ${alpha(t.palette.common.black, 0.1)}`,
          borderColor: (t) => alpha(resolveAccent(t, accent), 0.45),
        },
      }}
    >
      {children}
    </Box>
  );
}

export function PlanCardHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  accent = 'primary',
  compact = false,
}: {
  icon?: PhosphorIcon;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  accent?: PlanAccent;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Stack spacing={0.55} sx={{ mb: 1 }}>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}
        >
          <Typography
            sx={{
              fontWeight: 850,
              fontSize: '0.88rem',
              lineHeight: 1.25,
              minWidth: 0,
              flex: 1,
              wordBreak: 'break-word',
            }}
          >
            {title}
          </Typography>
          {badge ? <Box sx={{ flexShrink: 0, maxWidth: '100%' }}>{badge}</Box> : null}
        </Stack>
        {Icon || subtitle ? (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
            {Icon ? (
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: 1.25,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  bgcolor: (t) => alpha(resolveAccent(t, accent), 0.12),
                  color: (t) => resolveAccent(t, accent),
                }}
              >
                <Icon size={14} weight="duotone" />
              </Box>
            ) : null}
            {subtitle ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', fontSize: '0.68rem', lineHeight: 1.3, minWidth: 0 }}
              >
                {subtitle}
              </Typography>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack spacing={1} sx={{ mb: 1.75 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.1} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
          {Icon ? (
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                bgcolor: (t) => alpha(resolveAccent(t, accent), 0.12),
                color: (t) => resolveAccent(t, accent),
              }}
            >
              <Icon size={20} weight="duotone" />
            </Box>
          ) : null}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 850, fontSize: '1.05rem', lineHeight: 1.2 }}>{title}</Typography>
            {subtitle ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>
        {badge ? <Box sx={{ flexShrink: 0 }}>{badge}</Box> : null}
      </Stack>
    </Stack>
  );
}

export function PlanPrice({
  amount,
  suffix,
  hint,
  compact = false,
  accent,
}: {
  amount: React.ReactNode;
  suffix?: string;
  hint?: string;
  compact?: boolean;
  /** When set, the main amount uses the plan accent color. */
  accent?: PlanAccent;
}) {
  return (
    <Box sx={{ mb: compact ? 1 : 1.75 }}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'baseline' }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: compact ? '1.35rem' : '1.85rem',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: accent ? (t) => resolveAccent(t, accent) : undefined,
          }}
        >
          {amount}
        </Typography>
        {suffix ? (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              fontSize: compact ? '0.75rem' : undefined,
              color: accent ? (t) => resolveAccent(t, accent) : 'text.secondary',
              opacity: accent ? 0.85 : 1,
            }}
          >
            {suffix}
          </Typography>
        ) : null}
      </Stack>
      {hint ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.25, fontSize: compact ? '0.68rem' : undefined }}
        >
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}

export function FeatureList({
  items,
  accent = 'primary',
  compact = false,
}: {
  items: string[];
  accent?: PlanAccent;
  compact?: boolean;
}) {
  return (
    <Stack spacing={compact ? 0.4 : 0.7} sx={{ mb: compact ? 1.25 : 2, flex: 1 }}>
      {items.map((line) => (
        <Stack key={line} direction="row" spacing={0.65} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ color: (t) => resolveAccent(t, accent), mt: '1px', flexShrink: 0, display: 'inline-flex' }}>
            <CheckCircleIcon size={compact ? 13 : 16} weight="fill" />
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 600, lineHeight: 1.3, fontSize: compact ? '0.72rem' : undefined }}
          >
            {line}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function SectionBlock({
  icon: Icon,
  title,
  description,
  chips,
  accent = 'primary',
  children,
}: {
  icon: PhosphorIcon;
  title: string;
  description?: string;
  chips?: React.ReactNode;
  accent?: PlanAccent;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        borderRadius: 3.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Stack
        spacing={0.75}
        sx={{
          px: { xs: 2.25, sm: 2.75 },
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: (t) => alpha(resolveAccent(t, accent), t.palette.mode === 'dark' ? 0.08 : 0.05),
        }}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.25,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              color: (t) => resolveAccent(t, accent),
            }}
          >
            <Icon size={22} weight="duotone" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 850, fontSize: '1.05rem', lineHeight: 1.2 }}>{title}</Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.82rem' }}>
                {description}
              </Typography>
            ) : null}
          </Box>
          {chips}
        </Stack>
      </Stack>
      <Box sx={{ p: { xs: 2.25, sm: 2.75 } }}>{children}</Box>
    </Box>
  );
}

export function SoftChip({
  label,
  color = 'default',
  accent,
  compact = false,
}: {
  label: string;
  color?: 'default' | 'primary' | 'warning' | 'success' | 'error' | 'info';
  /** Custom accent overrides MUI `color` when set. */
  accent?: PlanAccent;
  compact?: boolean;
}) {
  return (
    <Chip
      size="small"
      label={label}
      color={accent || color === 'default' ? undefined : color}
      sx={{
        height: compact ? 20 : 24,
        fontWeight: 800,
        fontSize: compact ? '0.62rem' : '0.72rem',
        flexShrink: 0,
        '& .MuiChip-label': {
          px: compact ? 0.7 : undefined,
        },
        ...(accent
          ? {
              bgcolor: (t) => alpha(resolveAccent(t, accent), t.palette.mode === 'dark' ? 0.22 : 0.14),
              color: (t) => resolveAccent(t, accent),
              border: 'none',
            }
          : null),
      }}
    />
  );
}

/** Contained / outlined CTA using a plan accent color. */
export function accentButtonSx(accent: PlanAccent, variant: 'contained' | 'outlined' = 'contained') {
  if (variant === 'outlined') {
    return {
      fontWeight: 800,
      textTransform: 'none' as const,
      borderRadius: 2,
      borderColor: (t: Theme) => resolveAccent(t, accent),
      color: (t: Theme) => resolveAccent(t, accent),
      '&:hover': {
        borderColor: (t: Theme) => resolveAccent(t, accent),
        bgcolor: (t: Theme) => alpha(resolveAccent(t, accent), 0.08),
      },
    };
  }
  return {
    fontWeight: 800,
    textTransform: 'none' as const,
    borderRadius: 2,
    bgcolor: (t: Theme) => resolveAccent(t, accent),
    color: '#fff',
    '&:hover': {
      bgcolor: (t: Theme) => alpha(resolveAccent(t, accent), 0.88),
    },
  };
}

/** Taller pill CTAs — used on main subscription packages. */
export function accentPillButtonSx(accent: PlanAccent, variant: 'contained' | 'outlined' = 'contained') {
  return {
    ...accentButtonSx(accent, variant),
    borderRadius: 9999,
    minHeight: 46,
    py: 1.35,
    px: 2.25,
  };
}
