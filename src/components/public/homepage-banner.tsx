'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import ArrowForward from '@mui/icons-material/ArrowForward';
import AttachMoney from '@mui/icons-material/AttachMoney';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import ElectricBolt from '@mui/icons-material/ElectricBolt';
import Savings from '@mui/icons-material/Savings';
import TaskAlt from '@mui/icons-material/TaskAlt';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import { Box, Button, Container, Stack, Typography } from '@mui/material';

/**
 * Allowed icon keys for banner feature pills. We use string keys instead of
 * component references so the server-rendered homepage can hand props to this
 * Client Component without violating the React Server-Components serialisation
 * contract (functions can't cross the boundary).
 */
export type BannerIconKey =
  | 'currency-eur'
  | 'lightning'
  | 'shield-check'
  | 'sparkle'
  | 'check-circle'
  | 'hand-coins';

const ICON_BY_KEY: Record<BannerIconKey, React.ElementType> = {
  'currency-eur': AttachMoney,
  lightning: ElectricBolt,
  'shield-check': VerifiedUser,
  sparkle: AutoAwesome,
  'check-circle': TaskAlt,
  'hand-coins': Savings,
};

interface BannerAction {
  label: string;
  href: string;
}

interface BannerStat {
  /** Final numeric value (we count up to this from 0). */
  value: number;
  /** Optional suffix appended to the value (e.g. "+", "k"). */
  suffix?: string;
  /** Short label rendered below the number. */
  label: string;
}

interface BannerFeature {
  iconKey: BannerIconKey;
  label: string;
}

export interface HomepageBannerProps {
  /** Small uppercase line above the title. */
  eyebrow: string;
  /** Main heading — rendered as an `<h2>` for SEO hierarchy. */
  title: string;
  /** Supporting paragraph below the title. */
  subtitle: string;
  primaryAction: BannerAction;
  secondaryAction?: BannerAction;
  /**
   * `"primary"` = brand-green palette (action-oriented banners).
   * `"secondary"` = cooler tone, useful when the page already has a primary
   *  banner above so the two don't fight for attention.
   */
  variant?: 'primary' | 'secondary';
  /** Optional row of feature pills shown under the CTAs. */
  features?: BannerFeature[];
  /** Optional stats row (renders below the CTAs with count-up animation). */
  stats?: BannerStat[];
}

/**
 * Premium animated banner used between homepage sections.
 *
 * - Two large blurred orbs drift slowly in the background (long, subtle
 *   easing — never abrupt).
 * - A diagonal mesh gradient slowly shifts colour stops.
 * - A faint dot grid sits on top for texture.
 * - Numbers in the stats row count up the first time the banner enters the
 *   viewport.
 *
 * Respects `prefers-reduced-motion` — when the user opts out we render the
 * same composition without any animation.
 */
/**
 * Light/dark CSS-variable definitions per banner variant. We register the values
 * as CSS custom properties on the outer container, then have every child read
 * them. `theme.applyStyles('dark', ...)` is what actually toggles the dark
 * overrides — it produces a selector that targets the active color-scheme class
 * (`.dark`) so we never have to rely on `theme.palette.mode` (which is fixed at
 * theme-creation time and does NOT reflect the live color scheme under
 * `CssVarsProvider`).
 */
