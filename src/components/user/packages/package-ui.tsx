'use client';

import * as React from 'react';
import { alpha, type Theme } from '@mui/material/styles';
import { Box, ButtonBase, Chip, Collapse, Stack, Typography } from '@mui/material';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { OKAZION_RED } from '@/lib/home-categories';

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
  elite: OKAZION_RED,
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
      <Stack spacing={0.55} sx={{ mb: 0.65 }}>
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
        {subtitle ? (
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
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', fontSize: '0.68rem', lineHeight: 1.3, minWidth: 0 }}
            >
              {subtitle}
            </Typography>
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
    <Box sx={{ mb: compact ? 0.5 : 1.75 }}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'baseline' }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: compact ? '1.2rem' : '1.85rem',
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
              fontSize: compact ? '0.72rem' : undefined,
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
          sx={{ display: 'block', mt: 0.15, fontSize: compact ? '0.65rem' : undefined }}
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
    <Stack spacing={compact ? 0.4 : 0.7} sx={{ mb: compact ? 0 : 2, flex: compact ? undefined : 1, mt: compact ? 0.35 : 0 }}>
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

/** Collapsed-by-default feature list — keeps package cards short. */
export function FeatureDetailsDropdown({
  items,
  accent = 'primary',
  label = 'Detajet',
  open,
  onToggle,
  fullWidth = false,
}: {
  items: string[];
  accent?: PlanAccent;
  label?: string;
  /** Controlled open state — when set, content is rendered by the parent below. */
  open?: boolean;
  onToggle?: () => void;
  /** Stretch the toggle across the full row (easier tap target). */
  fullWidth?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = open != null && onToggle != null;
  const isOpen = isControlled ? open : uncontrolledOpen;
  if (items.length === 0) return null;

  const toggle = () => {
    if (isControlled) onToggle();
    else setUncontrolledOpen((v) => !v);
  };

  return (
    <Box>
      <ButtonBase
        onClick={toggle}
        aria-expanded={isOpen}
        sx={{
          display: fullWidth ? 'flex' : 'inline-flex',
          width: fullWidth ? '100%' : undefined,
          alignItems: 'center',
          justifyContent: fullWidth ? 'space-between' : undefined,
          gap: 0.4,
          py: fullWidth ? 0.55 : 0.15,
          px: 0,
          borderRadius: 0.75,
          color: 'text.secondary',
          '&:hover': { color: (t) => resolveAccent(t, accent) },
        }}
      >
        <Typography sx={{ fontWeight: 750, fontSize: '0.7rem', letterSpacing: '0.02em' }}>{label}</Typography>
        <Box
          sx={{
            display: 'inline-flex',
            transition: 'transform 0.15s ease',
            transform: isOpen ? 'rotate(180deg)' : 'none',
          }}
        >
          <CaretDownIcon size={12} weight="bold" />
        </Box>
      </ButtonBase>
      {!isControlled ? (
        <Collapse in={isOpen} unmountOnExit>
          <Box sx={{ pt: 0.65 }}>
            <FeatureList items={items} accent={accent} compact />
          </Box>
        </Collapse>
      ) : null}
    </Box>
  );
}

/**
 * Horizontal package offer — info + CTAs on one row; details expand full-width below.
 */
export function PackageOfferRow({
  title,
  badge,
  price,
  priceSuffix,
  meta,
  details = [],
  accent = 'primary',
  highlighted = false,
  actions,
}: {
  title: string;
  badge?: React.ReactNode;
  /** Optional — prefer putting prices on the action buttons instead. */
  price?: React.ReactNode;
  priceSuffix?: string;
  /** Secondary price line (e.g. Boost Coins amount). */
  meta?: React.ReactNode;
  details?: string[];
  accent?: PlanAccent;
  highlighted?: boolean;
  actions: React.ReactNode;
}) {
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const showPrice = price != null || priceSuffix != null || meta != null;

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 1.75 },
        py: { xs: 1.25, sm: 1.35 },
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: highlighted ? (t) => alpha(resolveAccent(t, accent), 0.55) : 'divider',
        bgcolor: highlighted
          ? (t) => alpha(resolveAccent(t, accent), t.palette.mode === 'dark' ? 0.1 : 0.04)
          : 'background.paper',
        boxShadow: highlighted ? (t) => `0 8px 22px ${alpha(resolveAccent(t, accent), 0.12)}` : 'none',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          borderColor: (t) => alpha(resolveAccent(t, accent), 0.45),
          boxShadow: (t) => `0 8px 22px ${alpha(t.palette.common.black, 0.08)}`,
        },
      }}
    >
      <Stack direction="row" spacing={{ xs: 1.25, sm: 2 }} sx={{ alignItems: 'center' }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 0.5,
              mb: showPrice || details.length ? 0.3 : 0,
            }}
          >
            <Typography sx={{ fontWeight: 850, fontSize: '0.92rem', lineHeight: 1.25 }}>{title}</Typography>
            {badge}
          </Stack>

          {showPrice ? (
            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                alignItems: 'baseline',
                flexWrap: 'wrap',
                columnGap: 0.85,
                rowGap: 0.15,
                mb: details.length ? 0.35 : 0,
              }}
            >
              {price != null ? (
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: '1.1rem', sm: '1.2rem' },
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                    color: (t) => resolveAccent(t, accent),
                  }}
                >
                  {price}
                </Typography>
              ) : null}
              {priceSuffix ? (
                <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>
                  {priceSuffix}
                </Typography>
              ) : null}
              {meta ? (
                <Typography sx={{ fontWeight: 650, fontSize: '0.75rem', color: 'text.secondary' }}>
                  · {meta}
                </Typography>
              ) : null}
            </Stack>
          ) : null}

          {details.length > 0 ? (
            <FeatureDetailsDropdown
              items={details}
              accent={accent}
              open={detailsOpen}
              onToggle={() => setDetailsOpen((v) => !v)}
            />
          ) : null}
        </Box>

        <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0, alignItems: 'center' }}>
          {actions}
        </Stack>
      </Stack>

      {details.length > 0 ? (
        <Collapse in={detailsOpen} unmountOnExit>
          <Box
            sx={{
              mt: 1.1,
              pt: 1.1,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <FeatureList items={details} accent={accent} compact />
          </Box>
        </Collapse>
      ) : null}
    </Box>
  );
}

