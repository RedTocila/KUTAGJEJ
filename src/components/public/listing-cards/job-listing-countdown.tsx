'use client';

import * as React from 'react';
import { Chip, type SxProps, type Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';

import {
  formatJobListingCountdown,
  getJobCountdownParts,
  getJobListingCountdownUrgency,
  type JobListingCountdownUrgency,
} from '@/lib/job-listing-expiry';
import { useSharedSecondTick } from '@/hooks/use-shared-second-tick';

const PLACEHOLDER_LABEL = '0d 0h 00m 00s';
const COMPACT_PLACEHOLDER_LABEL = '0d';

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

/** Shared with OKAZION countdown chip — identical size/radius on mobile + desktop. */
const overlayChipSx: SxProps<Theme> = {
  height: 26,
  borderRadius: '8px',
  fontFamily: 'monospace',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 700,
  fontSize: '0.72rem',
  letterSpacing: '0.02em',
  border: '1px solid',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.28)',
  '& .MuiChip-label': { px: 1.15 },
};

function chipSizeSx(variant: JobListingCountdownVariant): SxProps<Theme> {
  if (variant === 'overlay') return overlayChipSx;
  if (variant === 'compact') return compactChipSx;
  return baseChipSx;
}

function chipUrgencySx(urgency: JobListingCountdownUrgency, overlay: boolean) {
  if (overlay) {
    if (urgency === 'critical') {
      return {
        color: '#fff',
        bgcolor: alpha('#dc2626', 0.72),
        borderColor: alpha('#fff', 0.22),
      };
    }
    if (urgency === 'warning') {
      return {
        color: '#fff',
        bgcolor: alpha('#d97706', 0.72),
        borderColor: alpha('#fff', 0.22),
      };
    }
    return {
      color: '#fff',
      bgcolor: alpha('#000', 0.52),
      borderColor: alpha('#fff', 0.18),
    };
  }

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

function tickState(expiresAt: string, now: Date) {
  return {
    label: formatJobListingCountdown(expiresAt, now),
    urgency: getJobListingCountdownUrgency(expiresAt, now),
  };
}

function formatCompactCountdown(expiresAt: string, now: Date): string {
  const parts = getJobCountdownParts(expiresAt, now);
  if (parts.expired) return '0h';
  if (parts.days > 0) return `${parts.days}d`;
  if (parts.hours > 0) return `${parts.hours}h`;
  return `${Math.max(1, parts.minutes)}m`;
}

export function JobListingCountdownPlaceholder({
  chipSx,
  variant = 'default',
  condensed = false,
}: {
  chipSx?: SxProps<Theme>;
  variant?: JobListingCountdownVariant;
  condensed?: boolean;
}) {
  const overlay = variant === 'overlay';
  return (
    <Chip
      label={condensed ? COMPACT_PLACEHOLDER_LABEL : PLACEHOLDER_LABEL}
      size="small"
      aria-hidden
      sx={{
        ...(chipSizeSx(variant) as object),
        ...chipUrgencySx('normal', overlay),
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
}: {
  expiresAt: string;
  chipSx?: SxProps<Theme>;
  variant?: JobListingCountdownVariant;
  condensed?: boolean;
}) {
  const overlay = variant === 'overlay';
  const [mounted, setMounted] = React.useState(false);
  const nowMs = useSharedSecondTick();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <JobListingCountdownPlaceholder chipSx={chipSx} variant={variant} condensed={condensed} />;
  }

  const now = new Date(nowMs ?? 0);
  const { urgency } = tickState(expiresAt, now);
  const label = condensed ? formatCompactCountdown(expiresAt, now) : formatJobListingCountdown(expiresAt, now);

  return (
    <Chip
      label={label}
      size="small"
      aria-live="polite"
      suppressHydrationWarning
      sx={{
        ...(chipSizeSx(variant) as object),
        ...chipUrgencySx(urgency, overlay),
        ...(chipSx as object),
      }}
    />
  );
}
