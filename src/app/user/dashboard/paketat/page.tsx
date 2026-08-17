'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { ArrowClockwise as ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';
import { StarFour as StarFourIcon } from '@phosphor-icons/react/dist/ssr/StarFour';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { planAccentForCode, resolveAccent, type PlanAccent, packageAccentSurfaceSx, packageAccentWash } from '@/components/user/packages/package-ui';
import { PortalIconBox, portalCardSx, portalToggleGroupSx } from '@/components/user/portal-cards';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { listMySubscriptions } from '@/lib/payments-client';
import { paths } from '@/paths';

function hubCardSx(accent: PlanAccent = 'primary') {
  return {
    ...portalCardSx,
    ...packageAccentSurfaceSx(accent),
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    justifyContent: 'space-between',
    px: { xs: 2, sm: 2.25 },
    py: { xs: 1.65, sm: 1.85 },
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    backgroundImage: (t: Theme) => packageAccentWash(t, accent),
    transition:
      'border-color 140ms cubic-bezier(0.22, 1, 0.36, 1), background-color 140ms cubic-bezier(0.22, 1, 0.36, 1)',
    '&:hover': {
      borderColor: (t: Theme) => alpha(resolveAccent(t, accent), 0.72),
      '& .packages-hub-caret': {
        transform: 'translateX(3px)',
        color: (th: Theme) => resolveAccent(th, accent),
        opacity: 1,
      },
    },
  } as const;
}

function HubHeader({
  icon,
  title,
  badge,
  badgeColor,
  iconTone = 'primary',
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeColor?: string;
  iconTone?: 'primary' | 'warning';
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
      <PortalIconBox size={40} tone={iconTone}>
        {icon}
      </PortalIconBox>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '1.05rem',
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
            minWidth: 0,
          }}
          noWrap
        >
          {title}
        </Typography>
        {badge ? (
          <Chip
            label={badge}
            size="small"
            sx={{
              flexShrink: 0,
              height: 22,
              fontWeight: 800,
              fontSize: '0.68rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              border: 'none',
              '& .MuiChip-label': { px: 1.1 },
              ...(badgeColor
                ? {
                    bgcolor: (t) => alpha(badgeColor, t.palette.mode === 'dark' ? 0.22 : 0.14),
                    color: badgeColor,
                  }
                : {
                    bgcolor: (t) =>
                      t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    color: 'text.primary',
                  }),
            }}
          />
        ) : null}
      </Stack>
      <Box
        className="packages-hub-caret"
        aria-hidden
        sx={{
          color: 'text.secondary',
          display: 'flex',
          flexShrink: 0,
          opacity: 0.7,
          transition: 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1), color 160ms ease, opacity 160ms ease',
        }}
      >
        <CaretRightIcon size={20} weight="bold" />
      </Box>
    </Stack>
  );
}

function BillingPreview({ labels }: { labels: string[] }) {
  return (
    <Box
      aria-hidden
      sx={{
        ...portalToggleGroupSx,
        display: 'grid',
        gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))`,
        width: '100%',
        flexShrink: 0,
      }}
    >
      {labels.map((label, index) => {
        const active = index === 0;
        return (
          <Box
            key={label}
            sx={{
              minWidth: 0,
              minHeight: 36,
              px: 0.75,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              bgcolor: active ? 'primary.main' : 'transparent',
              color: active ? 'primary.contrastText' : 'text.secondary',
              fontWeight: 800,
              fontSize: '0.72rem',
              letterSpacing: '0.01em',
              lineHeight: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Box>
        );
      })}
    </Box>
  );
}

function ExtraTile({
  icon,
  label,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  accent: PlanAccent;
}) {
  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        py: 1.1,
        px: 0.5,
        borderRadius: 2.25,
        border: '1px solid',
        borderColor: (t) => alpha(resolveAccent(t, accent), t.palette.mode === 'dark' ? 0.32 : 0.28),
        bgcolor: (t) => alpha(resolveAccent(t, accent), t.palette.mode === 'dark' ? 0.12 : 0.08),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1.75,
          display: 'grid',
          placeItems: 'center',
          bgcolor: (t) =>
            alpha(
              resolveAccent(t, accent),
              t.palette.mode === 'dark' ? (accent === 'warning' ? 0.32 : 0.22) : accent === 'warning' ? 0.2 : 0.16,
            ),
          color: (t) => resolveAccent(t, accent),
        }}
      >
        {icon}
      </Box>
      <Typography
        sx={{
          fontSize: '0.68rem',
          fontWeight: 800,
          lineHeight: 1.15,
          color: 'text.primary',
          textAlign: 'center',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
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
            icon={<PackageIcon size={22} weight="duotone" />}
            title={t.packages.plansTitle}
            badge={activePlanLabel}
            badgeColor={activePlanBadgeColor}
          />
          <Box sx={{ mt: 1.25, width: '100%' }}>
            <BillingPreview labels={[t.packages.monthly, t.packages.months6, t.packages.months12]} />
          </Box>
        </Box>

        <Box component={RouterLink} href={paths.user.packagesExtra} sx={hubCardSx('primary')}>
          <HubHeader
            icon={<SquaresFourIcon size={22} weight="duotone" />}
            title={t.nav.packagesExtra}
          />
          <Box
            sx={{
              mt: 1.25,
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 0.75,
            }}
          >
            <ExtraTile icon={<SealPercentIcon size={16} weight="bold" />} label={t.picker.okazion} accent="error" />
            <ExtraTile
              icon={<ArrowClockwiseIcon size={16} weight="bold" />}
              label={t.packages.autoRefreshTitle}
              accent="primary"
            />
            <ExtraTile icon={<StarFourIcon size={16} weight="bold" />} label="Premium" accent="warning" />
          </Box>
        </Box>

        <Box component={RouterLink} href={paths.user.packagesCredits} sx={hubCardSx('warning')}>
          <HubHeader
            icon={<BoostCoinIcon size={22} />}
            title={t.packages.buyCoinsTitle}
            iconTone="warning"
          />
          <Box
            sx={{
              mt: 1.25,
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 0.75,
            }}
          >
            <ExtraTile icon={<BoostCoinIcon size={16} />} label="100 BC" accent="warning" />
            <ExtraTile icon={<BoostCoinIcon size={16} />} label="300 BC" accent="warning" />
            <ExtraTile icon={<BoostCoinIcon size={16} />} label="800 BC" accent="warning" />
          </Box>
        </Box>
      </Stack>
    </Stack>
  );
}
