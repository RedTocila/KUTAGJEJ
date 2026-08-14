'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Box,
  Button,
  Grid,
  IconButton,
  LinearProgress,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowsLeftRight as ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { ChartLineUp as ChartLineUpIcon } from '@phosphor-icons/react/dist/ssr/ChartLineUp';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { ListBullets as ListBulletsIcon } from '@phosphor-icons/react/dist/ssr/ListBullets';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { Receipt as ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { SignOut as SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { UserGear as UserGearIcon } from '@phosphor-icons/react/dist/ssr/UserGear';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { paths } from '@/paths';
import { useLanguage } from '@/hooks/use-language';
import { useUser } from '@/hooks/use-user';
import { authClient } from '@/lib/auth/client';
import {
  listMyCarListings,
  listMyJobListings,
  listMyMarketplaceListings,
  listMyRealEstateListings,
} from '@/lib/listings-client';
import { listPublicContracts } from '@/lib/public-contracts-client';
import { listMySubscriptions, fetchOkazionPlanQuota, fetchPremiumPlanQuota } from '@/lib/payments-client';
import { getUserPortalAccountCategoryLabel } from '@/lib/user-portal-account-label';
import { getUserDashboardCopy } from '@/lib/user-dashboard-copy';
import type { ContractQuotas, PublicContract } from '@/types/contract';
import { FREE_PLAN_QUOTAS } from '@/types/contract';
import type { UserSubscriptionSummary } from '@/types/payment';
import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { AddListingPickerDialog } from '@/components/user/add-listing-picker-dialog';
import { DailyStreakCard } from '@/components/user/daily-streak-card';
import { LanguageSwitchRow } from '@/components/user/language-switch-row';
import { UserNotificationsMenu } from '@/components/user/layout/user-notifications-menu';
import { PortalLinkCard, PortalLinkGroup, portalCardSx } from '@/components/user/portal-cards';
import { ReferralSummaryCard } from '@/components/user/referral-summary-card';
import { SupportContactRow } from '@/components/user/support-contact-row';
import { ThemeSwitchRow } from '@/components/user/theme-switch-row';
import { planAccentForCode } from '@/components/user/packages/package-ui';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { OKAZION_ACCENT } from '@/lib/home-categories';

function quotasFromSub(sub: UserSubscriptionSummary | null): ContractQuotas {
  if (!sub) return FREE_PLAN_QUOTAS;
  return {
    maxListAllCategories: sub.maxListAllCategories ?? FREE_PLAN_QUOTAS.maxListAllCategories,
    maxJobListings: sub.maxJobListings ?? FREE_PLAN_QUOTAS.maxJobListings,
    maxCarListings: sub.maxCarListings ?? FREE_PLAN_QUOTAS.maxCarListings,
    maxApartmentListings: sub.maxApartmentListings ?? FREE_PLAN_QUOTAS.maxApartmentListings,
    maxProductListings: sub.maxProductListings ?? FREE_PLAN_QUOTAS.maxProductListings,
    maxPremiumListings: sub.maxPremiumListings ?? 0,
    maxOkazionListings: sub.maxOkazionListings ?? 0,
  };
}

function ActionTile({
  href,
  onClick,
  label,
  icon: Icon,
  tone = 'primary',
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: PhosphorIcon;
  tone?: 'primary' | 'amber';
}) {
  const isAmber = tone === 'amber';
  const accentAlpha = (dark: number, light: number) => (t: { palette: { mode: string } }) =>
    isAmber
      ? t.palette.mode === 'dark'
        ? `rgba(245, 166, 35, ${dark})`
        : `rgba(245, 166, 35, ${light})`
      : primaryMainAlpha(t.palette.mode === 'dark' ? dark : light);

  const sx = {
    ...portalCardSx,
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
    minHeight: { xs: 148, sm: 160 },
    height: '100%',
    p: 2.25,
    color: 'text.primary',
    cursor: 'pointer',
    width: '100%',
    font: 'inherit',
    borderColor: accentAlpha(0.32, 0.28),
    bgcolor: accentAlpha(0.12, 0.08),
    transition: 'transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      borderColor: isAmber ? '#F5A623' : 'primary.main',
      bgcolor: accentAlpha(0.18, 0.12),
    },
  } as const;

  const content = (
    <>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2.5,
          display: 'grid',
          placeItems: 'center',
          bgcolor: accentAlpha(0.22, 0.16),
          color: isAmber ? '#F5A623' : 'primary.main',
        }}
      >
        {React.createElement(Icon, { size: 28, weight: 'bold' })}
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: '1.02rem', textAlign: 'center', lineHeight: 1.25 }}>
        {label}
      </Typography>
    </>
  );

  if (onClick) {
    return (
      <Box component="button" type="button" onClick={onClick} sx={sx}>
        {content}
      </Box>
    );
  }

  return (
    <Box
      component={RouterLink}
      href={href || paths.user.dashboard}
      sx={{ ...sx, textDecoration: 'none', color: 'inherit' }}
    >
      {content}
    </Box>
  );
}

