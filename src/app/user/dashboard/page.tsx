'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowsLeftRight as ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { ChartLineUp as ChartLineUpIcon } from '@phosphor-icons/react/dist/ssr/ChartLineUp';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { ListBullets as ListBulletsIcon } from '@phosphor-icons/react/dist/ssr/ListBullets';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Receipt as ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { SignOut as SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
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
import { listMySubscriptions, fetchPremiumPlanQuota } from '@/lib/payments-client';
import { getUserPortalAccountCategoryLabel } from '@/lib/user-portal-account-label';
import { getUserDashboardCopy } from '@/lib/user-dashboard-copy';
import type { ContractQuotas, PublicContract } from '@/types/contract';
import { FREE_PLAN_QUOTAS } from '@/types/contract';
import type { UserSubscriptionSummary } from '@/types/payment';
import { ThemeModeToggle } from '@/components/dashboard/layout/theme-mode-toggle';
import { AddListingPickerDialog } from '@/components/user/add-listing-picker-dialog';
import { DailyStreakCard } from '@/components/user/daily-streak-card';
import { HeaderLanguageToggle } from '@/components/user/header-language-toggle';
import { LanguageSwitchRow } from '@/components/user/language-switch-row';
import { PortalLinkCard, PortalLinkGroup, portalCardSx } from '@/components/user/portal-cards';
import { planAccentForCode } from '@/components/user/packages/package-ui';
import { hardNavigate } from '@/lib/hard-navigate';

function quotasFromSub(sub: UserSubscriptionSummary | null): ContractQuotas {
  if (!sub) return FREE_PLAN_QUOTAS;
  return {
    maxListAllCategories: sub.maxListAllCategories ?? FREE_PLAN_QUOTAS.maxListAllCategories,
    maxJobListings: sub.maxJobListings ?? FREE_PLAN_QUOTAS.maxJobListings,
    maxCarListings: sub.maxCarListings ?? FREE_PLAN_QUOTAS.maxCarListings,
    maxApartmentListings: sub.maxApartmentListings ?? FREE_PLAN_QUOTAS.maxApartmentListings,
    maxProductListings: sub.maxProductListings ?? FREE_PLAN_QUOTAS.maxProductListings,
    maxPremiumListings: sub.maxPremiumListings ?? 0,
  };
}

const GRADIENTS = {
  blue: 'linear-gradient(160deg, #3ec6e0 0%, #2f86c5 100%)',
  purple: 'linear-gradient(160deg, #8b5cf6 0%, #6d28d9 100%)',
  green: 'linear-gradient(160deg, #7ac943 0%, #4a9e2a 100%)',
  orange: 'linear-gradient(160deg, #f5a623 0%, #e8821e 100%)',
} as const;

