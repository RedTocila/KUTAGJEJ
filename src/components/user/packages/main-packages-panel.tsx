'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';

import { useUser } from '@/hooks/use-user';
import { listPublicContracts } from '@/lib/public-contracts-client';
import { listMySubscriptions } from '@/lib/payments-client';
import type { PublicContract } from '@/types/contract';
import { paths } from '@/paths';
import {
  PackageCheckoutCard,
  formatEur,
  planAccentForCode,
} from './package-ui';
import type { PlanAccent } from './package-ui';

function planSubtitle(plan: PublicContract, durationLabel?: string): string {
  const bits = [`${plan.maxListAllCategories} njoftime`];
  if (plan.maxPremiumListings > 0) bits.push(`${plan.maxPremiumListings} Premium`);
  if (plan.maxOkazionListings > 0) bits.push(`${plan.maxOkazionListings} OKAZION`);
  if ((plan.boostCredits ?? 0) > 0) bits.push(`${plan.boostCredits} BC`);
  const base = bits.join(' · ');
  return durationLabel ? `${durationLabel} · ${base}` : base;
}

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

function priceSuffixForMonths(months: number): string {
  if (months === 1) return '/ muaj';
  if (months === 12) return '/ vit';
  return `/ ${months} muaj`;
}

/** Yellow pill when yearly (or longer) beats paying monthly. */
function savingsBadge(monthlyPrice: number | null, months: number, price: number): string | null {
  if (months <= 1 || monthlyPrice == null || monthlyPrice <= 0) return null;
  const full = monthlyPrice * months;
  if (price >= full) return null;
  const pct = Math.round((1 - price / full) * 100);
  return pct >= 5 ? `Kurseni ${pct}%` : null;
}

function offerBadge(opts: {
  isCurrent: boolean;
  planCode: string;
  months: number;
  monthlyPrice: number | null;
  price: number;
}): string | null {
  if (opts.isCurrent) return 'Plani juaj';
  const save = savingsBadge(opts.monthlyPrice, opts.months, opts.price);
  if (save) return save;
  if (opts.planCode === 'grow' && opts.months === 12) return 'Popullore';
  if (opts.planCode === 'elite' && opts.months === 12) return 'Elite';
  return null;
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
  const [activeMonths, setActiveMonths] = React.useState<number | null>(null);

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
    setActiveMonths(active?.months ?? null);
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
        <Stack spacing={1.25}>
          {plans.flatMap((plan) => {
            const paidOptions = plan.priceOptions.filter((o) => o.price > 0);
            const isFree = plan.planCode === 'free' || plan.priceOptions.every((o) => o.price === 0);
            const planCode = (plan.planCode || '').toLowerCase();
            const hasPaidPlan = Boolean(activeContractId || activePlanCode);
            const isPlanCurrent =
              (activeContractId != null && activeContractId === plan.id) ||
              (activePlanCode != null && planCode === activePlanCode) ||
              (!hasPaidPlan && isFree);
            const accent = planAccent(plan);
            const monthlyPrice = plan.price1Month ?? paidOptions.find((o) => o.months === 1)?.price ?? null;
            const details = planFeatureLines(plan);

            if (isFree) {
              return [
                <PackageCheckoutCard
                  key={plan.id}
                  title={plan.title}
                  subtitle={planSubtitle(plan, 'Filloni falas')}
                  badge={isPlanCurrent ? 'Plani juaj' : null}
                  price="€0"
                  priceSuffix="/ muaj"
                  accent={accent}
                  selected={isPlanCurrent}
                  details={details}
                />,
              ];
            }

            const matchedMonths =
              activeMonths != null && paidOptions.some((o) => o.months === activeMonths)
                ? activeMonths
                : Math.max(...paidOptions.map((o) => o.months));

            return paidOptions.map((opt) => {
              const isCurrent = isPlanCurrent && opt.months === matchedMonths;
              const badge = offerBadge({
                isCurrent,
                planCode,
                months: opt.months,
                monthlyPrice,
                price: opt.price,
              });

              return (
                <PackageCheckoutCard
                  key={`${plan.id}-${opt.months}`}
                  title={plan.title}
                  subtitle={planSubtitle(plan, opt.labelSq)}
                  badge={badge}
                  price={formatEur(opt.price)}
                  priceSuffix={priceSuffixForMonths(opt.months)}
                  accent={accent}
                  selected={isCurrent}
                  details={details}
                  onClick={
                    isCurrent
                      ? undefined
                      : () => router.push(checkoutSubscriptionHref(plan.id, opt.months))
                  }
                />
              );
            });
          })}
        </Stack>
      ) : null}

      {!loading && plans.length > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          Abonimi aktivizohet pas pagesës së suksesshme. Kuotat zbatohen menjëherë në llogarinë tuaj.
        </Typography>
      ) : null}
    </Stack>
  );
}
