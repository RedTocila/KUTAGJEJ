'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';
import HourglassEmptyOutlined from '@mui/icons-material/HourglassEmptyOutlined';

import {
  getJobCountdownParts,
  getJobListingCountdownUrgency,
  type JobCountdownParts,
  type JobListingCountdownUrgency,
} from '@/lib/job-listing-expiry';

/** 14px body baseline for job detail. */
const FONT_BODY = '0.875rem';
const FONT_CAPTION = '0.75rem';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function accentColorForUrgency(urgency: JobListingCountdownUrgency): string {
  if (urgency === 'critical') return 'error.main';
  if (urgency === 'warning') return 'warning.main';
  return 'primary.main';
}

function CountdownUnit({
  value,
  unit,
  urgency,
}: {
  value: number;
  unit: string;
  urgency: JobListingCountdownUrgency;
}) {
  const accent = accentColorForUrgency(urgency);

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        py: { xs: 1, sm: 1.25 },
        px: { xs: 0.25, sm: 0.5 },
        borderRadius: 2,
        bgcolor: 'rgba(0,0,0,0.35)',
        border: '1px solid',
        borderColor: accent,
        textAlign: 'center',
      }}
    >
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '1.125rem',
          lineHeight: 1.1,
          color: accent,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {pad2(value)}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontWeight: 600, fontSize: FONT_CAPTION }}
      >
        {unit}
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
  const accent = accentColorForUrgency(urgency);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: accent,
        bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.55)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: accent,
            color:
              urgency === 'warning'
                ? 'warning.contrastText'
                : urgency === 'critical'
                  ? 'error.contrastText'
                  : 'primary.contrastText',
          }}
        >
          <HourglassEmptyOutlined sx={{ fontSize: 24 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY, lineHeight: 1.3 }}>
            {display.expired ? 'Afati ka përfunduar' : 'Apliko brenda'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: FONT_CAPTION }}>
            {display.expired ? 'Njoftimi nuk pranon më aplikime' : 'Mbyllet pas:'}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: { xs: 0.5, sm: 0.75 },
          width: '100%',
          minWidth: 0,
        }}
      >
        <CountdownUnit value={display.days} unit="Ditë" urgency={urgency} />
        <CountdownUnit value={display.hours} unit="Orë" urgency={urgency} />
        <CountdownUnit value={display.minutes} unit="Min" urgency={urgency} />
        <CountdownUnit value={display.seconds} unit="Sek" urgency={urgency} />
      </Box>
    </Box>
  );
}
