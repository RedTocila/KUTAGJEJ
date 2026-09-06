'use client';

import * as React from 'react';
import { Box, Chip, Typography, type SxProps, type Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Timer as TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';

import { ListingPremiumBadge } from '@/components/public/listing-premium-badge';
import {
  formatJobListingCountdown,
  getJobCountdownParts,
  getJobListingCountdownUrgency,
  type JobListingCountdownUrgency,
} from '@/lib/job-listing-expiry';
import { useSharedSecondTick } from '@/hooks/use-shared-second-tick';

const PLACEHOLDER_LABEL = '0d 0h 00m';
const COMPACT_PLACEHOLDER_LABEL = '0d 0h';

export type JobListingCountdownVariant = 'default' | 'overlay' | 'compact';

const baseChipSx: SxProps<Theme> = {
  height: 24,
  borderRadius: '8px',
  fontFamily: 'monospace',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 700,
  fontSize: '0.72rem',
  border: '1px solid',
  '& .MuiChip-label': { px: 1 },
};

/** Compact search-row chip — sits next to salary on job result cards. */
const compactChipSx: SxProps<Theme> = {
  height: 20,
  borderRadius: '8px',
  fontFamily: 'monospace',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 700,
  fontSize: '0.62rem',
  letterSpacing: '0.01em',
  border: '1px solid',
  '& .MuiChip-label': { px: 0.75 },
};

/** Shared dark-glass pill — equal inset + gap for stopwatch / premium seal. */
function overlayPillSx(condensed: boolean): SxProps<Theme> {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: condensed ? '5px' : '6px',
    boxSizing: 'border-box',
    height: condensed ? 24 : 32,
    px: condensed ? '7px' : '9px',
    py: 0,
    borderRadius: condensed ? 999 : '8px',
    border: '1px solid',
    borderColor: alpha('#fff', condensed ? 0.28 : 0.3),
    bgcolor: alpha('#000', 0.72),
    color: '#fff',
    backdropFilter: condensed ? 'blur(10px)' : 'blur(12px)',
    WebkitBackdropFilter: condensed ? 'blur(10px)' : 'blur(12px)',
    boxShadow: condensed ? '0 2px 8px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.28)',
    flexShrink: 0,
    width: 'auto',
    minWidth: 'fit-content',
    lineHeight: 0,
  };
}

function chipSizeSx(variant: JobListingCountdownVariant): SxProps<Theme> {
  if (variant === 'compact') return compactChipSx;
  return baseChipSx;
}

