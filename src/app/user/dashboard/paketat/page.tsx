'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ArrowClockwise as ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';
import { StarFour as StarFourIcon } from '@phosphor-icons/react/dist/ssr/StarFour';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import {
  planAccentForCode,
  resolveAccent,
  type PlanAccent,
} from '@/components/user/packages/package-ui';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { listMySubscriptions } from '@/lib/payments-client';
import { paths } from '@/paths';
import { MOTION } from '@/styles/motion';

function hubCardSx(accent: PlanAccent = 'primary') {
  return {
    position: 'relative',
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    justifyContent: 'space-between',
    px: 1.75,
    py: 1.5,
    borderRadius: 3,
    border: '1px solid',
    overflow: 'hidden',
    bgcolor: 'background.paper',
    borderColor: (t: Theme) => alpha(resolveAccent(t, accent), 0.36),
    backgroundImage: (t: Theme) =>
      `linear-gradient(135deg, ${alpha(resolveAccent(t, accent), t.palette.mode === 'dark' ? 0.1 : 0.05)} 0%, transparent 58%)`,
    transition: `border-color ${MOTION.fast} ${MOTION.ease}`,
    '&:hover': {
      borderColor: (t: Theme) => alpha(resolveAccent(t, accent), 0.72),
      '& .packages-hub-caret-circle': {
        color: (th: Theme) => resolveAccent(th, accent),
        borderColor: (th: Theme) => alpha(resolveAccent(th, accent), 0.55),
      },
    },
  } as const;
}

function CircleIcon({
  children,
  accent = 'primary',
}: {
  children: React.ReactNode;
  accent?: PlanAccent;
}) {
  return (
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        border: '1.5px solid',
        borderColor: (t) => resolveAccent(t, accent),
        bgcolor: (t) => alpha(resolveAccent(t, accent), t.palette.mode === 'dark' ? 0.16 : 0.1),
        color: (t) => resolveAccent(t, accent),
      }}
    >
      {children}
    </Box>
  );
}

function CircleCaret() {
  return (
    <Box
      className="packages-hub-caret-circle"
      aria-hidden
      sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        border: '1px solid',
        borderColor: 'divider',
        color: 'text.disabled',
        transition: `color ${MOTION.fast} ${MOTION.ease}, border-color ${MOTION.fast} ${MOTION.ease}`,
      }}
    >
      <CaretRightIcon size={14} weight="bold" />
    </Box>
  );
}

function HubHeader({
  icon,
  title,
  badge,
  badgeColor,
  accent = 'primary',
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeColor?: string;
  accent?: PlanAccent;
}) {
  return (
    <Stack direction="row" spacing={1.15} sx={{ alignItems: 'center', minWidth: 0 }}>
      <CircleIcon accent={accent}>{icon}</CircleIcon>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ alignItems: 'center', minWidth: 0, flex: 1, flexWrap: 'wrap', gap: 0.5 }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: '1.08rem', sm: '1.22rem' },
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            minWidth: 0,
          }}
        >
          {title}
        </Typography>
        {badge ? (
          <Box
            sx={{
              px: 0.85,
              py: 0.22,
              borderRadius: 999,
              bgcolor: badgeColor || 'primary.main',
              color: 'common.white',
              fontWeight: 850,
              fontSize: '0.58rem',
              lineHeight: 1.3,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {badge}
          </Box>
        ) : null}
      </Stack>
      <CircleCaret />
    </Stack>
  );
}

