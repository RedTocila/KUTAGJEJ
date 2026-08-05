'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { Crown as CrownIcon } from '@phosphor-icons/react/dist/ssr/Crown';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { SealCheck as SealCheckIcon } from '@phosphor-icons/react/dist/ssr/SealCheck';

import { useUser } from '@/hooks/use-user';
import { listPublicContracts } from '@/lib/public-contracts-client';
import { listMySubscriptions } from '@/lib/payments-client';
import type { PublicContract } from '@/types/contract';
import { paths } from '@/paths';
import {
  FeatureList,
  PlanCard,
  PlanCardHeader,
  PlanPrice,
  SoftChip,
  accentPillButtonSx,
  formatEur,
  planAccentForCode,
} from './package-ui';
import type { PlanAccent } from './package-ui';

function planFeatureLines(plan: PublicContract): string[] {
  const lines: string[] = [
    `Deri në ${plan.maxListAllCategories} njoftime (të gjitha kategoritë)`,
    `${plan.maxApartmentListings} njoftime apartamente`,
    `${plan.maxCarListings} njoftime makina`,
    `${plan.maxJobListings} njoftime pune`,
    `${plan.maxProductListings} njoftime produkte`,
  ];
  if (plan.maxPremiumListings > 0) {
    lines.push(`${plan.maxPremiumListings} Premium listing · 30 ditë`);
  }
  if (plan.maxOkazionListings > 0) {
    lines.push(`${plan.maxOkazionListings} OKAZION · 5 ditë`);
  }
  if ((plan.boostCredits ?? 0) > 0) {
    lines.push(`${plan.boostCredits} Boost Coins`);
  }
  if (plan.refreshEveryHours != null) {
    lines.push(`Rifresko postimin pas ${plan.refreshEveryHours} orësh`);
  }
  if (plan.glowBadgeEnabled) {
    lines.push('Trust Badge');
  }
  return lines;
}

function checkoutSubscriptionHref(contractId: string, months: number) {
  const q = new URLSearchParams({
    kind: 'subscription',
    contractId,
    months: String(months),
    returnTo: paths.user.packagesMain,
  });
  return `${paths.user.checkout}?${q.toString()}`;
}

function planAccent(plan: PublicContract): PlanAccent {
  return planAccentForCode(plan.planCode);
}

function isHighlightedPlan(plan: PublicContract): boolean {
  const code = (plan.planCode || '').toLowerCase();
  return code === 'grow' || code === 'elite';
}

function startingPrice(plan: PublicContract): number | null {
  const paid = plan.priceOptions.filter((o) => o.price > 0).map((o) => o.price);
  if (!paid.length) return 0;
  return Math.min(...paid);
}