function QuotaStat({
  label,
  used,
  max,
  icon: Icon,
  tone,
  convertible = false,
  convertTooltip,
  convertAria,
  unavailableLabel,
  loading = false,
}: {
  label: string;
  used: number;
  max: number;
  icon: PhosphorIcon;
  tone: string;
  convertible?: boolean;
  convertTooltip: string;
  convertAria: string;
  unavailableLabel: string;
  loading?: boolean;
}) {
  const percent = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const barPercent = used > 0 && percent < 4 ? 4 : percent;

  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        alignItems: 'center',
        py: 1.15,
        px: { xs: 0.25, sm: 0.5 },
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.75,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          bgcolor: `${tone}18`,
          color: tone,
        }}
      >
        {React.createElement(Icon, { size: 18, weight: 'bold' })}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 0.55 }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.9rem',
              lineHeight: 1.2,
              color: 'text.primary',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={52} height={22} sx={{ flexShrink: 0 }} />
          ) : (
            <Typography
              sx={{
                fontWeight: 750,
                fontSize: '0.88rem',
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                flexShrink: 0,
                color: max <= 0 ? 'text.secondary' : 'text.primary',
              }}
            >
              {max <= 0 ? (
                unavailableLabel
              ) : (
                <>
                  {used}
                  <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {' '}
                    / {max}
                  </Box>
                </>
              )}
            </Typography>
          )}
        </Stack>
        <LinearProgress
          variant={loading ? 'indeterminate' : 'determinate'}
          value={max <= 0 ? 0 : barPercent}
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
            '& .MuiLinearProgress-bar': {
              borderRadius: 2,
              bgcolor: loading || max <= 0 ? 'text.disabled' : tone,
            },
          }}
        />
      </Box>

      {convertible ? (
        <Tooltip title={convertTooltip} arrow>
          <IconButton
            component={RouterLink}
            href={`${paths.user.packagesExtra}#convert`}
            size="small"
            aria-label={convertAria}
            sx={{
              width: 30,
              height: 30,
              color: 'text.secondary',
              flexShrink: 0,
              '&:hover': { color: tone, bgcolor: `${tone}18` },
            }}
          >
            <ArrowsLeftRightIcon size={15} weight="bold" />
          </IconButton>
        </Tooltip>
      ) : (
        <Box sx={{ width: 30, height: 30, flexShrink: 0 }} aria-hidden />
      )}
    </Stack>
  );
}

