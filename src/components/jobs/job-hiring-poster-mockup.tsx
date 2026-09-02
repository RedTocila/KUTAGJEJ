'use client';

import * as React from 'react';
import { Box, Stack, Typography, keyframes } from '@mui/material';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { CurrencyCircleDollar as CurrencyIcon } from '@phosphor-icons/react/dist/ssr/CurrencyCircleDollar';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Timer as TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';

import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { useSharedSecondTick } from '@/hooks/use-shared-second-tick';
import {
  buildJobHiringPosterFields,
  resolveJobPosterTheme,
  type JobHiringPosterInput,
  type JobHiringPosterTheme,
} from '@/lib/job-hiring-poster';
import { formatJobListingCountdown, getJobListingExpiresAt } from '@/lib/job-listing-expiry';

const POSTER_ROW_LINE = 'rgba(255, 255, 255, 0.14)';

const posterTimerPulse = keyframes`
  0%, 100% {
    color: #fca5a5;
    text-shadow: 0 0 4px rgba(248, 113, 113, 0.45);
  }
  50% {
    color: #ef4444;
    text-shadow: 0 0 10px rgba(239, 68, 68, 0.9);
  }
`;

/** Tall speech bubble — body runs low; tail at bottom-left. */
const BUBBLE_VIEWBOX = '0 0 100 112';
const BUBBLE_PATH =
  'M 10 4 H 90 Q 96 4 96 10 V 92 Q 96 98 90 98 H 24 L 10 110 L 15 98 H 10 Q 4 98 4 92 V 10 Q 4 4 10 4 Z';

/** One width-based scale for the bubble interior — rows use em so everything stays proportional. */
const BUBBLE_BASE_FONT = {
  default: '7.6cqw',
  card: '6.8cqw',
} as const;

export type JobHiringPosterMockupVariant = 'default' | 'card';

export type JobHiringPosterMockupProps = JobHiringPosterInput & {
  variant?: JobHiringPosterMockupVariant;
  posterColorSeed?: number | null;
  listingId?: string | null;
  previewSeed?: number | null;
  theme?: JobHiringPosterTheme;
  expiresAt?: string | null;
  createdAt?: string | null;
  bumpedAt?: string | null;
};

type PosterRowProps = {
  icon: React.ReactNode;
  value: string;
  accent: string;
  multiline?: boolean;
  isLast?: boolean;
};

