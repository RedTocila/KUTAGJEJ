'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Box,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { ChartLineUp as ChartLineUpIcon } from '@phosphor-icons/react/dist/ssr/ChartLineUp';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { ListBullets as ListBulletsIcon } from '@phosphor-icons/react/dist/ssr/ListBullets';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Receipt as ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { UserGear as UserGearIcon } from '@phosphor-icons/react/dist/ssr/UserGear';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { paths } from '@/paths';
import { useUser } from '@/hooks/use-user';
import {
  listMyCarListings,
  listMyJobListings,
  listMyMarketplaceListings,
  listMyRealEstateListings,
} from '@/lib/listings-client';
import { listPublicContracts } from '@/lib/public-contracts-client';
import { listMySubscriptions } from '@/lib/payments-client';
import { getUserPortalAccountCategoryLabel } from '@/lib/user-portal-account-label';
import type { ContractQuotas, PublicContract } from '@/types/contract';
import { FREE_PLAN_QUOTAS } from '@/types/contract';
import type { UserSubscriptionSummary } from '@/types/payment';
import { ThemeModeToggle } from '@/components/dashboard/layout/theme-mode-toggle';

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
  label,
  icon: Icon,
  gradient,
}: {
  href: string;
  label: string;
  icon: PhosphorIcon;
  gradient: string;
}) {
  return (
    <Box
      component={RouterLink}
      href={href}
      sx={{
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        minHeight: { xs: 150, sm: 168 },
        p: 2.5,
        borderRadius: 3,
        background: gradient,
        color: '#fff',
        boxShadow: '0 8px 22px rgba(0,0,0,0.18)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 30px rgba(0,0,0,0.26)', filter: 'brightness(1.04)' },
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2.5,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'rgba(255,255,255,0.22)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {React.createElement(Icon, { size: 30, weight: 'bold', color: '#fff' })}
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', textAlign: 'center', lineHeight: 1.25 }}>
        {label}
      </Typography>
    </Box>
  );
}

/** Full-width panel row — opens a dedicated page. */
function PanelLinkCard({
  href,
  title,
  description,
  icon: Icon,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  icon: PhosphorIcon;
  badge?: string;
}) {
  return (
    <Box
      component={RouterLink}
      href={href}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        p: { xs: 2.25, sm: 3 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'action.hover'),
        },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: (t) => `${t.palette.primary.main}22`,
            color: 'primary.main',
          }}
        >
          {React.createElement(Icon, { size: 24, weight: 'duotone' })}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {description}
          </Typography>
          {badge ? (
            <Chip
              label={badge}
              size="small"
              sx={{ mt: 1.25, fontWeight: 700 }}
            />
          ) : null}
        </Box>
        <Box sx={{ color: 'text.secondary', display: 'flex', flexShrink: 0 }}>
          <CaretRightIcon size={20} weight="bold" />
        </Box>
      </Stack>
    </Box>
  );
}

function QuotaStat({
  label,
  used,
  max,
  icon: Icon,
  accent,
}: {
  label: string;
  used: number;
  max: number;
  icon: PhosphorIcon;
  accent: 'success' | 'warning';
}) {
  const percent = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
        height: '100%',
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (t) => `${t.palette[accent].main}22`,
            color: `${accent}.main`,
            flexShrink: 0,
          }}
        >
          {React.createElement(Icon, { size: 20, weight: 'duotone' })}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.3 }}>
            {label}
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.15rem' }}>
            {used} <Typography component="span" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>nga {max}</Typography>
          </Typography>
        </Box>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percent}
        color={accent}
        sx={{ mt: 1.5, height: 8, borderRadius: 4, bgcolor: 'action.hover' }}
      />
    </Box>
  );
}