export function MainPackagesPanel() {
  const router = useRouter();
  const { user } = useUser();
  const subscriberKindFilter =
    user?.accountType === 'business' || user?.role === 'business-user' ? 'company' : 'agent';

  const [plans, setPlans] = React.useState<PublicContract[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeContractId, setActiveContractId] = React.useState<string | null>(null);
  const [activePlanCode, setActivePlanCode] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    const [{ contracts, error: err }, subsRes] = await Promise.all([
      listPublicContracts({ subscriberKind: subscriberKindFilter }),
      listMySubscriptions(),
    ]);
    if (err) {
      setError(err);
      setPlans([]);
    } else {
      setError(null);
      setPlans(contracts ?? []);
    }
    const active =
      (subsRes.subscriptions ?? []).find((s) => s.status === 'active' && Number(s.priceEur) > 0) ?? null;
    setActiveContractId(active?.contractId ?? null);
    setActivePlanCode(active?.planCode ? String(active.planCode).toLowerCase() : null);
  }, [subscriberKindFilter]);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      await reload();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reload]);

  if (!user) return null;

  return (
    <Stack spacing={2.5}>
      {loading ? (
        <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : null}

      {error ? (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      {!loading && !error && plans.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Për momentin nuk ka plan aktiv me çmim për llogarinë tuaj.
        </Alert>
      ) : null}

      {!loading && !error && plans.length > 0 ? (
        <Grid container spacing={2}>
          {plans.map((plan) => {
            const paidOptions = plan.priceOptions.filter((o) => o.price > 0);
            const isFree = plan.planCode === 'free' || plan.priceOptions.every((o) => o.price === 0);
            const planCode = (plan.planCode || '').toLowerCase();
            const hasPaidPlan = Boolean(activeContractId || activePlanCode);
            const isCurrent =
              (activeContractId != null && activeContractId === plan.id) ||
              (activePlanCode != null && planCode === activePlanCode) ||
              (!hasPaidPlan && isFree);
            const accent = planAccent(plan);
            const highlighted = isCurrent || isHighlightedPlan(plan);
            const from = startingPrice(plan);
            const Icon =
              planCode === 'elite'
                ? CrownIcon
                : plan.glowBadgeEnabled
                  ? SealCheckIcon
                  : PackageIcon;

            return (
              <Grid key={plan.id} size={{ xs: 12, sm: 6, lg: 3 }}>
                <PlanCard highlighted={highlighted} accent={accent}>
                  <PlanCardHeader
                    icon={Icon}
                    title={plan.title}
                    subtitle={plan.planCode ? plan.planCode.toUpperCase() : undefined}
                    accent={accent}
                    badge={
                      isCurrent ? (
                        <SoftChip label="Plani juaj" accent={accent} />
                      ) : planCode === 'grow' ? (
                        <SoftChip label="Popullore" accent={accent} />
                      ) : plan.glowBadgeEnabled ? (
                        <SoftChip label="Trust" accent={accent} />
                      ) : undefined
                    }
                  />

                  {isFree ? (
                    <PlanPrice amount="€0" suffix="/ muaj" hint="Filloni falas" />
                  ) : (
                    <PlanPrice
                      amount={from != null ? formatEur(from) : '—'}
                      suffix="nga"
                      hint={
                        isCurrent
                          ? 'Ky është plani aktiv në llogarinë tuaj'
                          : 'Zgjidhni kohëzgjatjen më poshtë'
                      }
                    />
                  )}

                  <FeatureList items={planFeatureLines(plan)} accent={accent} />

                  {isCurrent ? (
                    <Box
                      role="status"
                      sx={{
                        ...accentPillButtonSx(accent, 'outlined'),
                        mt: 'auto',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                        bgcolor: (t) =>
                          t.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(0,0,0,0.03)',
                        cursor: 'default',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Plani juaj aktual
                    </Box>
                  ) : isFree ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      sx={{ ...accentPillButtonSx(accent, 'outlined'), mt: 'auto' }}
                    >
                      Ndrysho planin
                    </Button>
                  ) : (
                    <Stack spacing={1} sx={{ mt: 'auto' }}>
                      {paidOptions.map((opt) => {
                        const isPrimaryCta = opt.months === 12 || paidOptions.length === 1;
                        return (
                          <Button
                            key={opt.months}
                            fullWidth
                            size="medium"
                            variant={isPrimaryCta ? 'contained' : 'outlined'}
                            onClick={() => router.push(checkoutSubscriptionHref(plan.id, opt.months))}
                            sx={{
                              ...accentPillButtonSx(accent, isPrimaryCta ? 'contained' : 'outlined'),
                              whiteSpace: 'normal',
                              lineHeight: 1.25,
                            }}
                          >
                            {`Ndrysho planin · ${opt.labelSq} · ${formatEur(opt.price)}`}
                          </Button>
                        );
                      })}
                    </Stack>
                  )}
                </PlanCard>
              </Grid>
            );
          })}
        </Grid>
      ) : null}

      {!loading && plans.length > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          Abonimi aktivizohet pas pagesës së suksesshme. Kuotat zbatohen menjëherë në llogarinë tuaj.
        </Typography>
      ) : null}
    </Stack>
  );
}