const VARIANT_VARS = {
  primary: {
    light: {
      '--banner-base-from': '#eef9e1',
      '--banner-base-to': '#dff2c7',
      // Soft brand orbs
      '--banner-orb-a': 'rgba(var(--mui-palette-primary-mainChannel) / 0.5)',
      '--banner-orb-b': 'rgba(47, 122, 0, 0.36)',
      '--banner-ring': 'rgba(var(--mui-palette-primary-mainChannel) / 0.26)',
      '--banner-ring-shadow-1': 'rgba(var(--mui-palette-primary-mainChannel) / 0.1)',
      '--banner-ring-shadow-2': 'rgba(var(--mui-palette-primary-mainChannel) / 0.04)',
      '--banner-dot': 'rgba(var(--mui-palette-text-primaryChannel) / 0.06)',
      '--banner-eyebrow-bg': 'rgba(var(--mui-palette-primary-mainChannel) / 0.14)',
      '--banner-eyebrow-border': 'rgba(var(--mui-palette-primary-mainChannel) / 0.35)',
      '--banner-pill-bg': 'rgba(var(--mui-palette-background-paperChannel) / 0.7)',
      '--banner-secondary-bg': 'rgba(var(--mui-palette-background-paperChannel) / 0.6)',
      '--banner-secondary-bg-hover': 'rgba(var(--mui-palette-background-paperChannel) / 0.85)',
    },
    dark: {
      '--banner-base-from': '#10231a',
      '--banner-base-to': '#1d3a26',
      '--banner-orb-a': 'rgba(var(--mui-palette-primary-mainChannel) / 0.42)',
      '--banner-orb-b': 'rgba(47, 122, 0, 0.3)',
      '--banner-ring': 'rgba(var(--mui-palette-primary-mainChannel) / 0.2)',
      '--banner-ring-shadow-1': 'rgba(var(--mui-palette-primary-mainChannel) / 0.08)',
      '--banner-ring-shadow-2': 'rgba(var(--mui-palette-primary-mainChannel) / 0.03)',
      '--banner-dot': 'rgba(var(--mui-palette-text-primaryChannel) / 0.07)',
      '--banner-eyebrow-bg': 'rgba(var(--mui-palette-primary-mainChannel) / 0.18)',
      '--banner-eyebrow-border': 'rgba(var(--mui-palette-primary-mainChannel) / 0.4)',
      '--banner-pill-bg': 'rgba(var(--mui-palette-background-paperChannel) / 0.45)',
      '--banner-secondary-bg': 'rgba(var(--mui-palette-background-paperChannel) / 0.4)',
      '--banner-secondary-bg-hover': 'rgba(var(--mui-palette-background-paperChannel) / 0.6)',
    },
  },
  secondary: {
    light: {
      '--banner-base-from': '#f4faef',
      '--banner-base-to': '#eaf4dd',
      '--banner-orb-a': 'rgba(var(--mui-palette-primary-mainChannel) / 0.42)',
      '--banner-orb-b': 'rgba(58, 140, 0, 0.32)',
      '--banner-ring': 'rgba(var(--mui-palette-primary-mainChannel) / 0.22)',
      '--banner-ring-shadow-1': 'rgba(var(--mui-palette-primary-mainChannel) / 0.09)',
      '--banner-ring-shadow-2': 'rgba(var(--mui-palette-primary-mainChannel) / 0.035)',
      '--banner-dot': 'rgba(var(--mui-palette-text-primaryChannel) / 0.06)',
      '--banner-eyebrow-bg': 'rgba(var(--mui-palette-primary-mainChannel) / 0.14)',
      '--banner-eyebrow-border': 'rgba(var(--mui-palette-primary-mainChannel) / 0.35)',
      '--banner-pill-bg': 'rgba(var(--mui-palette-background-paperChannel) / 0.7)',
      '--banner-secondary-bg': 'rgba(var(--mui-palette-background-paperChannel) / 0.6)',
      '--banner-secondary-bg-hover': 'rgba(var(--mui-palette-background-paperChannel) / 0.85)',
    },
    dark: {
      '--banner-base-from': '#0f1f15',
      '--banner-base-to': '#1a2a23',
      '--banner-orb-a': 'rgba(var(--mui-palette-primary-mainChannel) / 0.32)',
      '--banner-orb-b': 'rgba(58, 140, 0, 0.28)',
      '--banner-ring': 'rgba(var(--mui-palette-primary-mainChannel) / 0.18)',
      '--banner-ring-shadow-1': 'rgba(var(--mui-palette-primary-mainChannel) / 0.072)',
      '--banner-ring-shadow-2': 'rgba(var(--mui-palette-primary-mainChannel) / 0.027)',
      '--banner-dot': 'rgba(var(--mui-palette-text-primaryChannel) / 0.07)',
      '--banner-eyebrow-bg': 'rgba(var(--mui-palette-primary-mainChannel) / 0.18)',
      '--banner-eyebrow-border': 'rgba(var(--mui-palette-primary-mainChannel) / 0.4)',
      '--banner-pill-bg': 'rgba(var(--mui-palette-background-paperChannel) / 0.45)',
      '--banner-secondary-bg': 'rgba(var(--mui-palette-background-paperChannel) / 0.4)',
      '--banner-secondary-bg-hover': 'rgba(var(--mui-palette-background-paperChannel) / 0.6)',
    },
  },
} as const;