const PACKAGE_BADGE_YELLOW = '#facc15';

/**
 * Package card:
 * - Clickable price on the right (Boost Coins / Auto-Refresh / main plans), or
 * - Two equal action buttons in a row (Premium / OKAZION: € + BC).
 * - Optional collapsible feature details at the bottom.
 */
export function PackageCheckoutCard({
  title,
  subtitle,
  badge,
  price,
  priceSuffix = '/ paketë',
  onClick,
  actions,
  details = [],
  accent = 'primary',
  selected = false,
}: {
  title: string;
  subtitle?: string;
  badge?: string | null;
  price?: React.ReactNode;
  priceSuffix?: string;
  onClick?: () => void;
  /** When set, renders a full-width row of buttons (e.g. € + BC) instead of a price column. */
  actions?: React.ReactNode;
  /** Feature lines shown in a collapsed "Detajet" dropdown at the bottom. */
  details?: string[];
  /** Hover / active border & wash — e.g. `warning` Premium, `error` OKAZION. */
  accent?: PlanAccent;
  /** Current / selected plan — accent border + corner checkmark. */
  selected?: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const hasDetails = details.length > 0;

  const header = (
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: subtitle ? 0.4 : 0 }}
      >
        <Typography
          sx={{
            fontWeight: 850,
            fontSize: { xs: '1.05rem', sm: '1.15rem' },
            lineHeight: 1.2,
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>
        {badge ? (
          <Box
            sx={{
              px: 1,
              py: 0.2,
              borderRadius: 999,
              bgcolor: PACKAGE_BADGE_YELLOW,
              color: '#111',
              fontWeight: 850,
              fontSize: '0.68rem',
              lineHeight: 1.35,
              flexShrink: 0,
            }}
          >
            {badge}
          </Box>
        ) : null}
      </Stack>
      {subtitle ? (
        <Typography
          sx={{
            fontWeight: 550,
            fontSize: '0.82rem',
            lineHeight: 1.35,
            color: 'text.secondary',
          }}
        >
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );

  const interactiveSx = {
    borderColor: (t: Theme) => alpha(resolveAccent(t, accent), 0.55),
    bgcolor: (t: Theme) =>
      t.palette.mode === 'dark'
        ? alpha(resolveAccent(t, accent), 0.12)
        : alpha(resolveAccent(t, accent), 0.06),
  };

  const selectedSx = selected
    ? {
        borderColor: (t: Theme) => resolveAccent(t, accent),
        borderWidth: 2,
        bgcolor: (t: Theme) =>
          t.palette.mode === 'dark'
            ? alpha(resolveAccent(t, accent), 0.14)
            : alpha(resolveAccent(t, accent), 0.07),
      }
    : null;

  const priceColumn = (
    <Box sx={{ flexShrink: 0, textAlign: 'right', minWidth: 72 }}>
      <Typography
        sx={{
          fontWeight: 900,
          fontSize: { xs: '1.2rem', sm: '1.35rem' },
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: 'text.primary',
          transition: 'color 0.15s ease',
          ...(onClick
            ? {
                '.MuiButtonBase-root:hover &, .MuiButtonBase-root:active &': {
                  color: (t: Theme) => resolveAccent(t, accent),
                },
              }
            : null),
        }}
      >
        {price}
      </Typography>
      <Typography
        sx={{
          mt: 0.2,
          fontWeight: 600,
          fontSize: '0.75rem',
          color: 'text.secondary',
        }}
      >
        {priceSuffix}
      </Typography>
    </Box>
  );

  const mainRowPaddingY = hasDetails
    ? { xs: 1.5, sm: 1.65 }
    : actions
      ? { xs: 1.75, sm: 1.9 }
      : { xs: 1.85, sm: 2 };

  const body = actions ? (
    <Box sx={{ px: { xs: 2, sm: 2.25 }, pt: mainRowPaddingY, pb: hasDetails ? 0.75 : mainRowPaddingY }}>
      {header}
      <Stack direction="row" spacing={1} sx={{ mt: 1.35 }}>
        {actions}
      </Stack>
    </Box>
  ) : onClick ? (
    <ButtonBase
      focusRipple
      onClick={onClick}
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        borderRadius: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: { xs: 2, sm: 2.25 },
          pt: mainRowPaddingY,
          pb: hasDetails ? 0.75 : mainRowPaddingY,
        }}
      >
        {header}
        {priceColumn}
      </Box>
    </ButtonBase>
  ) : (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: { xs: 2, sm: 2.25 },
        pt: mainRowPaddingY,
        pb: hasDetails ? 0.75 : mainRowPaddingY,
      }}
    >
      {header}
      {priceColumn}
    </Box>
  );

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: selected ? 'visible' : 'hidden',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        ...selectedSx,
        ...(onClick || actions
          ? {
              '&:hover': selected ? undefined : interactiveSx,
              '&:has(:active)': selected ? undefined : interactiveSx,
              '&:has(.Mui-focusVisible)': selected ? undefined : interactiveSx,
            }
          : null),
      }}
    >
      {selected ? (
        <Box
          sx={{
            position: 'absolute',
            top: -9,
            right: -9,
            zIndex: 1,
            width: 26,
            height: 26,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: (t) => resolveAccent(t, accent),
            color: '#fff',
            boxShadow: (t) => `0 0 0 3px ${t.palette.background.default}`,
          }}
          aria-hidden
        >
          <CheckIcon size={14} weight="bold" color="currentColor" />
        </Box>
      ) : null}
      {body}
      {hasDetails ? (
        <Box>
          <ButtonBase
            onClick={() => setDetailsOpen((v) => !v)}
            aria-expanded={detailsOpen}
            sx={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              px: { xs: 2, sm: 2.25 },
              py: 1.1,
              borderTop: '1px solid',
              borderColor: 'divider',
              borderRadius: 0,
              color: 'text.secondary',
              '&:hover': { color: (t) => resolveAccent(t, accent) },
            }}
          >
            <Typography sx={{ fontWeight: 750, fontSize: '0.7rem', letterSpacing: '0.02em' }}>
              Detajet
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                transition: 'transform 0.15s ease',
                transform: detailsOpen ? 'rotate(180deg)' : 'none',
              }}
            >
              <CaretDownIcon size={12} weight="bold" />
            </Box>
          </ButtonBase>
          <Collapse in={detailsOpen} unmountOnExit>
            <Box sx={{ px: { xs: 2, sm: 2.25 }, pb: { xs: 1.25, sm: 1.35 } }}>
              <FeatureList items={details} accent={accent} compact />
            </Box>
          </Collapse>
        </Box>
      ) : null}
    </Box>
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
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
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
          <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.75 }}
            >
              <Typography sx={{ fontWeight: 850, fontSize: '1.05rem', lineHeight: 1.2, minWidth: 0 }}>
                {title}
              </Typography>
              {chips ? (
                <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexShrink: 0, ml: 'auto' }}>{chips}</Box>
              ) : null}
            </Stack>
            {description ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: '0.82rem', lineHeight: 1.45 }}
              >
                {description}
              </Typography>
            ) : null}
            {chips ? (
              <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexWrap: 'wrap', gap: 0.5 }}>{chips}</Box>
            ) : null}
          </Stack>
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
