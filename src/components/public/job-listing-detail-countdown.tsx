'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';

import {
  getJobCountdownParts,
  getJobListingCountdownUrgency,
  type JobCountdownParts,
  type JobListingCountdownUrgency,
} from '@/lib/job-listing-expiry';
import { primaryMainAlpha } from '@/lib/css-var-alpha';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function accentToken(urgency: JobListingCountdownUrgency): {
  color: string;
  soft: string;
  ring: string;
  cell: string;
  cellBorder: string;
} {
  if (urgency === 'critical') {
    return {
      color: 'var(--mui-palette-error-main)',
      soft: 'rgba(239, 68, 68, 0.16)',
      ring: 'rgba(239, 68, 68, 0.45)',
      cell: 'rgba(239, 68, 68, 0.18)',
      cellBorder: 'rgba(239, 68, 68, 0.4)',
    };
  }
  if (urgency === 'warning') {
    return {
      color: 'var(--mui-palette-warning-main)',
      soft: 'rgba(245, 158, 11, 0.14)',
      ring: 'rgba(245, 158, 11, 0.4)',
      cell: 'rgba(245, 158, 11, 0.16)',
      cellBorder: 'rgba(245, 158, 11, 0.38)',
    };
  }
  return {
    color: 'var(--mui-palette-primary-main)',
    soft: primaryMainAlpha(0.14),
    ring: primaryMainAlpha(0.42),
    cell: primaryMainAlpha(0.16),
    cellBorder: primaryMainAlpha(0.38),
  };
}

function TimeCell({
  value,
  label,
  accent,
  cellBg,
  cellBorder,
  pulse,
}: {
  value: string;
  label: string;
  accent: string;
  cellBg: string;
  cellBorder: string;
  pulse?: boolean;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        textAlign: 'center',
        px: 0.65,
        py: 1.05,
        borderRadius: 1.5,
        bgcolor: cellBg,
        border: '1px solid',
        borderColor: cellBorder,
        ...(pulse
          ? {
              animation: 'urgentPulse 1s ease-in-out infinite',
              '@keyframes urgentPulse': {
                '0%, 100%': { borderColor: cellBorder },
                '50%': { borderColor: accent },
              },
            }
          : null),
      }}
    >
      <Typography
        sx={{
          fontWeight: 900,
          fontSize: { xs: '1.4rem', sm: '1.55rem' },
          lineHeight: 1,
          letterSpacing: '-0.04em',
          color: accent,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          mt: 0.55,
          fontSize: '0.62rem',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: accent,
          opacity: 0.78,
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export function JobListingDetailCountdown({ expiresAt }: { expiresAt: string }) {
  const [mounted, setMounted] = React.useState(false);
  const [parts, setParts] = React.useState<JobCountdownParts>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });
  const [urgency, setUrgency] = React.useState<JobListingCountdownUrgency>('normal');

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return undefined;
    const tick = () => {
      setParts(getJobCountdownParts(expiresAt));
      setUrgency(getJobListingCountdownUrgency(expiresAt));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, mounted]);

  const display = mounted
    ? parts
    : { days: 0, hours: 0, minutes: 0, seconds: 0, expired: false };
  const accent = accentToken(urgency);
  const live = !display.expired;

  return (
    <Box
      sx={{
        width: '100%',
        p: 1.4,
        borderRadius: 2,
        border: '1px solid',
        borderColor: accent.ring,
        bgcolor: accent.soft,
        backgroundImage: `linear-gradient(160deg, ${accent.soft} 0%, rgba(0,0,0,0.12) 100%)`,
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.15 }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          {live ? (
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: accent.color,
                flexShrink: 0,
                animation: 'urgentDot 1.2s ease-in-out infinite',
                '@keyframes urgentDot': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.4 },
                },
              }}
            />
          ) : null}
          <Typography sx={{ fontWeight: 900, fontSize: '0.9rem', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
            {display.expired ? 'Afati ka përfunduar' : 'Apliko brenda'}
          </Typography>
        </Stack>
        <Typography
          sx={{
            fontSize: '0.7rem',
            color: accent.color,
            fontWeight: 700,
            lineHeight: 1.2,
            opacity: 0.9,
            flexShrink: 0,
          }}
        >
          {display.expired ? 'Nuk pranon aplikime' : 'deri sa të mbyllet'}
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 0.7,
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        <TimeCell
          value={String(display.days)}
          label="Ditë"
          accent={accent.color}
          cellBg={accent.cell}
          cellBorder={accent.cellBorder}
        />
        <TimeCell
          value={pad2(display.hours)}
          label="Orë"
          accent={accent.color}
          cellBg={accent.cell}
          cellBorder={accent.cellBorder}
        />
        <TimeCell
          value={pad2(display.minutes)}
          label="Min"
          accent={accent.color}
          cellBg={accent.cell}
          cellBorder={accent.cellBorder}
        />
        <TimeCell
          value={pad2(display.seconds)}
          label="Sek"
          accent={accent.color}
          cellBg={accent.cell}
          cellBorder={accent.cellBorder}
          pulse={live}
        />
      </Box>
    </Box>
  );
}
