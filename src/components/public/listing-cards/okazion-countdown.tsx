'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Timer as TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';

import { getJobCountdownParts } from '@/lib/job-listing-expiry';

/** OKAZION packs always last this many days. */
export const OKAZION_COUNTDOWN_DAYS = 5;

const PLACEHOLDER_PARTS = { days: OKAZION_COUNTDOWN_DAYS, hours: 0, minutes: 0, seconds: 0 };

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function Unit({ value, suffix }: { value: string; suffix: string }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.15 }}>
      <Typography
        component="span"
        sx={{
          fontWeight: 900,
          fontSize: '0.82rem',
          lineHeight: 1,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          color: '#fff',
        }}
      >
        {value}
      </Typography>
      <Typography
        component="span"
        sx={{
          fontWeight: 800,
          fontSize: '0.62rem',
          lineHeight: 1,
          color: 'rgba(255,255,255,0.78)',
          textTransform: 'lowercase',
        }}
      >
        {suffix}
      </Typography>
    </Box>
  );
}

function OkazionCountdownShell({
  days,
  hours,
  minutes,
  seconds,
  live = false,
}: {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  live?: boolean;
}) {
  return (
    <Stack
      direction="row"
      spacing={0.65}
      aria-live={live ? 'polite' : undefined}
      aria-hidden={!live}
      suppressHydrationWarning
      sx={{
        alignItems: 'center',
        height: 28,
        px: 1,
        borderRadius: 1.5,
        color: '#fff',
        flexShrink: 0,
        bgcolor: 'rgba(247, 47, 53, 0.38)',
        border: '1px solid',
        borderColor: 'rgba(247, 47, 53, 0.55)',
        backdropFilter: 'blur(12px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
        boxShadow: `0 4px 14px rgba(247, 47, 53, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.16)`,
      }}
    >
      <TimerIcon size={14} weight="bold" color="#fff" style={{ flexShrink: 0 }} />
      <Stack direction="row" spacing={0.55} sx={{ alignItems: 'baseline' }}>
        <Unit value={String(days)} suffix="d" />
        <Unit value={pad2(hours)} suffix="h" />
        <Unit value={pad2(minutes)} suffix="m" />
        <Unit value={pad2(seconds)} suffix="s" />
      </Stack>
    </Stack>
  );
}

export function OkazionCountdownPlaceholder() {
  return (
    <OkazionCountdownShell
      days={PLACEHOLDER_PARTS.days}
      hours={PLACEHOLDER_PARTS.hours}
      minutes={PLACEHOLDER_PARTS.minutes}
      seconds={PLACEHOLDER_PARTS.seconds}
    />
  );
}

/**
 * Live countdown until OKAZION expires. Packs are always 5 days —
 * when `expiresAt` is missing, falls back to a fresh 5-day window.
 */
export function OkazionCountdown({ expiresAt }: { expiresAt?: string | null }) {
  const [mounted, setMounted] = React.useState(false);
  const [parts, setParts] = React.useState(PLACEHOLDER_PARTS);
  const fallbackUntilRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return undefined;

    const resolveUntil = () => {
      if (expiresAt) return expiresAt;
      if (!fallbackUntilRef.current) {
        fallbackUntilRef.current = new Date(
          Date.now() + OKAZION_COUNTDOWN_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString();
      }
      return fallbackUntilRef.current;
    };

    const update = () => {
      const next = getJobCountdownParts(resolveUntil());
      setParts({
        days: next.days,
        hours: next.hours,
        minutes: next.minutes,
        seconds: next.seconds,
      });
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, mounted]);

  if (!mounted) {
    return <OkazionCountdownPlaceholder />;
  }

  return (
    <OkazionCountdownShell
      days={parts.days}
      hours={parts.hours}
      minutes={parts.minutes}
      seconds={parts.seconds}
      live
    />
  );
}