function ActionTile({
  href,
  onClick,
  label,
  icon: Icon,
  gradient,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: PhosphorIcon;
  gradient: string;
}) {
  const sx = {
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
    minHeight: { xs: 148, sm: 160 },
    height: '100%',
    p: 2.25,
    borderRadius: 3.5,
    background: gradient,
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    cursor: 'pointer',
    width: '100%',
    font: 'inherit',
    boxShadow: '0 10px 24px rgba(0,0,0,0.2)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 14px 30px rgba(0,0,0,0.28)',
      filter: 'brightness(1.05)',
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
          bgcolor: 'rgba(255,255,255,0.22)',
          border: '1px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {React.createElement(Icon, { size: 28, weight: 'bold', color: '#fff' })}
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
      component="a"
      href={href || paths.user.dashboard}
      onClick={(event) => hardNavigate(href || paths.user.dashboard, event)}
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
  remainingLabel,
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
  remainingLabel: string;
}) {
  const percent = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  const barPercent = used > 0 && percent < 4 ? 4 : percent;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        minWidth: 0,
        px: 1.5,
        py: 1.15,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 0.75 }}>
        <Stack direction="row" spacing={0.85} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: `${tone}24`,
              color: tone,
            }}
          >
            {React.createElement(Icon, { size: 17, weight: 'bold' })}
          </Box>
          <Typography
            sx={{
              fontWeight: 750,
              fontSize: '0.8rem',
              lineHeight: 1.25,
              color: 'text.secondary',
              wordBreak: 'break-word',
            }}
          >
            {label}
          </Typography>
        </Stack>
        {convertible ? (
          <Tooltip title={convertTooltip} arrow>
            <IconButton
              component="a"
              href={`${paths.user.packagesExtra}#convert`}
              onClick={(event) => hardNavigate(`${paths.user.packagesExtra}#convert`, event)}
              size="small"
              aria-label={convertAria}
              sx={{
                width: 28,
                height: 28,
                color: tone,
                bgcolor: `${tone}18`,
                flexShrink: 0,
                '&:hover': { bgcolor: `${tone}2e` },
              }}
            >
              <ArrowsLeftRightIcon size={14} weight="bold" />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>

      <Typography sx={{ mt: 0.75, fontWeight: 850, fontSize: '1.05rem', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
        {used}
        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 650, fontSize: '0.82rem' }}>
          {' '}
          / {max}
        </Box>
      </Typography>

      <Box sx={{ mt: 0.85 }}>
        <LinearProgress
          variant="determinate"
          value={barPercent}
          sx={{
            height: 3.5,
            borderRadius: 2,
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
            '& .MuiLinearProgress-bar': {
              borderRadius: 2,
              bgcolor: tone,
            },
          }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.45, fontWeight: 550, fontSize: '0.68rem', lineHeight: 1.2 }}
        >
          {max <= 0 ? unavailableLabel : remainingLabel}
        </Typography>
      </Box>
    </Box>
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
  });
  const [addListingOpen, setAddListingOpen] = React.useState(false);

  const canPublish =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const [{ contracts }, subsRes] = await Promise.all([
        listPublicContracts({ subscriberKind: subscriberKindFilter }),
        listMySubscriptions(),
      ]);
      if (cancelled) return;
      setPlans(contracts ?? []);
      const active =
        (subsRes.subscriptions ?? []).find((s) => s.status === 'active' && Number(s.priceEur) > 0) ?? null;
      setActiveSub(active);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, subscriberKindFilter]);

  React.useEffect(() => {
    if (!user || !canPublish) {
      setUsage({ apartments: 0, cars: 0, jobs: 0, products: 0, premium: 0 });
      return;
    }
    let cancelled = false;
    void Promise.all([
      listMyRealEstateListings(),
      listMyCarListings(),
      listMyJobListings(),
      listMyMarketplaceListings(),
      fetchPremiumPlanQuota(),
    ]).then(([re, cars, jobs, mkt, premium]) => {
      if (cancelled) return;
      setUsage({
        apartments: (re.listings ?? []).length,
        cars: (cars.listings ?? []).length,
        jobs: (jobs.listings ?? []).length,
        products: (mkt.listings ?? []).length,
        premium: premium.quota?.used ?? 0,
      });
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
      };
    }
    return FREE_PLAN_QUOTAS;
  }, [activeSub, plans]);
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
            <HeaderLanguageToggle />
            <ThemeModeToggle />
          </Stack>
        </Stack>

        <Box
          component="a"
          href={paths.user.credits}
          onClick={(event) => hardNavigate(paths.user.credits, event)}
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
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(232, 185, 35, 0.18)' : 'rgba(232, 185, 35, 0.2)',
              color: '#e8b923',
            }}
          >
            <CoinsIcon size={16} weight="fill" />
          </Box>
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
              gradient={GRADIENTS.blue}
            />
          </Grid>
        ) : null}
        <Grid size={{ xs: 6, md: 3 }}>
          <ActionTile href={paths.user.statistics} label={t.statistics} icon={ChartLineUpIcon} gradient={GRADIENTS.purple} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <ActionTile href={paths.user.myRealEstateListings} label={t.myListings} icon={ListBulletsIcon} gradient={GRADIENTS.green} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <ActionTile href={paths.user.credits} label={t.buyCredits} icon={CoinsIcon} gradient={GRADIENTS.orange} />
        </Grid>
      </Grid>

      <AddListingPickerDialog open={addListingOpen} onClose={() => setAddListingOpen(false)} />

      {canPublish ? (
        <Box sx={{ ...portalCardSx, p: { xs: 2, sm: 2.5 } }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 0.75 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 850, fontSize: '1.05rem', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                {t.subscriptionPackage}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                {t.quotasHint(activePlanLabel, categoryLabel)}
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                md: 'repeat(5, minmax(0, 1fr))',
              },
              gap: 1.1,
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
              remainingLabel={t.remaining(Math.max(0, quotas.maxApartmentListings - usage.apartments))}
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
              remainingLabel={t.remaining(Math.max(0, quotas.maxCarListings - usage.cars))}
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
              remainingLabel={t.remaining(Math.max(0, quotas.maxJobListings - usage.jobs))}
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
              remainingLabel={t.remaining(Math.max(0, quotas.maxProductListings - usage.products))}
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
              remainingLabel={t.remaining(Math.max(0, quotas.maxPremiumListings - usage.premium))}
            />
          </Box>
        </Box>
      ) : null}

      <DailyStreakCard />

      <PortalLinkGroup>
        <PortalLinkCard
          grouped
          href={paths.user.packages}
          title={t.packagesTitle}
          description={t.packagesDescription}
          icon={PackageIcon}
          badge={activePlanLabel}
          badgeColor={activePlanBadgeColor}
        />
        {canPublish ? (
          <PortalLinkCard
            grouped
            href={paths.user.referral}
            title={t.referralTitle}
            description={t.referralDescription}
            icon={HandshakeIcon}
          />
        ) : null}
        {canPublish ? (
          <PortalLinkCard
            grouped
            href={paths.user.payments}
            title={t.paymentsTitle}
            description={t.paymentsDescription}
            icon={ReceiptIcon}
          />
        ) : null}
        <PortalLinkCard
          grouped
          href={paths.user.profile}
          title={t.profileTitle}
          description={t.profileDescription}
          icon={UserGearIcon}
          badge={categoryLabel}
          badgeColor={categoryBadgeColor}
        />
        <PortalLinkCard
          grouped
          href={paths.public.terms}
          title={t.termsTitle}
          description={t.termsDescription}
          icon={FileTextIcon}
        />
        <PortalLinkCard
          grouped
          href={paths.public.privacy}
          title={t.privacyTitle}
          description={t.privacyDescription}
          icon={ShieldCheckIcon}
        />
      </PortalLinkGroup>

      <LanguageSwitchRow />

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