function BillingPreview({ labels }: { labels: string[] }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: '100%',
        height: 48,
        boxSizing: 'border-box',
        p: '4px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        borderRadius: 999,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {labels.map((label, index) => {
        const active = index === 0;
        return (
          <Box
            key={label}
            sx={{
              minWidth: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.1,
              borderRadius: 999,
              border: '1.5px solid',
              ...(active
                ? {
                    bgcolor: 'transparent',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                  }
                : {
                    color: 'text.secondary',
                    bgcolor: 'transparent',
                    borderColor: 'transparent',
                  }),
            }}
          >
            <CalendarBlankIcon size={14} weight={active ? 'bold' : 'regular'} />
            <Typography
              sx={{
                fontSize: '0.62rem',
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '0.01em',
                color: 'inherit',
                maxWidth: '100%',
                px: 0.35,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

function ExtraTile({
  icon: Icon,
  label,
  accent,
}: {
  icon: PhosphorIcon | React.ComponentType<{ size?: number; weight?: string }>;
  label: string;
  accent: PlanAccent;
}) {
  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        py: 1.05,
        px: 0.5,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: (t) => alpha(resolveAccent(t, accent), 0.4),
        bgcolor: (t) => alpha(resolveAccent(t, accent), t.palette.mode === 'dark' ? 0.12 : 0.07),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
      }}
    >
      <Box sx={{ color: (t) => resolveAccent(t, accent), display: 'grid', lineHeight: 0 }}>
        <Icon size={22} weight="regular" />
      </Box>
      <Typography
        sx={{
          fontSize: '0.62rem',
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: (t) => resolveAccent(t, accent),
          textAlign: 'center',
          maxWidth: '100%',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export default function UserPackagesPage() {
  const { user } = useUser();
  const t = useCopy();
  const [activePlanLabel, setActivePlanLabel] = React.useState<string | undefined>();
  const [activePlanBadgeColor, setActivePlanBadgeColor] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void listMySubscriptions().then((res) => {
      if (cancelled) return;
      const active =
        (res.subscriptions ?? []).find((s) => s.status === 'active' && Number(s.priceEur) > 0) ?? null;
      setActivePlanLabel(active?.contractTitle || active?.planCode?.toUpperCase() || 'FREE');
      setActivePlanBadgeColor(String(planAccentForCode(active?.planCode ?? 'free')));
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  return (
    <Stack spacing={1.35} sx={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <UserPageHeader
        icon={<PackageIcon size={20} weight="duotone" />}
        title={t.nav.packages}
        description={t.packages.hubDescription}
        sx={{ flexShrink: 0 }}
      />
      <Stack spacing={1.25} sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Box component={RouterLink} href={paths.user.packagesMain} sx={hubCardSx('primary')}>
          <HubHeader
            icon={<PackageIcon size={20} weight="regular" />}
            title={t.packages.plansTitle}
            badge={activePlanLabel}
            badgeColor={activePlanBadgeColor}
          />
          <Box sx={{ mt: 1.15, width: '100%' }}>
            <BillingPreview labels={[t.packages.monthly, t.packages.months6, t.packages.months12]} />
          </Box>
        </Box>

        <Box component={RouterLink} href={paths.user.packagesExtra} sx={hubCardSx('primary')}>
          <HubHeader
            icon={<SquaresFourIcon size={20} weight="regular" />}
            title={t.nav.packagesExtra}
          />
          <Box
            sx={{
              mt: 1.15,
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 0.75,
            }}
          >
            <ExtraTile icon={SealPercentIcon} label={t.picker.okazion} accent="error" />
            <ExtraTile icon={ArrowClockwiseIcon} label={t.packages.autoRefreshTitle} accent="primary" />
            <ExtraTile icon={StarFourIcon} label="Premium" accent="warning" />
          </Box>
        </Box>

        <Box component={RouterLink} href={paths.user.packagesCredits} sx={hubCardSx('warning')}>
          <HubHeader
            icon={<BoostCoinIcon size={20} />}
            title={t.packages.buyCoinsTitle}
            accent="warning"
          />
          <Box
            sx={{
              mt: 1.15,
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 0.75,
            }}
          >
            <ExtraTile icon={BoostCoinIcon} label="100 BC" accent="warning" />
            <ExtraTile icon={BoostCoinIcon} label="300 BC" accent="warning" />
            <ExtraTile icon={BoostCoinIcon} label="800 BC" accent="warning" />
          </Box>
        </Box>
      </Stack>
    </Stack>
  );
}
