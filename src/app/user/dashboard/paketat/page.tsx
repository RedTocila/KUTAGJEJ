'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Chip, Stack, Typography, type Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowUpRight as ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';
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
import { MOTION } from '@/styles/motion';

function HubTag({ label }: { label: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 26,
        px: 1.05,
        borderRadius: 999,
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        lineHeight: 1,
        color: 'text.secondary',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)',
        border: '1px solid',
        borderColor: 'divider',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Box>
  );
}

function CategoryCard({
  href,
  title,
  description,
  icon,
  tone = 'primary',
  badge,
  badgeColor,
  tags,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tone?: 'primary' | 'amber';
  badge?: string;
  badgeColor?: string;
  tags: string[];
}) {
  const isAmber = tone === 'amber';
  const accent = isAmber ? 'warning.main' : 'primary.main';
  const accentBorder = isAmber ? warningMainAlpha(0.45) : primaryMainAlpha(0.45);
  const accentFill = isAmber ? warningMainAlpha(0.18) : primaryMainAlpha(0.18);

  return (
    <Box
      component={RouterLink}
      href={href}
      sx={{
        ...portalCardSx,
        textDecoration: 'none',
        color: 'inherit',
        flex: '1 1 0',
        minHeight: 'min-content',
        display: 'flex',
        flexDirection: 'column',
        px: { xs: 2.25, sm: 2.75 },
        py: { xs: 1.85, sm: 2.25 },
        transition: `border-color ${MOTION.fast} ${MOTION.ease}, background-color ${MOTION.fast} ${MOTION.ease}`,
        '&:hover': {
          borderColor: accentBorder,
          bgcolor: (t: Theme) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'action.hover'),
          '& .packages-hub-caret': {
            transform: 'translate(1px, -1px)',
            color: accent,
            borderColor: accentBorder,
            bgcolor: accentFill,
          },
        },
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              color: accent,
              display: 'inline-flex',
              flexShrink: 0,
              lineHeight: 0,
            }}
          >
            {icon}
          </Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.4rem', sm: '1.55rem' },
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
            width: 34,
            height: 34,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            color: 'text.disabled',
            border: '1px solid',
            borderColor: 'divider',
            transition: `transform ${MOTION.base} ${MOTION.ease}, color ${MOTION.fast} ${MOTION.ease}, border-color ${MOTION.fast} ${MOTION.ease}, background-color ${MOTION.fast} ${MOTION.ease}`,
          }}
        >
          <ArrowUpRightIcon size={16} weight="bold" />
        </Box>
      </Stack>

      <Typography
        sx={{
          mt: 0.7,
          fontSize: '0.85rem',
          lineHeight: 1.45,
          color: 'var(--mui-palette-neutral-400)',
          flexShrink: 0,
        }}
      >
        {description}
      </Typography>

      <Stack direction="row" sx={{ mt: 1.15, flexWrap: 'wrap', gap: 0.6, minWidth: 0, flexShrink: 0 }}>
        {tags.map((tag) => (
          <HubTag key={tag} label={tag} />
        ))}
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
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0, height: '100%', overflow: 'auto' }}>
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
          icon={<PackageIcon size={24} weight="duotone" />}
          badge={activePlanLabel}
          badgeColor={activePlanBadgeColor}
          tags={[t.packages.monthly, t.packages.months6, t.packages.months12]}
        />
        <CategoryCard
          href={paths.user.packagesExtra}
          title={t.nav.packagesExtra}
          description={t.packages.extraDescription}
          icon={<SquaresFourIcon size={24} weight="duotone" />}
          tags={[t.picker.okazion, 'Auto-Refresh', 'Premium']}
        />
        <CategoryCard
          href={paths.user.packagesCredits}
          title={t.packages.buyCoinsTitle}
          description={t.packages.boostCoinsDescription}
          icon={<BoostCoinIcon size={24} />}
          tone="amber"
          tags={['Boost Coins']}
        />
      </Stack>
    </Stack>
  );
}
