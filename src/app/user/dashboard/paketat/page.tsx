'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Chip, Stack, Typography, type Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { portalCardSx } from '@/components/user/portal-cards';
import { planAccentForCode } from '@/components/user/packages/package-ui';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { primaryMainAlpha, warningMainAlpha } from '@/lib/css-var-alpha';
import { listMySubscriptions } from '@/lib/payments-client';
import { paths } from '@/paths';

function CategoryCard({
  href,
  title,
  description,
  icon: Icon,
  tone = 'primary',
  badge,
  badgeColor,
}: {
  href: string;
  title: string;
  description: string;
  icon: PhosphorIcon;
  tone?: 'primary' | 'amber';
  badge?: string;
  badgeColor?: string;
}) {
  const isAmber = tone === 'amber';

  return (
    <Box
      component={RouterLink}
      href={href}
      sx={{
        ...portalCardSx,
        textDecoration: 'none',
        color: 'inherit',
        flex: '1 1 0',
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        px: { xs: 2.25, sm: 2.75 },
        py: { xs: 1.75, sm: 2.25 },
        transition:
          'border-color 140ms cubic-bezier(0.22, 1, 0.36, 1), background-color 140ms cubic-bezier(0.22, 1, 0.36, 1)',
        '&:hover': {
          borderColor: isAmber ? warningMainAlpha(0.45) : primaryMainAlpha(0.45),
          bgcolor: (t: Theme) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'action.hover'),
          '& .packages-hub-caret': {
            transform: 'translateX(3px)',
            color: isAmber ? 'warning.main' : 'primary.main',
            opacity: 1,
          },
        },
      }}
    >
      <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center', width: '100%', minWidth: 0 }}>
        <Box
          sx={{
            width: { xs: 52, sm: 56 },
            height: { xs: 52, sm: 56 },
            borderRadius: 2.25,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: (t) =>
              isAmber
                ? warningMainAlpha(t.palette.mode === 'dark' ? 0.22 : 0.16)
                : primaryMainAlpha(t.palette.mode === 'dark' ? 0.16 : 0.12),
            color: isAmber ? 'warning.main' : 'primary.main',
          }}
        >
          {React.createElement(Icon, { size: 28, weight: 'duotone' })}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.08rem', sm: '1.15rem' },
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
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.4,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </Typography>
        </Box>
        <Box
          className="packages-hub-caret"
          sx={{
            color: 'text.secondary',
            display: 'flex',
            flexShrink: 0,
            opacity: 0.7,
            transition: 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1), color 160ms ease, opacity 160ms ease',
          }}
        >
          <CaretRightIcon size={22} weight="bold" />
        </Box>
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
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <UserPageHeader
        icon={<PackageIcon size={20} weight="duotone" />}
        title={t.nav.packages}
        description={t.packages.hubDescription}
        sx={{ flexShrink: 0 }}
      />
      <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
        <CategoryCard
          href={paths.user.packagesMain}
          title={t.packages.plansTitle}
          description={t.packages.mainDescription}
          icon={PackageIcon}
          badge={activePlanLabel}
          badgeColor={activePlanBadgeColor}
        />
        <CategoryCard
          href={paths.user.packagesExtra}
          title={t.nav.packagesExtra}
          description={t.packages.extraDescription}
          icon={SquaresFourIcon}
        />
        <CategoryCard
          href={paths.user.packagesCredits}
          title={t.packages.buyCoinsTitle}
          description={t.packages.boostCoinsDescription}
          icon={BoostCoinIcon as PhosphorIcon}
          tone="amber"
        />
      </Stack>
    </Stack>
  );
}
