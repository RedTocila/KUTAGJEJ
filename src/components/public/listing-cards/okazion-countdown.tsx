'use client';

import * as React from 'react';
import { Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
import { Timer as TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';

import { OKAZION_ACCENT } from '@/lib/home-categories';
import { useSharedSecondTick } from '@/hooks/use-shared-second-tick';
import { formatJobListingCountdown, getJobCountdownParts } from '@/lib/job-listing-expiry';

/** OKAZION packs always last this many days. */
export const OKAZION_COUNTDOWN_DAYS = 5;

const PLACEHOLDER_LABEL = `${OKAZION_COUNTDOWN_DAYS}d 0h 00m 00s`;
const COMPACT_PLACEHOLDER_LABEL = `${OKAZION_COUNTDOWN_DAYS}d 0h`;

const overlayChipSx = {
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
  color: '#fff',
  bgcolor: alpha('#dc2626', 0.52),
  borderColor: alpha('#fff', 0.18),
  '& .MuiChip-icon': {
    color: '#fff',
    ml: 0.75,
    mr: -0.25,
  },
  '& .MuiChip-label': { px: 1.15, overflow: 'visible', whiteSpace: 'nowrap' },
} as const;

const compactOverlayChipSx = {
  height: 24,
  borderRadius: 999,
  fontFamily: 'inherit',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 800,
  fontSize: '0.69rem',
  letterSpacing: '0.01em',
  border: '1px solid',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  color: '#fff',
  bgcolor: OKAZION_ACCENT,
  borderColor: alpha('#fff', 0.28),
  flexShrink: 0,
  width: 'auto',
  minWidth: 'fit-content',
  '& .MuiChip-icon': {
    color: '#fff',
    ml: '6px',
    mr: '-3px',
    flexShrink: 0,
  },
  '& .MuiChip-label': {
    pl: '5px',
    pr: '8px',
    overflow: 'visible',
    textOverflow: 'clip',
    whiteSpace: 'nowrap',
    display: 'inline-block',
  },
} as const;

function formatCompactCountdown(expiresAt: string | Date, now: Date = new Date()): string {
  const parts = getJobCountdownParts(expiresAt, now);
  if (parts.expired) return '0d 0h';
  return `${parts.days}d ${parts.hours}h`;
}

function OkazionCountdownChip({
  label,
  live = false,
  compact = false,
}: {
  label: string;
  live?: boolean;
  compact?: boolean;
}) {
  return (
    <Chip
      icon={compact ? <SealPercentIcon size={13} weight="bold" /> : <TimerIcon size={14} weight="bold" />}
      label={label}
      size="small"
      className="listing-countdown-pulse-container"
      aria-live={live ? 'polite' : undefined}
      aria-hidden={!live}
      suppressHydrationWarning
      sx={compact ? compactOverlayChipSx : overlayChipSx}
    />
  );
}

export function OkazionCountdownPlaceholder({ compact = false }: { compact?: boolean }) {
  return <OkazionCountdownChip label={compact ? COMPACT_PLACEHOLDER_LABEL : PLACEHOLDER_LABEL} compact={compact} />;
}

/**
 * Live countdown until OKAZION expires. Packs are always 5 days —
 * when `expiresAt` is missing, falls back to a fresh 5-day window.
 * Uses a shared 1Hz clock so many cards on the home feed don't each open a timer.
 */
export function OkazionCountdown({
  expiresAt,
  compact = false,
}: {
  expiresAt?: string | null;
  compact?: boolean;
}) {
  const [mounted, setMounted] = React.useState(false);
  const nowMs = useSharedSecondTick();
  const fallbackUntilRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
    if (expiresAt) {
      fallbackUntilRef.current = null;
    } else if (!fallbackUntilRef.current) {
      fallbackUntilRef.current = new Date(
        Date.now() + OKAZION_COUNTDOWN_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();
    }
  }, [expiresAt]);

  const until = expiresAt ?? fallbackUntilRef.current;

  if (!mounted || !nowMs || !until) {
    return <OkazionCountdownPlaceholder compact={compact} />;
  }

  const label = compact
    ? formatCompactCountdown(until, new Date(nowMs))
    : formatJobListingCountdown(until, new Date(nowMs));

  return <OkazionCountdownChip label={label} live compact={compact} />;
}