export default function UserDashboardPage() {
  const { user, checkSession } = useUser();
  const { language } = useLanguage();
  const t = getUserDashboardCopy(language);

  React.useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const subscriberKindFilter = user?.accountType === 'business' || user?.role === 'business-user' ? 'company' : 'agent';
  const [plans, setPlans] = React.useState<PublicContract[]>([]);
  const [activeSub, setActiveSub] = React.useState<UserSubscriptionSummary | null>(null);
  const [usage, setUsage] = React.useState({
    apartments: 0,
    cars: 0,
    jobs: 0,
    products: 0,
    premium: 0,
    okazion: 0,
  });
  const [subscriptionLoading, setSubscriptionLoading] = React.useState(true);
  const [usageLoading, setUsageLoading] = React.useState(true);
  const [addListingOpen, setAddListingOpen] = React.useState(false);

  const canPublish =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  React.useEffect(() => {
    if (!user) {
      setSubscriptionLoading(false);
      return;
    }
    let cancelled = false;
    setSubscriptionLoading(true);
    void (async () => {
      try {
        const [{ contracts }, subsRes] = await Promise.all([
          listPublicContracts({ subscriberKind: subscriberKindFilter }),
          listMySubscriptions(),
        ]);
        if (cancelled) return;
        setPlans(contracts ?? []);
        const active =
          (subsRes.subscriptions ?? []).find((s) => s.status === 'active' && Number(s.priceEur) > 0) ?? null;
        setActiveSub(active);
      } finally {
        if (!cancelled) setSubscriptionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, subscriberKindFilter]);

  React.useEffect(() => {
    if (!user || !canPublish) {
      setUsage({ apartments: 0, cars: 0, jobs: 0, products: 0, premium: 0, okazion: 0 });
      setUsageLoading(false);
      return;
    }
    let cancelled = false;
    setUsageLoading(true);
    void Promise.all([
      listMyRealEstateListings(),
      listMyCarListings(),
      listMyJobListings(),
      listMyMarketplaceListings(),
      fetchPremiumPlanQuota(),
      fetchOkazionPlanQuota(),
    ])
      .then(([re, cars, jobs, mkt, premium, okazion]) => {
        if (cancelled) return;
        setUsage({
          apartments: (re.listings ?? []).length,
          cars: (cars.listings ?? []).length,
          jobs: (jobs.listings ?? []).length,
          products: (mkt.listings ?? []).length,
          premium: premium.quota?.used ?? 0,
          okazion: okazion.quota?.used ?? 0,
        });
      })
      .finally(() => {
        if (!cancelled) setUsageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, canPublish]);

  const boostCoins = Math.max(0, Math.floor(Number(user?.boostCredits) || 0));
  const categoryLabel = getUserPortalAccountCategoryLabel(user ?? null);
  const isBusinessAccount =
    user?.accountType === 'business' || user?.role === 'business-user';
  const categoryBadgeColor = isBusinessAccount ? '#f59e0b' : '#22c55e';
  const quotas = React.useMemo(() => {
    if (activeSub) return quotasFromSub(activeSub);
    const freePlan = plans.find((p) => p.planCode === 'free');
    if (freePlan) {
      return {
        maxListAllCategories: freePlan.maxListAllCategories,
        maxJobListings: freePlan.maxJobListings,
        maxCarListings: freePlan.maxCarListings,
        maxApartmentListings: freePlan.maxApartmentListings,
        maxProductListings: freePlan.maxProductListings,
        maxPremiumListings: freePlan.maxPremiumListings,
        maxOkazionListings: freePlan.maxOkazionListings ?? 0,
      };
    }
    return FREE_PLAN_QUOTAS;
  }, [activeSub, plans]);
  const quotasLoading = subscriptionLoading || usageLoading;
  const activePlanLabel = activeSub?.contractTitle || activeSub?.planCode?.toUpperCase() || 'FREE';
  const activePlanBadgeColor = String(planAccentForCode(activeSub?.planCode ?? 'free'));

  if (!user) return null;

  return (
    <Stack spacing={3}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            {t.panelTitle}
          </Typography>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ display: { xs: 'flex', lg: 'none' }, alignItems: 'center', mr: -0.5 }}
          >
            <UserNotificationsMenu />
            <Tooltip title={t.profileTitle}>
              <IconButton
                component={RouterLink}
                href={paths.user.profile}
                size="large"
                aria-label={t.profileTitle}
                sx={{ color: 'text.secondary' }}
              >
                <UserGearIcon size={22} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t.signOut}>
              <IconButton
                size="large"
                aria-label={t.signOut}
                onClick={() => {
                  void authClient.signOut();
                }}
                sx={{ color: 'text.secondary' }}
              >
                <SignOutIcon size={22} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Box
          component={RouterLink}
          href={paths.user.credits}
          sx={{
            alignSelf: 'flex-start',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            pl: 0.75,
            pr: 1.5,
            py: 0.75,
            borderRadius: 999,
            border: '1px solid',
            borderColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(232, 185, 35, 0.28)' : 'rgba(212, 160, 23, 0.35)',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(232, 185, 35, 0.08)' : 'rgba(232, 185, 35, 0.1)',
            transition: 'border-color 0.15s ease, background-color 0.15s ease',
            '&:hover': {
              borderColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(232, 185, 35, 0.5)' : 'rgba(212, 160, 23, 0.55)',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(232, 185, 35, 0.14)' : 'rgba(232, 185, 35, 0.16)',
            },
          }}
        >
          <BoostCoinIcon size={28} />
          <Typography
            component="span"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.875rem',
              lineHeight: 1,
            }}
          >
            {t.boostCoins}
          </Typography>
          <Typography
            component="span"
            sx={{
              color: '#e8b923',
              fontWeight: 800,
              fontSize: '0.95rem',
              lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          >
            {new Intl.NumberFormat('en-US').format(boostCoins)}
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
        {canPublish ? (
          <Grid size={{ xs: 6, md: 3 }}>
            <ActionTile
              onClick={() => setAddListingOpen(true)}
              label={t.addListing}
              icon={PlusIcon}
            />
          </Grid>
        ) : null}
        <Grid size={{ xs: 6, md: 3 }}>
          <ActionTile href={paths.user.statistics} label={t.statistics} icon={ChartLineUpIcon} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <ActionTile href={paths.user.myRealEstateListings} label={t.myListings} icon={ListBulletsIcon} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <ActionTile
            href={paths.user.credits}
            label={t.buyCredits}
            icon={BoostCoinIcon as PhosphorIcon}
            tone="amber"
          />
        </Grid>
      </Grid>

      <AddListingPickerDialog open={addListingOpen} onClose={() => setAddListingOpen(false)} />

      {canPublish ? (
        <Box sx={{ ...portalCardSx, p: { xs: 2, sm: 2.5 } }}>
          <Stack spacing={0.35} sx={{ mb: 1.25 }}>
            <Typography sx={{ fontWeight: 850, fontSize: '1.05rem', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              {t.subscriptionPackage}
            </Typography>
            {subscriptionLoading ? (
              <Skeleton variant="text" width={160} height={20} />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                {t.quotasHint(activePlanLabel, categoryLabel)}
              </Typography>
            )}
          </Stack>

          <Stack
            spacing={0}
            sx={{
              borderRadius: 2.25,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
              px: { xs: 1.25, sm: 1.5 },
              '& > *:not(:last-child)': {
                borderBottom: '1px solid',
                borderColor: 'divider',
              },
            }}
          >
            <QuotaStat
              label={t.apartments}
              used={usage.apartments}
              max={quotas.maxApartmentListings}
              icon={BuildingsIcon}
              tone="#3ec6e0"
              convertible
              convertTooltip={t.convertTooltip}
              convertAria={t.convertAria(t.apartments)}
              unavailableLabel={t.unavailable}
              loading={quotasLoading}
            />
            <QuotaStat
              label={t.cars}
              used={usage.cars}
              max={quotas.maxCarListings}
              icon={CarIcon}
              tone="#7ac943"
              convertible
              convertTooltip={t.convertTooltip}
              convertAria={t.convertAria(t.cars)}
              unavailableLabel={t.unavailable}
              loading={quotasLoading}
            />
            <QuotaStat
              label={t.jobs}
              used={usage.jobs}
              max={quotas.maxJobListings}
              icon={BriefcaseIcon}
              tone="#8b5cf6"
              convertible
              convertTooltip={t.convertTooltip}
              convertAria={t.convertAria(t.jobs)}
              unavailableLabel={t.unavailable}
              loading={quotasLoading}
            />
            <QuotaStat
              label={t.products}
              used={usage.products}
              max={quotas.maxProductListings}
              icon={StorefrontIcon}
              tone="#f5a623"
              convertible
              convertTooltip={t.convertTooltip}
              convertAria={t.convertAria(t.products)}
              unavailableLabel={t.unavailable}
              loading={quotasLoading}
            />
            <QuotaStat
              label={t.premium}
              used={usage.premium}
              max={quotas.maxPremiumListings}
              icon={SparkleIcon}
              tone="#e8b923"
              convertTooltip={t.convertTooltip}
              convertAria={t.convertAria(t.premium)}
              unavailableLabel={t.unavailable}
              loading={quotasLoading}
            />
            <QuotaStat
              label={t.okazion}
              used={usage.okazion}
              max={quotas.maxOkazionListings}
              icon={SealPercentIcon}
              tone={OKAZION_ACCENT}
              convertTooltip={t.convertTooltip}
              convertAria={t.convertAria(t.okazion)}
              unavailableLabel={t.unavailable}
              loading={quotasLoading}
            />
          </Stack>
        </Box>
      ) : null}

      {canPublish ? <ReferralSummaryCard /> : null}
      {!canPublish ? <DailyStreakCard /> : null}

      <PortalLinkGroup>
        <PortalLinkCard
          grouped
          href={paths.user.packagesMain}
          title={t.packagesTitle}
          icon={PackageIcon}
          badge={subscriptionLoading ? undefined : activePlanLabel}
          badgeColor={activePlanBadgeColor}
        />
        <PortalLinkCard
          grouped
          href={paths.user.packagesExtra}
          title={t.extraPackagesTitle}
          icon={SquaresFourIcon}
        />
        {canPublish ? (
          <PortalLinkCard
            grouped
            href={paths.user.payments}
            title={t.paymentsTitle}
            icon={ReceiptIcon}
          />
        ) : null}
      </PortalLinkGroup>

      <PortalLinkGroup>
        <PortalLinkCard
          grouped
          href={paths.user.profile}
          title={t.profileTitle}
          icon={UserGearIcon}
          badge={categoryLabel}
          badgeColor={categoryBadgeColor}
        />
        <PortalLinkCard
          grouped
          href={paths.user.notificationSettings}
          title={t.notificationsTitle}
          icon={BellIcon}
        />
        <ThemeSwitchRow grouped />
        <LanguageSwitchRow grouped />
        <SupportContactRow grouped />
        <PortalLinkCard
          grouped
          href={paths.public.terms}
          title={t.termsTitle}
          icon={FileTextIcon}
        />
        <PortalLinkCard
          grouped
          href={paths.public.privacy}
          title={t.privacyTitle}
          icon={ShieldCheckIcon}
        />
      </PortalLinkGroup>

      <Button
        variant="outlined"
        color="inherit"
        fullWidth
        startIcon={<SignOutIcon size={20} />}
        onClick={() => {
          void authClient.signOut();
        }}
        sx={{
          fontWeight: 700,
          borderRadius: 3.5,
          py: 1.4,
          borderColor: 'divider',
          color: 'error.main',
          '&:hover': {
            borderColor: 'error.main',
            bgcolor: (theme) => `${theme.palette.error.main}14`,
          },
        }}
      >
        {t.signOut}
      </Button>
    </Stack>
  );
}