export function HomepageBanner({
  eyebrow,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  variant = 'primary',
  features,
  stats,
}: HomepageBannerProps) {
  const vars = VARIANT_VARS[variant];

  return (
    <Box component="section" aria-labelledby="banner-title" sx={{ py: { xs: 3, md: 4 } }}>
      <Container maxWidth="xl">
        <Box
          sx={(theme) => ({
            ...vars.light,
            ...theme.applyStyles('dark', vars.dark),
            position: 'relative',
            overflow: 'hidden',
            borderRadius: { xs: 3, md: 4 },
            border: '1px solid',
            borderColor: 'divider',
            backgroundImage:
              'linear-gradient(135deg, var(--banner-base-from) 0%, var(--banner-base-to) 100%)',
            backgroundSize: '200% 200%',
            backgroundPosition: '0% 50%',
            isolation: 'isolate',
            minHeight: { xs: 280, md: 320 },
            display: 'flex',
            alignItems: 'center',
            px: { xs: 2.5, sm: 4, md: 6 },
            py: { xs: 4, md: 5 },
            '@keyframes bannerGradientShift': {
              '0%, 100%': { backgroundPosition: '0% 50%' },
              '50%': { backgroundPosition: '100% 50%' },
            },
            '@keyframes bannerOrbA': {
              '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
              '50%': { transform: 'translate3d(36px, -28px, 0) scale(1.06)' },
            },
            '@keyframes bannerOrbB': {
              '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
              '50%': { transform: 'translate3d(-32px, 22px, 0) scale(1.04)' },
            },
            '@keyframes bannerRingPulse': {
              '0%, 100%': { transform: 'scale(1)', opacity: 0.55 },
              '50%': { transform: 'scale(1.04)', opacity: 0.85 },
            },
            animation: 'bannerGradientShift 28s ease-in-out infinite',
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              backgroundPosition: '50% 50%',
              '& .banner-orb, & .banner-ring': { animation: 'none' },
            },
            '@media (max-width: 599px)': {
              // Skip continuous paint work on phones — static gradient still reads fine.
              animation: 'none',
              '& .banner-orb, & .banner-ring': { animation: 'none', filter: 'none' },
            },
          })}
        >
          {/* Decorative orbs */}
          <Box
            aria-hidden
            className="banner-orb"
            sx={{
              position: 'absolute',
              top: { xs: -100, md: -140 },
              left: { xs: -120, md: -90 },
              width: { xs: 320, md: 460 },
              height: { xs: 320, md: 460 },
              borderRadius: '50%',
              background: 'radial-gradient(circle at center, var(--banner-orb-a) 0%, transparent 65%)',
              // Soft falloff without live blur filters (blur was a major paint cost).
              opacity: 0.9,
              zIndex: 0,
              animation: 'bannerOrbA 22s ease-in-out infinite',
              display: { xs: 'none', md: 'block' },
            }}
          />
          <Box
            aria-hidden
            className="banner-orb"
            sx={{
              position: 'absolute',
              bottom: { xs: -120, md: -160 },
              right: { xs: -90, md: -100 },
              width: { xs: 360, md: 520 },
              height: { xs: 360, md: 520 },
              borderRadius: '50%',
              background: 'radial-gradient(circle at center, var(--banner-orb-b) 0%, transparent 70%)',
              opacity: 0.85,
              zIndex: 0,
              animation: 'bannerOrbB 28s ease-in-out infinite',
              display: { xs: 'none', md: 'block' },
            }}
          />

          {/* Decorative outline ring */}
          <Box
            aria-hidden
            className="banner-ring"
            sx={{
              position: 'absolute',
              top: { xs: '20%', md: '30%' },
              right: { xs: '-30%', md: '-12%' },
              width: { xs: 340, md: 420 },
              height: { xs: 340, md: 420 },
              borderRadius: '50%',
              border: '1px solid',
              borderColor: 'var(--banner-ring)',
              boxShadow:
                '0 0 0 8px var(--banner-ring-shadow-1), 0 0 0 30px var(--banner-ring-shadow-2)',
              zIndex: 0,
              animation: 'bannerRingPulse 10s ease-in-out infinite',
              display: { xs: 'none', md: 'block' },
            }}
          />

          {/* Faint dot pattern overlay */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(var(--banner-dot) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />

          {/* Content */}
          <Stack
            spacing={{ xs: 2, md: 2.5 }}
            sx={{
              position: 'relative',
              zIndex: 1,
              maxWidth: 720,
              width: '100%',
            }}
          >
            <Typography
              component="span"
              sx={{
                display: 'inline-block',
                alignSelf: 'flex-start',
                px: 1.25,
                py: 0.5,
                borderRadius: 99,
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                bgcolor: 'var(--banner-eyebrow-bg)',
                color: 'primary.main',
                border: '1px solid',
                borderColor: 'var(--banner-eyebrow-border)',
              }}
            >
              {eyebrow}
            </Typography>

            <Typography
              id="banner-title"
              component="h2"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.5rem', sm: '1.85rem', md: '2.25rem' },
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: 'text.primary',
              }}
            >
              {title}
            </Typography>

            <Typography
              component="p"
              sx={{
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                fontWeight: 500,
                lineHeight: 1.55,
                color: 'text.secondary',
                maxWidth: 560,
              }}
            >
              {subtitle}
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 1.5 }} sx={{ pt: 0.5 }}>
              <Button
                component={RouterLink}
                href={primaryAction.href}
                variant="contained"
                size="large"
                endIcon={<ArrowForward sx={{ fontSize: 18 }} />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  px: 2.5,
                  py: 1.25,
                  borderRadius: 2,
                  boxShadow: '0 8px 24px -8px rgba(var(--mui-palette-primary-mainChannel) / 0.6)',
                  '&:hover': {
                    boxShadow: '0 12px 28px -8px rgba(var(--mui-palette-primary-mainChannel) / 0.7)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {primaryAction.label}
              </Button>
              {secondaryAction ? (
                <Button
                  component={RouterLink}
                  href={secondaryAction.href}
                  variant="outlined"
                  size="large"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    px: 2.25,
                    py: 1.25,
                    borderRadius: 2,
                    borderColor: 'divider',
                    color: 'text.primary',
                    bgcolor: 'var(--banner-secondary-bg)',
                    backdropFilter: 'blur(8px)',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'var(--banner-secondary-bg-hover)',
                    },
                  }}
                >
                  {secondaryAction.label}
                </Button>
              ) : null}
            </Stack>

            {features && features.length > 0 ? (
              <Stack
                direction="row"
                sx={{
                  flexWrap: 'wrap',
                  rowGap: 1,
                  columnGap: 1,
                  pt: 0.5,
                }}
              >
                {features.map(({ iconKey, label }) => {
                  const Cmp = ICON_BY_KEY[iconKey];
                  return (
                    <Stack
                      key={label}
                      direction="row"
                      spacing={0.75}
                      sx={{
                        alignItems: 'center',
                        px: 1.25,
                        py: 0.65,
                        borderRadius: 99,
                        bgcolor: 'var(--banner-pill-bg)',
                        border: '1px solid',
                        borderColor: 'divider',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <Box sx={{ color: 'primary.main', display: 'inline-flex' }}>
                        <Cmp sx={{ fontSize: 16 }} />
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap' }}
                      >
                        {label}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            ) : null}

            {stats && stats.length > 0 ? <BannerStats stats={stats} /> : null}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Animated stat row with count-up effect
// ---------------------------------------------------------------------------

function BannerStats({ stats }: { stats: BannerStat[] }) {
  return (
    <Stack
      direction="row"
      spacing={{ xs: 2, sm: 4 }}
      sx={{
        pt: 1,
        flexWrap: 'wrap',
        rowGap: 2,
      }}
    >
      {stats.map((stat) => (
        <Stack key={stat.label} spacing={0.25}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.5rem', md: '1.75rem' },
              letterSpacing: '-0.015em',
              color: 'primary.main',
              lineHeight: 1.1,
            }}
          >
            <CountUp value={stat.value} />
            {stat.suffix ? (
              <Typography
                component="span"
                sx={{
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  ml: 0.25,
                  color: 'rgba(var(--mui-palette-primary-mainChannel) / 0.75)',
                }}
              >
                {stat.suffix}
              </Typography>
            ) : null}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 500, letterSpacing: '0.01em' }}
          >
            {stat.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

/**
 * Counts from 0 up to the target value the first time the element scrolls into
 * view. Respects `prefers-reduced-motion` by jumping straight to the end value.
 */
function CountUp({ value, durationMs = 1400 }: { value: number; durationMs?: number }) {
  const [current, setCurrent] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const playedRef = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setCurrent(value);
      playedRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !playedRef.current) {
            playedRef.current = true;
            const start = performance.now();
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / durationMs);
              // ease-out cubic — fast at start, settles at the end.
              const eased = 1 - Math.pow(1 - t, 3);
              setCurrent(Math.round(eased * value));
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, durationMs]);

  return (
    <Box component="span" ref={ref}>
      {current.toLocaleString('en-GB')}
    </Box>
  );
}
