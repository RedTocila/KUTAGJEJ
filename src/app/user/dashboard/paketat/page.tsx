'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ArrowClockwise as ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ArrowsLeftRight as ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
import { StarFour as StarFourIcon } from '@phosphor-icons/react/dist/ssr/StarFour';

import { paths } from '@/paths';
import { listMySubscriptions } from '@/lib/payments-client';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import {
  packageAccentSurfaceSx,
  planAccentForCode,
  resolveAccent,
  type PlanAccent,
} from '@/components/user/packages/package-ui';
import { portalCardSx } from '@/components/user/portal-cards';

function categoryCardSx(accent: PlanAccent = 'primary') {
  return {
    ...portalCardSx,
    ...packageAccentSurfaceSx(accent),
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    flex: 1,
    minHeight: 0,
    p: { xs: 1.5, sm: 1.75 },
    gap: { xs: 1.5, sm: 2 },
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    transition: 'border-color 140ms cubic-bezier(0.22, 1, 0.36, 1)',
    '&:hover': {
      borderColor: (t: Theme) => alpha(resolveAccent(t, accent), 0.72),
      '& .packages-hub-cta': {
        color: (th: Theme) => resolveAccent(th, accent),
      },
      '& .packages-hub-caret': {
        transform: 'translateX(3px)',
      },
    },
  } as const;
}

function VisualPanel({ accent, children }: { accent: PlanAccent; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: { xs: 112, sm: 136 },
        flexShrink: 0,
        alignSelf: 'stretch',
        borderRadius: 2.5,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
        px: 1,
        py: 1,
        bgcolor: (t) => alpha(resolveAccent(t, accent), t.palette.mode === 'dark' ? 0.18 : 0.1),
        color: (t) => resolveAccent(t, accent),
      }}
    >
      {children}
    </Box>
  );
}

function ClusterIcon({ icon: Icon, accent }: { icon: PhosphorIcon; accent: PlanAccent }) {
  return (
    <Box
      sx={{
        width: 30,
        height: 30,
        borderRadius: 1.5,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        bgcolor: (t) => alpha(resolveAccent(t, accent), t.palette.mode === 'dark' ? 0.28 : 0.18),
        color: (t) => resolveAccent(t, accent),
        border: '1px solid',
        borderColor: (t) => alpha(resolveAccent(t, accent), 0.45),
      }}
    >
      <Icon size={15} weight="bold" />
    </Box>
  );
}

function CategoryCard({
  href,
  accent,
  visual,
  title,
  description,
  badge,
  badgeColor,
  cta,
}: {
  href: string;
  accent: PlanAccent;
  visual: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  cta: string;
}) {
  return (
    <Box component={RouterLink} href={href} sx={categoryCardSx(accent)}>
      <VisualPanel accent={accent}>{visual}</VisualPanel>
      <Stack
        spacing={0.7}
        sx={{
          flex: 1,
          minWidth: 0,
          justifyContent: 'center',
          py: 0.25,
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.05rem', sm: '1.15rem' },
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
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
                      bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                      color: 'text.primary',
                    }),
              }}
            />
          ) : null}
        </Stack>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            lineHeight: 1.45,
            fontSize: '0.8rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {description}
        </Typography>
        <Stack
          className="packages-hub-cta"
          direction="row"
          spacing={0.35}
          sx={{
            alignItems: 'center',
            mt: 0.35,
            color: (t) => resolveAccent(t, accent),
            fontWeight: 800,
            fontSize: '0.82rem',
            letterSpacing: '-0.01em',
            transition: 'color 140ms ease',
          }}
        >
          {cta}
          <Box
            className="packages-hub-caret"
            sx={{
              display: 'inline-flex',
              transition: 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <CaretRightIcon size={14} weight="bold" />
          </Box>
        </Stack>
      </Stack>
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
      const active = (res.subscriptions ?? []).find((s) => s.status === 'active' && Number(s.priceEur) > 0) ?? null;
      setActivePlanLabel(active?.contractTitle || active?.planCode?.toUpperCase() || 'FREE');
      setActivePlanBadgeColor(String(planAccentForCode(active?.planCode ?? 'free')));
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  return (
    <Stack
      spacing={1.5}
      sx={{
        flex: 1,
        minHeight: 0,
        height: { xs: 'auto', md: '100%' },
        overflow: { xs: 'visible', md: 'hidden' },
      }}
    >
      <UserPageHeader icon={<PackageIcon size={20} weight="duotone" />} title={t.nav.packages} sx={{ flexShrink: 0 }} />
      <Stack spacing={1.35} sx={{ flex: 1, minHeight: 0, overflow: { xs: 'visible', md: 'hidden' } }}>
        <CategoryCard
          href={paths.user.packagesMain}
          accent="primary"
          title={t.packages.plansTitle}
          description={t.packages.mainDescription}
          badge={activePlanLabel}
          badgeColor={activePlanBadgeColor}
          cta={t.packages.exploreNow}
          visual={<PackageIcon size={56} weight="duotone" />}
        />
        <CategoryCard
          href={paths.user.packagesExtra}
          accent="primary"
          title={t.nav.packagesExtra}
          description={t.packages.extraDescription}
          cta={t.packages.exploreNow}
          visual={
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 30px)',
                gap: 0.65,
                justifyContent: 'center',
                alignContent: 'center',
              }}
            >
              <ClusterIcon icon={SealPercentIcon} accent="error" />
              <ClusterIcon icon={ArrowClockwiseIcon} accent="primary" />
              <ClusterIcon icon={StarFourIcon} accent="warning" />
              <ClusterIcon icon={ArrowsLeftRightIcon} accent="warning" />
            </Box>
          }
        />
        <CategoryCard
          href={paths.user.packagesCredits}
          accent="warning"
          title={t.packages.buyCoinsTitle}
          description={t.packages.boostCoinsDescription}
          cta={t.packages.exploreNow}
          visual={<BoostCoinIcon size={56} />}
        />
      </Stack>
    </Stack>
  );
}
