'use client';

import * as React from 'react';
import { Chip, type SxProps, type Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';

import {
  formatJobListingCountdown,
  getJobListingCountdownUrgency,
  type JobListingCountdownUrgency,
} from '@/lib/job-listing-expiry';

const PLACEHOLDER_LABEL = '0d 0h 00m 00s';

const baseChipSx: SxProps<Theme> = {
  height: 24,
  fontFamily: 'monospace',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 700,
  fontSize: '0.72rem',
  border: '1px solid',
  '& .MuiChip-label': { px: 1 },
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

function tickState(expiresAt: string) {
  return {
    label: formatJobListingCountdown(expiresAt),
    urgency: getJobListingCountdownUrgency(expiresAt),
  };
}

export function JobListingCountdownPlaceholder({
  chipSx,
  variant = 'default',
}: {
  chipSx?: SxProps<Theme>;
  variant?: 'default' | 'overlay';
}) {
  const overlay = variant === 'overlay';
  return (
    <Chip
      label={PLACEHOLDER_LABEL}
      size="small"
      aria-hidden
      sx={{
        ...(overlay ? overlayChipSx : baseChipSx),
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
}: {
  expiresAt: string;
  chipSx?: SxProps<Theme>;
  variant?: 'default' | 'overlay';
}) {
  const overlay = variant === 'overlay';
  const [mounted, setMounted] = React.useState(false);
  const [state, setState] = React.useState<{
    label: string;
    urgency: JobListingCountdownUrgency;
  } | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return undefined;

    const update = () => setState(tickState(expiresAt));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, mounted]);

  if (!mounted) {
    return <JobListingCountdownPlaceholder chipSx={chipSx} variant={variant} />;
  }

  const label = state?.label ?? PLACEHOLDER_LABEL;
  const urgency = state?.urgency ?? 'normal';

  return (
    <Chip
      label={label}
      size="small"
      aria-live="polite"
      suppressHydrationWarning
      sx={{
        ...(overlay ? overlayChipSx : baseChipSx),
        ...chipUrgencySx(urgency, overlay),
        ...(chipSx as object),
      }}
    />
  );
}