export default function UserDashboardPage() {
  const { user } = useUser();

  const subscriberKindFilter = user?.accountType === 'business' || user?.role === 'business-user' ? 'company' : 'agent';
  const [plans, setPlans] = React.useState<PublicContract[]>([]);
  const [activeSub, setActiveSub] = React.useState<UserSubscriptionSummary | null>(null);
  const [usage, setUsage] = React.useState({
    apartments: 0,
    cars: 0,
    jobs: 0,
    products: 0,
  });

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
      setUsage({ apartments: 0, cars: 0, jobs: 0, products: 0 });
      return;
    }
    let cancelled = false;
    void Promise.all([
      listMyRealEstateListings(),
      listMyCarListings(),
      listMyJobListings(),
      listMyMarketplaceListings(),
    ]).then(([re, cars, jobs, mkt]) => {
      if (cancelled) return;
      setUsage({
        apartments: (re.listings ?? []).length,
        cars: (cars.listings ?? []).length,
        jobs: (jobs.listings ?? []).length,
        products: (mkt.listings ?? []).length,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [user, canPublish]);

  const boostCoins = typeof user?.boostCredits === 'number' ? user.boostCredits : 0;
  const categoryLabel = getUserPortalAccountCategoryLabel(user ?? null);
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
  const activePlanLabel = activeSub?.contractTitle || 'FREE';

  if (!user) return null;

  return (
    <Stack spacing={3}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            Paneli
          </Typography>
          <Box sx={{ display: { xs: 'block', lg: 'none' }, mr: -1 }}>
            <ThemeModeToggle />
          </Box>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            alignSelf: 'flex-start',
            px: 1.75,
            py: 0.85,
            borderRadius: 999,
            border: '1px solid',
            borderColor: (t) => `${t.palette.warning.main}55`,
            bgcolor: (t) => `${t.palette.warning.main}14`,
            color: 'warning.main',
          }}
        >
          <CoinsIcon size={22} weight="duotone" />
          <Typography component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Boost coins
          </Typography>
          <Typography component="span" sx={{ fontWeight: 800 }}>
            {new Intl.NumberFormat('en-US').format(boostCoins)}
          </Typography>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        {canPublish ? (
          <Grid size={{ xs: 6, md: 3 }}>
            <ActionTile href={paths.user.realEstateListing} label="Shto njoftim" icon={PlusIcon} gradient={GRADIENTS.blue} />
          </Grid>
        ) : null}
        <Grid size={{ xs: 6, md: 3 }}>
          <ActionTile href={paths.user.myRealEstateListings} label="Statistikat" icon={ChartLineUpIcon} gradient={GRADIENTS.purple} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <ActionTile href={paths.user.myRealEstateListings} label="Njoftimet e mia" icon={ListBulletsIcon} gradient={GRADIENTS.green} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <ActionTile href={paths.user.credits} label="Bli Kredite" icon={CoinsIcon} gradient={GRADIENTS.orange} />
        </Grid>
      </Grid>

      {canPublish ? (
        <Box sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2.5 }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Paketa e abonimit
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kuota e postimeve nga plani juaj
              </Typography>
            </Box>
            <Chip
              label={`${activePlanLabel} · ${categoryLabel}`}
              sx={{ fontWeight: 700, alignSelf: { xs: 'flex-start', sm: 'auto' } }}
            />
          </Stack>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <QuotaStat
                label="Të gjitha kategoritë"
                used={0}
                max={quotas.maxListAllCategories}
                icon={ListBulletsIcon}
                accent="success"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <QuotaStat
                label="Apartamente"
                used={usage.apartments}
                max={quotas.maxApartmentListings}
                icon={ListBulletsIcon}
                accent="success"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <QuotaStat
                label="Makina"
                used={usage.cars}
                max={quotas.maxCarListings}
                icon={ListBulletsIcon}
                accent="success"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <QuotaStat
                label="Vende pune"
                used={usage.jobs}
                max={quotas.maxJobListings}
                icon={ListBulletsIcon}
                accent="success"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <QuotaStat
                label="Produkte"
                used={usage.products}
                max={quotas.maxProductListings}
                icon={ListBulletsIcon}
                accent="success"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <QuotaStat
                label="Njoftime premium"
                used={0}
                max={quotas.maxPremiumListings}
                icon={SparkleIcon}
                accent="warning"
              />
            </Grid>
          </Grid>
        </Box>
      ) : null}

      <Stack spacing={2}>
        <PanelLinkCard
          href={paths.user.packages}
          title="Paketat për ju"
          description="Shikoni planet e abonimit dhe blini planin që ju përshtatet."
          icon={PackageIcon}
          badge={activePlanLabel}
        />
        {canPublish ? (
          <PanelLinkCard
            href={paths.user.referral}
            title="Referimi"
            description="Ftoni miqtë dhe fitoni kredite nga sistemi i referimit."
            icon={HandshakeIcon}
          />
        ) : null}
        {canPublish ? (
          <PanelLinkCard
            href={paths.user.payments}
            title="Pagesat e mia"
            description="Shikoni pagesat, abonimet dhe historikun e transakcioneve."
            icon={ReceiptIcon}
          />
        ) : null}
        <PanelLinkCard
          href={paths.user.profile}
          title="Profili im"
          description="Menaxhoni të dhënat e llogarisë dhe fjalëkalimin."
          icon={UserGearIcon}
          badge={categoryLabel}
        />
        <PanelLinkCard
          href={paths.public.terms}
          title="Kushtet e përdorimit"
          description="Rregullat e përdorimit të platformës KuTaGjej."
          icon={FileTextIcon}
        />
        <PanelLinkCard
          href={paths.public.privacy}
          title="Politika e privatësisë"
          description="Si mbledhim, përdorim dhe mbrojmë të dhënat tuaja."
          icon={ShieldCheckIcon}
        />
      </Stack>
    </Stack>
  );
}
