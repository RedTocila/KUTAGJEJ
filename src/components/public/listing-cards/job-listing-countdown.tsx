'use client';

import * as React from 'react';
import { Chip, type SxProps, type Theme } from '@mui/material';

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

function tickState(expiresAt: string) {
  return {
    label: formatJobListingCountdown(expiresAt),
    urgency: getJobListingCountdownUrgency(expiresAt),
  };
}

export function JobListingCountdownPlaceholder({ chipSx }: { chipSx?: SxProps<Theme> }) {
  return (
    <Chip
      label={PLACEHOLDER_LABEL}
      size="small"
      aria-hidden
      sx={{ ...baseChipSx, ...chipUrgencySx('normal'), ...(chipSx as object) }}
    />
  );
}

export function JobListingCountdown({
  expiresAt,
  chipSx,
}: {
  expiresAt: string;
  chipSx?: SxProps<Theme>;
}) {
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
    return <JobListingCountdownPlaceholder chipSx={chipSx} />;
  }

  const label = state?.label ?? PLACEHOLDER_LABEL;
  const urgency = state?.urgency ?? 'normal';

  return (
    <Chip
      label={label}
      size="small"
      aria-live="polite"
      suppressHydrationWarning
      sx={{ ...baseChipSx, ...chipUrgencySx(urgency), ...(chipSx as object) }}
    />
  );
}
