'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { ChartLineUp as ChartLineUpIcon } from '@phosphor-icons/react/dist/ssr/ChartLineUp';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { ListBullets as ListBulletsIcon } from '@phosphor-icons/react/dist/ssr/ListBullets';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { paths } from '@/paths';
import { useUser } from '@/hooks/use-user';
import {
  listMyCarListings,
  listMyJobListings,
  listMyMarketplaceListings,
  listMyRealEstateListings,
} from '@/lib/listings-client';
import { normalizeListingModerationStatus } from '@/lib/listing-moderation-status';
import { listPublicContracts } from '@/lib/public-contracts-client';
import { getUserPortalAccountCategoryLabel } from '@/lib/user-portal-account-label';
import type { PublicContract } from '@/types/contract';

// NOTE: Posting/premium caps come from the user's active subscription once that
// backend exists. Until then these are placeholder caps; the "used" values are real.
const DEFAULT_LISTING_QUOTA = 10;
const DEFAULT_PREMIUM_QUOTA = 5;

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
  const [plansLoading, setPlansLoading] = React.useState(true);
  const [plansError, setPlansError] = React.useState<string | null>(null);
  const [postedListings, setPostedListings] = React.useState<number | null>(null);

  const canPublish =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setPlansLoading(true);
    setPlansError(null);
    void (async () => {
      const { contracts, error } = await listPublicContracts({ subscriberKind: subscriberKindFilter });
      if (cancelled) return;
      if (error) {
        setPlansError(error);
        setPlans([]);
      } else {
        setPlans(contracts ?? []);
      }
      setPlansLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, subscriberKindFilter]);

  React.useEffect(() => {
    if (!user || !canPublish) {
      setPostedListings(null);
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
      const all = [
        ...(re.listings ?? []),
        ...(cars.listings ?? []),
        ...(jobs.listings ?? []),
        ...(mkt.listings ?? []),
      ];
      setPostedListings(all.length);
    });
    return () => {
      cancelled = true;
    };
  }, [user, canPublish]);

  const boostCoins = typeof user?.boostCredits === 'number' ? user.boostCredits : 0;
  const categoryLabel = getUserPortalAccountCategoryLabel(user ?? null);

  if (!user) return null;

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
          Paneli
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            alignSelf: { xs: 'flex-start', sm: 'auto' },
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
          <ActionTile href={paths.user.referral} label="Bli Kredite" icon={CoinsIcon} gradient={GRADIENTS.orange} />
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
              label={`${categoryLabel} · Package`}
              sx={{ fontWeight: 700, alignSelf: { xs: 'flex-start', sm: 'auto' } }}
            />
          </Stack>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <QuotaStat
                label="Mund të postoni"
                used={postedListings ?? 0}
                max={DEFAULT_LISTING_QUOTA}
                icon={ListBulletsIcon}
                accent="success"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <QuotaStat
                label="Njoftime premium"
                used={0}
                max={DEFAULT_PREMIUM_QUOTA}
                icon={SparkleIcon}
                accent="warning"
              />
            </Grid>
          </Grid>
        </Box>
      ) : null}

      <Box sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
          Paketat për ju
        </Typography>
        {plansLoading ? (
          <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : null}
        {plansError ? (
          <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
            {plansError}
          </Alert>
        ) : null}
        {!plansLoading && !plansError && plans.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Për momentin nuk ka plan aktiv me çmim për llogarinë tuaj.
          </Typography>
        ) : null}
        {!plansLoading && !plansError && plans.length > 0 ? (
          <Stack spacing={2}>
            {plans.map((plan) => (
              <Box
                key={plan.id}
                sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}
              >
                <Typography sx={{ fontWeight: 700 }}>{plan.title}</Typography>
                {plan.listingCategoryTitle ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {plan.listingCategoryTitle}
                  </Typography>
                ) : null}
                <Stack direction="row" sx={{ flexWrap: 'wrap', mt: 1.5, gap: 1 }}>
                  {plan.priceOptions.map((opt) => (
                    <Chip
                      key={opt.months}
                      size="small"
                      label={`${opt.labelSq}: ${opt.price} €`}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : null}
      </Box>
    </Stack>
  );
}