function chipUrgencySx(urgency: JobListingCountdownUrgency) {
  if (urgency === 'critical') {
    return {
      color: 'error.main',
      bgcolor: 'rgba(var(--mui-palette-error-mainChannel) / 0.12)',
      borderColor: 'rgba(var(--mui-palette-error-mainChannel) / 0.38)',
    };
  }
  if (urgency === 'warning') {
    return {
      color: 'warning.main',
      bgcolor: 'rgba(var(--mui-palette-warning-mainChannel) / 0.12)',
      borderColor: 'rgba(var(--mui-palette-warning-mainChannel) / 0.38)',
    };
  }
  return {
    color: 'text.secondary',
    bgcolor: 'rgba(var(--mui-palette-text-secondaryChannel) / 0.08)',
    borderColor: 'rgba(var(--mui-palette-text-secondaryChannel) / 0.22)',
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Overlay labels match Okazion length (`Xd Xh XXm` / compact `Xd Xh`). */
function formatOverlayCountdown(expiresAt: string, now: Date, condensed: boolean): string {
  const parts = getJobCountdownParts(expiresAt, now);
  if (parts.expired) return condensed ? '0d 0h' : 'Skaduar';
  if (condensed) return `${parts.days}d ${parts.hours}h`;
  return `${parts.days}d ${parts.hours}h ${pad2(parts.minutes)}m`;
}

function formatCompactCountdown(expiresAt: string, now: Date): string {
  const parts = getJobCountdownParts(expiresAt, now);
  if (parts.expired) return '0h';
  if (parts.days > 0) return `${parts.days}d`;
  if (parts.hours > 0) return `${parts.hours}h`;
  return `${Math.max(1, parts.minutes)}m`;
}

function OverlayCountdownIcon({ premium, size }: { premium: boolean; size: number }) {
  if (premium) {
    return <ListingPremiumBadge size={size} aria-label="Premium" />;
  }
  return <TimerIcon size={size} weight="bold" color="currentColor" aria-hidden />;
}

function OverlayCountdownPill({
  label,
  premium,
  condensed,
  live = false,
  chipSx,
}: {
  label: string;
  premium: boolean;
  condensed: boolean;
  live?: boolean;
  chipSx?: SxProps<Theme>;
}) {
  const iconSize = condensed ? 14 : 18;
  return (
    <Box
      component="span"
      className="listing-countdown-pulse-container"
      aria-live={live ? 'polite' : undefined}
      aria-hidden={!live}
      suppressHydrationWarning
      sx={[overlayPillSx(condensed), ...(Array.isArray(chipSx) ? chipSx : chipSx ? [chipSx] : [])]}
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: iconSize,
          height: iconSize,
          lineHeight: 0,
        }}
      >
        <OverlayCountdownIcon premium={premium} size={iconSize} />
      </Box>
      <Typography
        component="span"
        className="listing-countdown-pulse-glyph"
        suppressHydrationWarning
        sx={{
          color: 'inherit',
          fontFamily: 'monospace',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: condensed ? 800 : 700,
          fontSize: condensed ? '0.69rem' : '0.78rem',
          letterSpacing: '0.02em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export function JobListingCountdownPlaceholder({
  chipSx,
  variant = 'default',
  condensed = false,
  bare = false,
  showClock = false,
  premium = false,
}: {
  chipSx?: SxProps<Theme>;
  variant?: JobListingCountdownVariant;
  condensed?: boolean;
  bare?: boolean;
  /** @deprecated Prefer overlay Chip with stopwatch icon; kept for bare call sites. */
  showClock?: boolean;
  /** When true on overlay, show premium seal instead of stopwatch. */
  premium?: boolean;
}) {
  const overlay = variant === 'overlay';
  const label = condensed ? COMPACT_PLACEHOLDER_LABEL : PLACEHOLDER_LABEL;
  if (bare) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'inherit' }}>
        {showClock ? (
          <TimerIcon size={14} weight="bold" color="currentColor" className="listing-countdown-pulse-glyph" />
        ) : null}
        <Typography
          component="span"
          aria-hidden
          className="listing-countdown-pulse-glyph"
          sx={{
            color: 'inherit',
            fontFamily: 'monospace',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.02em',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Typography>
      </span>
    );
  }
  if (overlay) {
    return <OverlayCountdownPill label={label} premium={premium} condensed={condensed} chipSx={chipSx} />;
  }
  return (
    <Chip
      label={label}
      size="small"
      aria-hidden
      className="listing-countdown-pulse-container"
      sx={{
        ...(chipSizeSx(variant) as object),
        ...chipUrgencySx('normal'),
        ...(chipSx as object),
      }}
    />
  );
}

export function JobListingCountdown({
  expiresAt,
  chipSx,
  variant = 'default',
  condensed = false,
  bare = false,
  showClock = false,
  premium = false,
}: {
  expiresAt: string;
  chipSx?: SxProps<Theme>;
  variant?: JobListingCountdownVariant;
  condensed?: boolean;
  bare?: boolean;
  /** @deprecated Prefer overlay Chip with stopwatch icon; kept for bare call sites. */
  showClock?: boolean;
  /** When true on overlay, show premium seal instead of stopwatch. */
  premium?: boolean;
}) {
  const overlay = variant === 'overlay';
  const [mounted, setMounted] = React.useState(false);
  const nowMs = useSharedSecondTick();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <JobListingCountdownPlaceholder
        chipSx={chipSx}
        variant={variant}
        condensed={condensed}
        bare={bare}
        showClock={showClock}
        premium={premium}
      />
    );
  }

  const now = new Date(nowMs ?? 0);
  const urgency = getJobListingCountdownUrgency(expiresAt, now);
  const label = overlay
    ? formatOverlayCountdown(expiresAt, now, condensed)
    : condensed
      ? formatCompactCountdown(expiresAt, now)
      : formatJobListingCountdown(expiresAt, now);

  if (bare) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'inherit' }}>
        {showClock ? (
          <TimerIcon size={14} weight="bold" color="currentColor" className="listing-countdown-pulse-glyph" />
        ) : null}
        <Typography
          component="span"
          aria-live="polite"
          suppressHydrationWarning
          className="listing-countdown-pulse-glyph"
          sx={{
            color: 'inherit',
            fontFamily: 'monospace',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.02em',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Typography>
      </span>
    );
  }

  if (overlay) {
    return (
      <OverlayCountdownPill label={label} premium={premium} condensed={condensed} live chipSx={chipSx} />
    );
  }

  return (
    <Chip
      label={label}
      size="small"
      aria-live="polite"
      suppressHydrationWarning
      className="listing-countdown-pulse-container"
      sx={{
        ...(chipSizeSx(variant) as object),
        ...chipUrgencySx(urgency),
        ...(chipSx as object),
      }}
    />
  );
}