function PosterRow({ icon, value, accent, multiline = false, isLast = false }: PosterRowProps) {
  return (
    <Stack
      direction="row"
      spacing="0.5em"
      sx={{
        alignItems: multiline ? 'flex-start' : 'center',
        py: '0.36em',
        borderBottom: isLast ? 'none' : `1px solid ${POSTER_ROW_LINE}`,
        minWidth: 0,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          color: accent,
          flexShrink: 0,
          mt: multiline ? '0.06em' : 0,
          display: 'flex',
          fontSize: '1.12em',
          lineHeight: 0,
          '& svg': { width: '1em', height: '1em' },
        }}
      >
        {icon}
      </Box>
      <Typography
        component="div"
        sx={{
          color: '#fff',
          fontWeight: 700,
          fontSize: '1em',
          lineHeight: 1.24,
          textTransform: 'uppercase',
          minWidth: 0,
          flex: 1,
          ...(multiline
            ? {
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
            : {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }),
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function PosterBubbleCountdown({ expiresAt }: { expiresAt: string }) {
  const [mounted, setMounted] = React.useState(false);
  const nowMs = useSharedSecondTick();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const label = mounted
    ? formatJobListingCountdown(expiresAt, new Date(nowMs ?? Date.now()))
    : '15d 0h 00m 00s';

  return (
    <Stack
      direction="row"
      spacing="0.5em"
      sx={{
        alignItems: 'center',
        pt: '0.32em',
        minWidth: 0,
        flexShrink: 0,
        overflow: 'hidden',
        fontSize: '1.06em',
      }}
    >
      <Box
        sx={{
          color: '#ef4444',
          flexShrink: 0,
          display: 'flex',
          fontSize: '1.12em',
          lineHeight: 0,
          animation: `${posterTimerPulse} 1.8s ease-in-out infinite`,
          '& svg': { width: '1em', height: '1em' },
        }}
      >
        <TimerIcon weight="fill" />
      </Box>
      <Typography
        aria-live="polite"
        suppressHydrationWarning
        sx={{
          color: '#fca5a5',
          fontFamily: 'monospace',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 800,
          fontSize: '1em',
          letterSpacing: '0.02em',
          lineHeight: 1.15,
          whiteSpace: 'nowrap',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          animation: `${posterTimerPulse} 1.8s ease-in-out infinite`,
          willChange: 'color, text-shadow',
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}

function SpeechBubblePanel({
  theme,
  children,
}: {
  theme: JobHiringPosterTheme;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        bgcolor: theme.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        px: '2.5%',
        py: '2%',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          maxWidth: '96%',
          maxHeight: '100%',
          overflow: 'hidden',
        }}
      >
        <Box
          component="svg"
          viewBox={BUBBLE_VIEWBOX}
          preserveAspectRatio="none"
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            filter: 'drop-shadow(0 5px 12px rgba(0, 0, 0, 0.22))',
          }}
        >
          <path d={BUBBLE_PATH} fill={theme.bubble} />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            top: '7%',
            right: '10%',
            bottom: '15%',
            left: '10%',
            overflow: 'hidden',
            containerType: 'inline-size',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

function resolvePosterExpiresAt(input: {
  expiresAt?: string | null;
  createdAt?: string | null;
  bumpedAt?: string | null;
}): string {
  if (input.expiresAt) return input.expiresAt;
  if (input.createdAt) return getJobListingExpiresAt(input.createdAt, input.bumpedAt).toISOString();
  return getJobListingExpiresAt(new Date()).toISOString();
}

/**
 * Hiring poster mockup — centered speech-bubble panel, accent rows, icon + value rows.
 */
export function JobHiringPosterMockup({
  variant = 'default',
  title,
  companyName,
  requiredRoles,
  cityName,
  zoneName,
  locationAddress,
  experience,
  education,
  jobType,
  salary,
  currency,
  posterColorSeed,
  listingId,
  previewSeed,
  theme: themeOverride,
  expiresAt,
  createdAt,
  bumpedAt,
}: JobHiringPosterMockupProps) {
  const compact = variant === 'card';
  const baseFont = compact ? BUBBLE_BASE_FONT.card : BUBBLE_BASE_FONT.default;
  const t = useCopy();
  const { language } = useLanguage();
  const theme = React.useMemo(
    () =>
      themeOverride ??
      resolveJobPosterTheme({
        posterColorSeed,
        listingId,
        previewSeed,
      }),
    [listingId, posterColorSeed, previewSeed, themeOverride]
  );
  const countdownExpiresAt = React.useMemo(
    () => resolvePosterExpiresAt({ expiresAt, createdAt, bumpedAt }),
    [bumpedAt, createdAt, expiresAt]
  );
  const fields = React.useMemo(
    () =>
      buildJobHiringPosterFields(
        {
          title,
          companyName,
          requiredRoles,
          cityName,
          zoneName,
          locationAddress,
          experience,
          education,
          jobType,
          salary,
          currency,
        },
        t.jobPoster,
        language
      ),
    [
      title,
      companyName,
      requiredRoles,
      cityName,
      zoneName,
      locationAddress,
      experience,
      education,
      jobType,
      salary,
      currency,
      t.jobPoster,
      language,
    ]
  );
  const rolesLabel = fields.roles.join(' · ');
  const headline = String(title ?? '').trim() || t.jobPoster.openPosition;

  return (
    <Box
      role="img"
      aria-label={`${headline}, ${fields.location}`}
      sx={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      <SpeechBubblePanel theme={theme}>
        <Box
          sx={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontSize: baseFont,
            lineHeight: 1.2,
          }}
        >
          <Box sx={{ flexShrink: 0, minWidth: 0, overflow: 'hidden', fontSize: '1.58em', mb: '0.38em' }}>
            <Typography
              component="div"
              sx={{
                color: theme.accent,
                fontWeight: 900,
                fontSize: '1em',
                lineHeight: 1.06,
                letterSpacing: '-0.02em',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {headline}
            </Typography>
            <Box
              sx={{
                mt: '0.3em',
                width: '2.2em',
                height: '0.16em',
                borderRadius: 999,
                bgcolor: theme.background,
              }}
            />
          </Box>

          <Stack sx={{ flex: 1, minHeight: 0, overflow: 'hidden', justifyContent: 'flex-start' }}>
            <PosterRow icon={<BriefcaseIcon weight="fill" />} value={rolesLabel} accent={theme.accent} multiline />
            <PosterRow icon={<MapPinIcon weight="fill" />} value={fields.location} accent={theme.accent} multiline />
            <PosterRow icon={<CurrencyIcon weight="fill" />} value={fields.salary} accent={theme.accent} isLast />
            <PosterBubbleCountdown expiresAt={countdownExpiresAt} />
          </Stack>
        </Box>
      </SpeechBubblePanel>
    </Box>
  );
}
